// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hasTransparentEdges, useCutoutImage } from "@/components/games/token-cutout";

const SIZE = 8;

function buildImage(isTransparent: (x: number, y: number) => boolean): number[] {
  return Array.from({ length: SIZE * SIZE }, (_, index) => [120, 80, 60, isTransparent(index % SIZE, Math.floor(index / SIZE)) ? 0 : 255]).flat();
}

const isOnEdge = (x: number, y: number) => x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1;

describe("hasTransparentEdges: токен без кружечка", () => {
  it("вирізана істота: прозорі краї, непрозорий центр", () => {
    expect(hasTransparentEdges(buildImage(isOnEdge), SIZE)).toBe(true);
  });

  it("звичайний арт без прозорості лишається в кружечку", () => {
    expect(hasTransparentEdges(buildImage(() => false), SIZE)).toBe(false);
  });

  it("прозорий лише куток або одна сторона — це не вирізана істота", () => {
    expect(hasTransparentEdges(buildImage((x, y) => isOnEdge(x, y) && y === 0), SIZE)).toBe(false);
  });

  it("лапа чи хвіст, що торкаються краю, вирізану істоту не псують", () => {
    expect(hasTransparentEdges(buildImage((x, y) => isOnEdge(x, y) && !(y === SIZE - 1 && x < 3)), SIZE)).toBe(true);
  });
});

describe("useCutoutImage", () => {
  afterEach(() => vi.restoreAllMocks());

  function stubCanvas(getImageData: () => { data: Uint8ClampedArray }) {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn(), getImageData } as unknown as CanvasRenderingContext2D);
  }
  const transparent = () => ({ data: new Uint8ClampedArray(32 * 32 * 4) });
  const image = new Image();

  it("кілька однакових істот: вирізаними стають усі, а не лише перша", () => {
    stubCanvas(transparent);
    const first = renderHook(() => useCutoutImage("/same-creature.webp"));
    const second = renderHook(() => useCutoutImage("/same-creature.webp"));
    act(() => first.result.current.inspectImage(image));
    expect(first.result.current.isCutout).toBe(true);
    act(() => second.result.current.inspectImage(image));
    expect(second.result.current.isCutout).toBe(true);
  });

  it("картинку не можна прочитати (інший домен) — лишається кружечок", () => {
    stubCanvas(() => {
      throw new DOMException("tainted", "SecurityError");
    });
    const token = renderHook(() => useCutoutImage("/foreign.webp"));
    act(() => token.result.current.inspectImage(image));
    expect(token.result.current.isCutout).toBe(false);
  });
});
