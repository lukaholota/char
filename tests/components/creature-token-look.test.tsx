// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MapCreatureView } from "@/rules/game-map-creatures";

vi.mock("@/lib/actions/game-sessions", () => ({}));
vi.mock("@/lib/actions/game-token-images", () => ({}));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: () => ({ refresh: vi.fn() }), useNoAiMode: () => ({ enabled: false }) }));

const { CreatureTokenFace } = await import("@/components/games/MapCreatureTokens");

const ON_BOARD = { labelWidth: 40, isHighlighted: false };
let imageIndex = 0;

function buildCreature(overrides: Partial<MapCreatureView>): MapCreatureView {
  imageIndex += 1;
  return { id: 1, creatureKey: "goblin", ruleset: "RULES_2014", label: "Гоблін", statblockName: null, customName: null, badge: null, isAlly: false, imageUrl: `/images/creatures/2014/look-${imageIndex}.webp`, isRoundImage: false, tokenSize: "medium", isCutout: true, token: { x: 0.5, y: 0.5 }, tokenTransform: { rotation: 0, scale: 100 }, hitPoints: null, isDown: false, conditions: { conditions: [], exhaustionLevel: 0 }, ...overrides };
}

function stubCanvasAlpha(alpha: number) {
  const data = new Uint8ClampedArray(32 * 32 * 4).map((_, index) => (index % 4 === 3 ? alpha : 0));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn(), getImageData: () => ({ data }) } as unknown as CanvasRenderingContext2D);
}

async function renderLoadedDisc(creature: MapCreatureView, onBoard?: typeof ON_BOARD) {
  const { container } = render(<CreatureTokenFace creature={creature} size={40} nameMode={null} onBoard={onBoard} />);
  const image = container.querySelector("img") as HTMLImageElement;
  await act(async () => {
    fireEvent.load(image);
    await new Promise((resolve) => setTimeout(resolve));
  });
  return image.parentElement as HTMLElement;
}

describe("вигляд токена істоти: на вибір майстра", () => {
  beforeEach(() => stubCanvasAlpha(0));
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("обрано «Прозорий» і краї прозорі: без диска", async () => {
    expect((await renderLoadedDisc(buildCreature({}), ON_BOARD)).className).not.toContain("overflow-hidden");
  });

  it("обрано «Токен»: кружечок навіть для прозорої картинки", async () => {
    expect((await renderLoadedDisc(buildCreature({ isCutout: false }), ON_BOARD)).className).toContain("overflow-hidden");
  });

  it("обрано «Прозорий», але картинка непрозора: кружечок", async () => {
    stubCanvasAlpha(255);
    expect((await renderLoadedDisc(buildCreature({}), ON_BOARD)).className).toContain("overflow-hidden");
  });

  it("у списку бою й для намальованої рамки кружечок лишається", async () => {
    expect((await renderLoadedDisc(buildCreature({}))).className).toContain("overflow-hidden");
    expect((await renderLoadedDisc(buildCreature({ isRoundImage: true }), ON_BOARD)).className).toContain("overflow-hidden");
  });
});
