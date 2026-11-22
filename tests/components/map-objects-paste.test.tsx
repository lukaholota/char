// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ add: vi.fn(), change: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/actions/game-scene-tools", () => ({ addSceneObjectAction: mocks.add, changeSceneObjectAction: mocks.change, moveSceneObjectsAction: vi.fn(), removeSceneObjectsAction: mocks.remove }));
vi.mock("@/lib/monitoring/game-analytics", () => ({ captureGameEvent: vi.fn() }));

const { useMapObjects } = await import("@/components/games/use-map-objects");

const placement = { at: { x: 0.5, y: 0.5 }, widthCells: 2, rotation: 0, name: null, isHidden: false, sortOrder: 0, floor: null, aspect: 1 };

function renderPasting() {
  let answer: (value: unknown) => void = () => {};
  mocks.add.mockReturnValue(new Promise((resolve) => { answer = resolve; }));
  const options = { view: { id: 7, viewedSceneId: 3, objects: [] }, shownFloor: null, editing: "all", gridColumns: null, findDropPosition: () => null, findViewCentre: () => ({ x: 0.5, y: 0.5 }), group: { isGrouped: () => false, moveWith: () => false, clear: () => {} } } as unknown as Parameters<typeof useMapObjects>[0];
  const hook = renderHook(() => useMapObjects(options));
  return { ...hook, answer: (id: number) => act(async () => answer({ ok: true, value: { id } })) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.change.mockResolvedValue({ ok: true, value: null });
  mocks.remove.mockResolvedValue({ ok: true, value: null });
});

describe("вставка обʼєкта", () => {
  it("рамка стоїть на копії одразу, а після відповіді сервера — на тій самій копії зі справжнім id", async () => {
    const { result, rerender, answer } = renderPasting();

    act(() => result.current.pasteCopy("token-images/1/rock", placement));
    expect(result.current.chosen).toMatchObject({ imageKey: "token-images/1/rock", at: placement.at });
    expect(result.current.chosen!.id).toBeLessThan(0);

    await answer(41);
    rerender();
    expect(result.current.chosen?.id).toBe(41);
  });

  it("копію можна рухати до відповіді сервера: видно одразу, а зберігається остання зміна зі справжнім id", async () => {
    const { result, answer } = renderPasting();
    act(() => result.current.pasteCopy("token-images/1/rock", placement));
    const tempId = result.current.chosen!.id;
    expect(result.current.bindObject(tempId)).not.toEqual({});

    act(() => result.current.change(tempId, { ...placement, at: { x: 0.2, y: 0.2 } }));
    act(() => result.current.change(tempId, { ...placement, at: { x: 0.3, y: 0.3 }, rotation: 45 }));
    expect(result.current.shown[0]).toMatchObject({ at: { x: 0.3, y: 0.3 }, rotation: 45 });
    expect(mocks.change).not.toHaveBeenCalled();

    await answer(42);
    expect(mocks.change).toHaveBeenCalledTimes(1);
    expect(mocks.change).toHaveBeenCalledWith(7, 3, 42, expect.objectContaining({ at: { x: 0.3, y: 0.3 }, rotation: 45 }));
  });

  it("копія, видалена до відповіді, зникає одразу й видаляється на сервері", async () => {
    const { result, answer } = renderPasting();
    act(() => result.current.pasteCopy("token-images/1/rock", placement));
    const tempId = result.current.chosen!.id;
    act(() => result.current.remove());
    expect(result.current.shown.find((object) => object.id === tempId)).toBeUndefined();

    await answer(43);
    expect(mocks.remove).toHaveBeenCalledWith(7, 3, [43]);
  });
});
