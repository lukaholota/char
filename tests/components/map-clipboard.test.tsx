// @vitest-environment jsdom
import { cleanup, fireEvent, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ duplicate: vi.fn(), remove: vi.fn(), refresh: vi.fn(), toastError: vi.fn(), pushUndo: vi.fn() }));

vi.mock("@/lib/actions/game-sessions", () => ({ duplicateMapCreatureAction: mocks.duplicate, removeMapCreaturesAction: mocks.remove }));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/actions/game-scene-tools", () => ({}));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));
vi.mock("@/components/games/map-history", () => ({ pushUndoStep: mocks.pushUndo }));

const { findClipboardAction, useMapClipboard } = await import("@/components/games/map-clipboard");

const object = { id: 4, imageKey: "token-images/1/rock", imageUrl: "", at: { x: 0.5, y: 0.2 }, widthCells: 2, rotation: 0, name: null, isHidden: false, sortOrder: 0, floor: null, aspect: 1 };
const view = { id: 7, viewedSceneId: 3 };

function renderClipboard(chosen: { object?: typeof object; creatureId?: number; groupKeys?: string[]; shown?: Array<typeof object> }, canEdit = true) {
  const board = document.createElement("div");
  document.body.append(board);
  const objects = { chosen: chosen.object ?? null, shown: chosen.shown ?? [], pasteCopy: vi.fn(), pasteMany: vi.fn() };
  const group = { findMembers: () => (chosen.groupKeys ?? []).map((key) => ({ key, position: { x: 0, y: 0 } })) };
  const lights = { chosen: null, place: vi.fn() };
  const token = chosen.creatureId ? { lightTarget: { kind: "creature", creature: { id: chosen.creatureId } } } : null;
  const options = { view, canEdit, scope: { current: board }, objects, lights, token, group } as unknown as Parameters<typeof useMapClipboard>[0];
  const { result } = renderHook(() => useMapClipboard(options));
  return { objects, duplicateChosen: () => result.current.duplicateChosen() };
}
const press = (code: string) => fireEvent.keyDown(window, { code, ctrlKey: true });

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("буфер мапи", () => {
  it("Ctrl/⌘+C і V за фізичною клавішею, без Alt і Shift", () => {
    const base = { ctrlKey: false, metaKey: false, altKey: false, shiftKey: false };
    expect(findClipboardAction({ ...base, code: "KeyC", ctrlKey: true })).toBe("copy");
    expect(findClipboardAction({ ...base, code: "KeyV", metaKey: true })).toBe("paste");
    expect(findClipboardAction({ ...base, code: "KeyV", ctrlKey: true, shiftKey: true })).toBe("paste-scattered");
    expect(findClipboardAction({ ...base, code: "KeyV", metaKey: true, shiftKey: true })).toBe("paste-scattered");
    expect(findClipboardAction({ ...base, code: "KeyC", ctrlKey: true, shiftKey: true })).toBeNull();
    expect(findClipboardAction({ ...base, code: "KeyV", ctrlKey: true, altKey: true })).toBeNull();
    expect(findClipboardAction({ ...base, code: "KeyC" })).toBeNull();
  });

  it("копія обʼєкта — того ж розміру й повороту, кожна наступна лягає далі за попередню", () => {
    const { objects } = renderClipboard({ object: { ...object, rotation: 40 } });
    press("KeyC");
    press("KeyV");
    press("KeyV");
    const [first, second] = objects.pasteCopy.mock.calls.map(([imageKey, placement]) => ({ imageKey, ...placement }));
    expect(first).toMatchObject({ imageKey: object.imageKey, at: { x: 0.53, y: 0.23 }, widthCells: 2, rotation: 40 });
    expect(second).toMatchObject({ at: { x: 0.56, y: 0.26 }, widthCells: 2, rotation: 40 });
  });

  it("Shift+V кидає копію з іншим розміром у межах і будь-яким поворотом", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.999);
    const { objects } = renderClipboard({ object });
    press("KeyC");
    fireEvent.keyDown(window, { code: "KeyV", ctrlKey: true, shiftKey: true });
    random.mockRestore();
    expect(objects.pasteCopy).toHaveBeenCalledWith(object.imageKey, expect.objectContaining({ at: { x: 0.53, y: 0.23 }, widthCells: 2.5, rotation: 359 }));
  });

  it("гравець і поле введення не копіюють", () => {
    const { objects } = renderClipboard({ object }, false);
    press("KeyC");
    press("KeyV");
    expect(objects.pasteCopy).not.toHaveBeenCalled();

    cleanup();
    const editor = renderClipboard({ object });
    const input = document.createElement("textarea");
    document.body.append(input);
    fireEvent.keyDown(input, { code: "KeyV", ctrlKey: true });
    expect(editor.objects.pasteCopy).not.toHaveBeenCalled();
  });

  it("істоту копіює сервер; крок назад прибирає саме цю копію", async () => {
    mocks.duplicate.mockResolvedValue({ ok: true, value: { id: 91 } });
    mocks.remove.mockResolvedValue({ ok: true, value: null });
    renderClipboard({ creatureId: 12 });
    press("KeyC");
    press("KeyV");
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    expect(mocks.duplicate).toHaveBeenCalledWith(7, 12, 1);

    await waitFor(() => expect(mocks.pushUndo).toHaveBeenCalledWith(3, expect.anything()));
    await mocks.pushUndo.mock.calls[0][1].undo();
    expect(mocks.remove).toHaveBeenCalledWith(7, 91);
  });

  it("група копіюється цілою: обʼєкти без розкиду, зі збереженим розкладом, істоти — сервером, герої — ні", async () => {
    mocks.duplicate.mockResolvedValue({ ok: true, value: { id: 91 } });
    const tree = { ...object, id: 5, at: { x: 0.1, y: 0.4 }, rotation: 30 };
    const { objects } = renderClipboard({ groupKeys: ["object-4", "object-5", "creature-12", "hero-2"], shown: [object, tree] });
    press("KeyC");
    press("KeyV");

    expect(objects.pasteCopy).not.toHaveBeenCalled();
    expect(objects.pasteMany).toHaveBeenCalledWith([
      { imageKey: object.imageKey, placement: expect.objectContaining({ at: { x: 0.53, y: 0.23 }, widthCells: 2, rotation: 0 }) },
      { imageKey: tree.imageKey, placement: expect.objectContaining({ at: { x: 0.13, y: 0.43 }, widthCells: 2, rotation: 30 }) },
    ]);
    await waitFor(() => expect(mocks.duplicate).toHaveBeenCalledWith(7, 12, 1));
    expect(mocks.duplicate).toHaveBeenCalledTimes(1);
  });

  it("кнопка «Копіювати» в панелі групи одразу ставить копію", () => {
    const { objects, duplicateChosen } = renderClipboard({ groupKeys: ["object-4", "object-5"], shown: [object, { ...object, id: 5 }] });
    duplicateChosen();
    expect(objects.pasteMany).toHaveBeenCalledTimes(1);
  });
});
