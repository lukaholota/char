// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { TokenPosition } from "@/rules/game-map";
import { SPOTLIGHT_MARK as SPOTLIGHT } from "@/rules/token-conditions";
import type { MapCreatureView } from "@/rules/game-map-creatures";
import type { SceneObjectView } from "@/rules/game-objects";
import type { GameSessionMemberView, GameSessionView } from "@/server/db/game-sessions";
import { setMapCreatureBorderColorAction } from "@/lib/actions/game-creature-border-color";

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), info: vi.fn() }) }));
import { toast } from "sonner";

const asWall = (points: TokenPosition[]) => ({ id: 900, kind: "wall" as const, isOpen: false, lock: "none" as const, isCurtained: false, points });
const openMenu = (trigger: HTMLElement) => {
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "touch" });
  fireEvent.click(trigger, { detail: 1 });
};

vi.hoisted(() => {
  const items = new Map<string, string>();
  const storage = { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key) };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true, writable: true });
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
});
const mocks = vi.hoisted(() => ({ replace: vi.fn(), moveGameTokenAction: vi.fn(), moveMapCreatureAction: vi.fn(), removeMapCreaturesAction: vi.fn(), setMapCreatureSizeAction: vi.fn(), setCreatureNameModeAction: vi.fn(), changeMapCreatureHitPointsAction: vi.fn(), changeMapCreatureConditionsAction: vi.fn(), changeHeroConditionsAction: vi.fn(), transformHeroTokenAction: vi.fn(), transformMapCreatureAction: vi.fn(), refresh: vi.fn(), changeSceneFogAction: vi.fn(), changeSceneGridAction: vi.fn(), saveSceneAreaAction: vi.fn(), removeSceneAreasAction: vi.fn(), saveSceneDrawingsAction: vi.fn(), removeSceneDrawingsAction: vi.fn(), moveSceneDrawingAction: vi.fn(), listAreaSpellsAction: vi.fn(), addSceneObjectAction: vi.fn(), changeSceneObjectAction: vi.fn(), removeSceneObjectsAction: vi.fn(), editSceneWallsAction: vi.fn(), changeSceneOpeningAction: vi.fn(), setSceneLightingAction: vi.fn(), saveSceneLightAction: vi.fn(), removeSceneLightsAction: vi.fn(), setHeroTokenLightAction: vi.fn(), setMapCreatureLightAction: vi.fn(), setHeroDarkvisionAction: vi.fn(), setDarkvisionLookAction: vi.fn(), moveMapTokensAction: vi.fn(), setSceneAmbienceAction: vi.fn() }));
vi.mock("@/lib/actions/game-token-images", () => ({ listTokenImagesAction: async () => ({ ok: true, value: ["token-images/1/chest"] }) }));
vi.mock("@/lib/actions/game-image-library", () => ({ listImageLibraryAction: async () => ({ ok: true, value: { folders: [], images: [{ imageKey: "token-images/1/chest", folderId: null }] } }), createImageFolderAction: vi.fn(), moveLibraryImageAction: vi.fn(), uploadImageToLibraryAction: vi.fn() }));
vi.mock("@/lib/actions/game-creature-border-color", () => ({ setMapCreatureBorderColorAction: vi.fn(async () => ({ ok: true, value: null })) }));
vi.mock("@/lib/actions/game-user-sounds", () => ({ listOwnSoundsAction: async () => ({ ok: true, value: [{ key: "own:0b6f3c1e-8a2d-4c4e-9f00-1234567890ab", name: "Сміх корчмаря" }] }), uploadOwnSoundAction: vi.fn(), deleteOwnSoundAction: vi.fn() }));
vi.mock("@/lib/actions/game-sessions", () => ({
  moveGameTokenAction: mocks.moveGameTokenAction,
  moveMapCreatureAction: mocks.moveMapCreatureAction,
  moveMapTokensAction: mocks.moveMapTokensAction,
  removeMapCreaturesAction: mocks.removeMapCreaturesAction,
  setMapCreatureSizeAction: mocks.setMapCreatureSizeAction,
  setCreatureNameModeAction: mocks.setCreatureNameModeAction,
  changeMapCreatureHitPointsAction: mocks.changeMapCreatureHitPointsAction,
  changeMapCreatureConditionsAction: mocks.changeMapCreatureConditionsAction,
  changeHeroConditionsAction: mocks.changeHeroConditionsAction,
  transformHeroTokenAction: mocks.transformHeroTokenAction,
  transformMapCreatureAction: mocks.transformMapCreatureAction,
  addMapCreaturesAction: vi.fn(),
  listObjectLibraryAction: async () => ({ ok: true, value: [{ slug: "barrel", category: "storage", widthCells: 1 }, { slug: "table-long", category: "tables", widthCells: 3 }] }),
}));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useNoAiHref: () => (href: string) => href, useModeRouter: () => ({ refresh: mocks.refresh, replace: mocks.replace }), useNoAiMode: () => ({ enabled: false }) }));
vi.mock("@/hooks/useCreatureStatblock", () => ({ useCreatureStatblock: () => ({ creature: null, loreGroup: null }) }));
vi.mock("@/lib/monitoring/game-analytics", () => ({ captureGameEvent: vi.fn() }));
vi.mock("@/lib/actions/game-scene-tools", () => ({
  changeSceneFogAction: mocks.changeSceneFogAction,
  changeSceneGridAction: mocks.changeSceneGridAction,
  saveSceneAreaAction: mocks.saveSceneAreaAction,
  removeSceneAreasAction: mocks.removeSceneAreasAction,
  saveSceneDrawingsAction: mocks.saveSceneDrawingsAction,
  removeSceneDrawingsAction: mocks.removeSceneDrawingsAction,
  moveSceneDrawingAction: mocks.moveSceneDrawingAction,
  addSceneObjectAction: mocks.addSceneObjectAction,
  changeSceneObjectAction: mocks.changeSceneObjectAction,
  removeSceneObjectsAction: mocks.removeSceneObjectsAction,
  editSceneWallsAction: mocks.editSceneWallsAction,
  changeSceneOpeningAction: mocks.changeSceneOpeningAction,
  setSceneLightingAction: mocks.setSceneLightingAction,
  saveSceneLightAction: mocks.saveSceneLightAction,
  removeSceneLightsAction: mocks.removeSceneLightsAction,
  setHeroTokenLightAction: mocks.setHeroTokenLightAction,
  setMapCreatureLightAction: mocks.setMapCreatureLightAction,
  setHeroDarkvisionAction: mocks.setHeroDarkvisionAction,
  setDarkvisionLookAction: mocks.setDarkvisionLookAction,
}));
vi.mock("@/lib/actions/game-scene-atmosphere", () => ({ setSceneAtmosphereAction: vi.fn(), setSceneAmbienceAction: mocks.setSceneAmbienceAction, changeSceneFloorsAction: vi.fn(), addFloorPlanAction: vi.fn() }));
vi.mock("@/lib/actions/game-area-spells", () => ({ listAreaSpellsAction: mocks.listAreaSpellsAction }));

import { CombatTurnProvider } from "@/components/games/combat-turn";
import { HeroTokenSlotContext, MapHintSlotContext, resetRoomTabs, showRoomTab, ToolPanelSlotContext, useRoomTabStore } from "@/components/games/room-tabs";
import { ConfirmDialogHost } from "@/components/ui/confirm-dialog";
import { GameRoomMap } from "@/components/games/GameRoomMap";
import { useAreaCastStore } from "@/lib/components/game/area-cast";
import { resetOptimisticValues } from "@/components/games/optimistic-values";
import { resetMapHistory } from "@/components/games/map-history";
import { resetLiveSession, showMapPing, useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import { DEFAULT_ATMOSPHERE } from "@/rules/game-atmosphere";
import { DEFAULT_LIGHT_LOOK } from "@/rules/game-lighting";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.moveGameTokenAction.mockResolvedValue({ ok: true, value: null });
  mocks.moveMapCreatureAction.mockResolvedValue({ ok: true, value: null });
  mocks.moveMapTokensAction.mockResolvedValue({ ok: true, value: null });
  mocks.removeMapCreaturesAction.mockResolvedValue({ ok: true, value: null });
  mocks.setMapCreatureSizeAction.mockResolvedValue({ ok: true, value: null });
  mocks.setCreatureNameModeAction.mockResolvedValue({ ok: true, value: null });
  mocks.changeMapCreatureHitPointsAction.mockResolvedValue({ ok: true, value: null });
  mocks.changeMapCreatureConditionsAction.mockResolvedValue({ ok: true, value: null });
  mocks.changeHeroConditionsAction.mockResolvedValue({ ok: true, value: null });
  mocks.transformHeroTokenAction.mockResolvedValue({ ok: true, value: null });
  mocks.transformMapCreatureAction.mockResolvedValue({ ok: true, value: null });
  mocks.changeSceneFogAction.mockResolvedValue({ ok: true, value: null });
  mocks.changeSceneGridAction.mockResolvedValue({ ok: true, value: null });
  mocks.saveSceneAreaAction.mockResolvedValue({ ok: true, value: { id: 40 } });
  mocks.removeSceneAreasAction.mockResolvedValue({ ok: true, value: null });
  mocks.saveSceneDrawingsAction.mockResolvedValue({ ok: true, value: { ids: [501] } });
  mocks.removeSceneDrawingsAction.mockResolvedValue({ ok: true, value: null });
  mocks.moveSceneDrawingAction.mockResolvedValue({ ok: true, value: null });
  mocks.addSceneObjectAction.mockResolvedValue({ ok: true, value: { id: 301 } });
  mocks.changeSceneObjectAction.mockResolvedValue({ ok: true, value: null });
  mocks.removeSceneObjectsAction.mockResolvedValue({ ok: true, value: null });
  mocks.editSceneWallsAction.mockResolvedValue({ ok: true, value: { ids: [601] } });
  mocks.changeSceneOpeningAction.mockResolvedValue({ ok: true, value: null });
  mocks.setSceneLightingAction.mockResolvedValue({ ok: true, value: null });
  mocks.saveSceneLightAction.mockResolvedValue({ ok: true, value: { id: 701 } });
  mocks.setDarkvisionLookAction.mockResolvedValue({ ok: true, value: null });
  mocks.listAreaSpellsAction.mockResolvedValue({ ok: true, value: { ruleset: "RULES_2014", spells: [{ name: "Вогняна куля", shape: "circle", sizeFeet: 20, isKnown: true }, { name: "Пекучі долоні", shape: "cone", sizeFeet: 15, isKnown: false }] } });
});
afterEach(() => {
  cleanup();
  resetOptimisticValues();
  resetMapHistory();
});

const member = (userId: number, role: "GM" | "PLAYER", persName: string | null, token: GameSessionMemberView["token"] = null): GameSessionMemberView => ({
  heroId: userId, heroSlot: 0, isCutout: false,
  userId, name: `Гравець ${userId}`, role, persId: persName ? userId * 10 : null, persName, avatarUrl: null, isOnline: true, token, tokenTransform: { rotation: 0, scale: 100 }, conditions: { conditions: [], exhaustionLevel: 0 }, lifeState: { kind: "up" }, light: { brightFeet: 0, dimFeet: 0 }, darkvisionFeet: 0,
});

function buildView(overrides: Partial<GameSessionView> = {}): GameSessionView {
  return {
    id: 7, name: "Печера", isArchived: false, myUserId: 2, myRole: "PLAYER", myPersId: 20, myPersIds: [20], inviteToken: null, mapImageUrl: "https://media.test/games/7/map/a.webp",
    members: [member(1, "GM", null), member(2, "PLAYER", "Арвен"), member(3, "PLAYER", "Торин", { x: 0.5, y: 0.5 })],
    creatures: [],
    creatureNameMode: "short",
    combat: null,
    grid: null,
    fog: null,
    areas: [],
    drawings: [],
    objects: [],
    walls: [],
    lighting: "off", darkvisionLook: "grey", houseRules: { attunementLimit: null, magicSystem: null, damageTypes: [] }, lights: [], atmosphere: DEFAULT_ATMOSPHERE, ambience: [], floors: [], shownFloor: null,
    viewedSceneId: 1,
    activeSceneId: null,
    scenes: [],
    ...overrides,
  };
}

const goblin = (id: number, badge: number, token: MapCreatureView["token"] = null): MapCreatureView => ({
  id, creatureKey: "goblin", ruleset: "RULES_2014", label: `Гоблін ${badge}`, statblockName: null, customName: null, badge, borderColor: null, imageUrl: null, isRoundImage: false, tokenSize: "medium", token, tokenTransform: { rotation: 0, scale: 100 }, hitPoints: null, isDown: false, conditions: { conditions: [], exhaustionLevel: 0 }, light: { brightFeet: 0, dimFeet: 0 },
});
const gmView = (overrides: Partial<GameSessionView> = {}) => buildView({ myUserId: 1, myRole: "GM", myPersId: null, myPersIds: [], ...overrides });

function drag(token: HTMLElement, from: { clientX: number; clientY: number }, to: { clientX: number; clientY: number }) {
  fireEvent.pointerDown(token, { button: 0, ...from, pointerId: 1 });
  fireEvent.pointerMove(token, { ...to, pointerId: 1 });
  fireEvent.pointerUp(token, { ...to, pointerId: 1 });
}

function tap(token: HTMLElement) {
  fireEvent.pointerDown(token, { button: 0, clientX: 200, clientY: 100, pointerId: 1 });
  fireEvent.pointerUp(token, { clientX: 200, clientY: 100, pointerId: 1 });
}

/// Свій токен на мапі перший дотик лише вибирає, картку відкриває другий.
function tapTwice(token: HTMLElement) {
  tap(token);
  tap(token);
}

const onMap = (px: number) => `${px}px`;

/// Коли на сцені вже є герой і нових істот немає, плашка «Поза мапою» згорнута, щоб не закривати мапу.
const openTray = () => fireEvent.click(screen.getByRole("button", { name: /^Поза мапою/ }));

function placeMap() {
  const map = screen.getByRole("img", { name: "Мапа сцени" }).parentElement!;
  map.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 200, right: 400, bottom: 200, x: 0, y: 0, toJSON: () => null });
  map.parentElement!.getBoundingClientRect = map.getBoundingClientRect;
  return map;
}

function openViewTool() {
  fireEvent.click(screen.getByRole("button", { name: "Вигляд" }));
}

describe("мапа кімнати", () => {
  it("гравець тягне свій токен на мапу, а чужий токен не рухається", async () => {
    render(<GameRoomMap view={buildView()} />);
    const map = placeMap();
    expect(within(map).queryByRole("button")).toBeNull();

    const myToken = screen.getByRole("button", { name: /Токен «Арвен»/ });
    fireEvent.pointerDown(myToken, { button: 0, clientX: 10, clientY: 300, pointerId: 1 });
    fireEvent.pointerMove(myToken, { clientX: 100, clientY: 150, pointerId: 1 });
    fireEvent.pointerUp(myToken, { clientX: 100, clientY: 150, pointerId: 1 });

    expect(mocks.moveGameTokenAction).toHaveBeenCalledWith(7, 1, 2, { x: 0.25, y: 0.75 }, null);
    expect(within(map).getByRole("button", { name: /Токен «Арвен»/ })).toBeTruthy();
  });

  it("дотик без руху нічого не надсилає, а витягнутий за межі токен повертається в ряд", () => {
    render(<GameRoomMap view={buildView({ myUserId: 3, myPersId: 30, myPersIds: [30] })} />);
    const map = placeMap();
    const token = within(map).getByRole("button", { name: /Токен «Торин»/ });
    fireEvent.pointerDown(token, { button: 0, clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(token, { clientX: 201, clientY: 100, pointerId: 1 });
    expect(mocks.moveGameTokenAction).not.toHaveBeenCalled();

    fireEvent.pointerDown(token, { button: 0, clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(token, { clientX: 200, clientY: 260, pointerId: 1 });
    fireEvent.pointerUp(token, { clientX: 200, clientY: 260, pointerId: 1 });
    expect(mocks.moveGameTokenAction).toHaveBeenCalledWith(7, 1, 3, null, undefined);
    expect(within(map).queryByRole("button")).toBeNull();
  });

  it("під час перетягування підказує, що токен зійде з мапи, а на весь екран мапа відкривається з тими самими токенами", () => {
    render(<GameRoomMap view={buildView({ myUserId: 3, myPersId: 30, myPersIds: [30] })} />);
    const token = within(placeMap()).getByRole("button", { name: /Токен «Торин»/ });
    fireEvent.pointerDown(token, { button: 0, clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(token, { clientX: 200, clientY: 150, pointerId: 1 });
    expect(screen.queryByText("Прибрати з мапи")).toBeNull();
    fireEvent.pointerMove(token, { clientX: 200, clientY: 260, pointerId: 1 });
    expect(screen.getByText("Прибрати з мапи")).toBeTruthy();
    fireEvent.pointerCancel(token, { pointerId: 1 });

    fireEvent.click(screen.getByRole("button", { name: "Мапа на весь екран" }));
    const dialog = screen.getByRole("dialog", { name: "Печера" });
    expect(within(dialog).getByRole("img", { name: "Мапа сцени" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: /Токен «Торин»/ })).toBeTruthy();
  });

  it("якщо новий стан кімнати перемонтував токен посеред руху, відпускання поза ним усе одно кладе істоту, а копія не зависає", () => {
    const { rerender } = render(<GameRoomMap view={gmView({ creatures: [goblin(5, 1, { x: 0.25, y: 0.25 })] })} />);
    const token = within(placeMap()).getByRole("button", { name: /Токен «Гоблін 1»/ });
    fireEvent.pointerDown(token, { button: 0, clientX: 100, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(token, { clientX: 150, clientY: 80, pointerId: 1 });

    rerender(<GameRoomMap view={gmView({ creatures: [goblin(5, 1, null)] })} />);
    fireEvent.pointerMove(document.body, { clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(document.body, { clientX: 200, clientY: 100, pointerId: 1 });

    expect(mocks.moveMapCreatureAction).toHaveBeenCalledWith(7, 5, { x: 0.5, y: 0.5 }, null);
    expect(document.querySelector(".fixed.z-\\[10000\\]")).toBeNull();
  });

  it("стан кімнати, прочитаний до збереження ходу, не повертає істоту на старе місце, а пізніший стан — правда", async () => {
    const findLeft = () => within(placeMap()).getByRole("button", { name: /Токен «Гоблін 1»/ }).closest<HTMLElement>("[style*='left']")!.style.left;
    const showServerView = (token: MapCreatureView["token"]) => {
      const view = gmView({ creatures: [goblin(5, 1, token)] });
      act(() => useGameSessionLiveStore.setState({ view }));
      rerender(<GameRoomMap view={view} />);
    };
    const { rerender } = render(<GameRoomMap view={gmView({ creatures: [goblin(5, 1, { x: 0.25, y: 0.25 })] })} />);
    drag(within(placeMap()).getByRole("button", { name: /Токен «Гоблін 1»/ }), { clientX: 100, clientY: 50 }, { clientX: 200, clientY: 100 });
    await act(async () => undefined);

    showServerView({ x: 0.25, y: 0.25 });
    expect(findLeft()).toBe("50%");

    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now + 3001);
    showServerView({ x: 0.75, y: 0.5 });
    clock.mockRestore();
    expect(findLeft()).toBe("75%");
  });

  it("майстер рухає будь-який токен; без мапи гравець бачить порожній стан, а майстер підказку", () => {
    const { rerender } = render(<GameRoomMap view={buildView({ myUserId: 1, myRole: "GM", myPersId: null, myPersIds: [] })} />);
    expect(screen.getAllByRole("button", { name: /^Токен/ })).toHaveLength(1);
    openTray();
    expect(screen.getAllByRole("button", { name: /^Токен/ })).toHaveLength(2);

    rerender(<GameRoomMap view={buildView({ mapImageUrl: null, viewedSceneId: null })} />);
    expect(screen.queryAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual(["Підсвітити «Арвен»"]);
    expect(screen.getByText("Майстер ще не показав мапу")).toBeTruthy();
    rerender(<GameRoomMap view={buildView({ mapImageUrl: null, myUserId: 1, myRole: "GM", myPersId: null, myPersIds: [] })} />);
    expect(screen.getByText(/У цій сцені ще немає мапи/)).toBeTruthy();
    rerender(<GameRoomMap view={buildView({ mapImageUrl: null, viewedSceneId: null, myUserId: 1, myRole: "GM", myPersId: null, myPersIds: [] })} />);
    expect(screen.getByText(/Відкрийте або додайте сцену/)).toBeTruthy();
  });

  it("на компʼютері панель інструмента відкривається в бічній колонці, а показ вкладки героя її прибирає", () => {
    const slot = document.createElement("div");
    document.body.append(slot);
    render(
      <ToolPanelSlotContext.Provider value={slot}>
        <GameRoomMap view={gmView()} />
      </ToolPanelSlotContext.Provider>,
    );
    openViewTool();
    expect(within(slot).getByRole("region", { name: "Вигляд" })).toBeTruthy();
    expect(screen.getAllByRole("region", { name: "Вигляд" })).toHaveLength(1);

    act(() => showRoomTab("hero"));
    expect(slot.childElementCount).toBe(0);
    expect(screen.getByRole("button", { name: "Вигляд", pressed: false })).toBeTruthy();
    slot.remove();
  });

  it("майстер бачить, що відкрита сцена ще не показана гравцям", () => {
    render(<GameRoomMap view={buildView({ myUserId: 1, myRole: "GM", myPersId: null, myPersIds: [], viewedSceneId: 2, activeSceneId: 1 })} />);
    expect(screen.getByText("Лише для вас")).toBeTruthy();
  });

  it("на телефоні широку мапу можна повернути горизонтально, і токен падає туди, куди його тягнуть", () => {
    window.matchMedia = ((query: string) => ({ matches: query === "(orientation: portrait)" })) as unknown as typeof window.matchMedia;
    render(<GameRoomMap view={buildView({ myUserId: 3, myPersId: 30, myPersIds: [30] })} />);
    fireEvent.click(screen.getByRole("button", { name: "Мапа на весь екран" }));
    const dialog = screen.getByRole("dialog", { name: "Печера" });
    const image = within(dialog).getByRole("img", { name: "Мапа сцени" });
    Object.defineProperties(image, { complete: { value: true }, naturalWidth: { value: 800 }, naturalHeight: { value: 400 } });
    fireEvent.load(image);

    const turnButton = within(dialog).getByRole("button", { name: "Повернути мапу горизонтально" });
    fireEvent.click(turnButton);
    expect(turnButton.getAttribute("aria-pressed")).toBe("true");
    expect(dialog.className).toContain("portrait:rotate-90");

    image.parentElement!.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 400, right: 200, bottom: 400, x: 0, y: 0, toJSON: () => null });
    image.parentElement!.parentElement!.getBoundingClientRect = image.parentElement!.getBoundingClientRect;
    const token = within(image.parentElement!).getByRole("button", { name: /Токен «Торин»/ });
    fireEvent.pointerDown(token, { button: 0, clientX: 100, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(token, { clientX: 150, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(token, { clientX: 150, clientY: 100, pointerId: 1 });
    expect(mocks.moveGameTokenAction).toHaveBeenCalledWith(7, 1, 3, { x: 0.25, y: 0.25 }, null);

    fireEvent.click(within(dialog).getByRole("button", { name: "Згорнути мапу" }));
    fireEvent.click(screen.getByRole("button", { name: "Мапа на весь екран" }));
    expect(screen.getByRole("dialog", { name: "Печера" }).className).not.toContain("portrait:rotate-90");
  });

  it("поза боєм портрети героїв без майстра лежать на мапі; стрілка виносить їх у ряд над мапою, вимикач у «Вигляді» ховає — вибір памʼятається для кімнати", () => {
    const stored = new Map<string, string>();
    Object.defineProperty(window, "localStorage", { configurable: true, value: { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => void stored.set(key, value) } });
    const findParty = () => screen.getByRole("list", { name: "Герої" });
    const isInRowAboveMap = () => findParty().closest('[class*="row-start-1"]') !== null;
    const findHiddenWrap = () => findParty().closest(".hidden")?.className;
    const turnScreen = (orientation: "landscape" | "portrait") => (window.matchMedia = ((query: string) => ({ matches: query === `(orientation: ${orientation})` })) as unknown as typeof window.matchMedia);
    turnScreen("landscape");
    const { unmount } = render(<GameRoomMap view={gmView()} />);
    expect(within(findParty()).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["ААрвен", "ТТорин"]);
    expect(isInRowAboveMap()).toBe(false);
    expect(findHiddenWrap()).toBeUndefined();

    openViewTool();
    expect(findHiddenWrap()).not.toContain("[@container(min-width:40rem)]:block");
    fireEvent.click(screen.getByRole("button", { name: "Закрити інструмент" }));

    fireEvent.click(screen.getByRole("button", { name: "Винести портрети в ряд над мапою" }));
    expect(isInRowAboveMap()).toBe(true);
    expect(screen.getByRole("button", { name: "Покласти портрети на мапу" })).toBeTruthy();
    unmount();
    render(<GameRoomMap view={gmView()} />);
    expect(isInRowAboveMap()).toBe(true);

    openViewTool();
    expect(findHiddenWrap()).toContain("[@container(min-width:40rem)]:block");
    fireEvent.click(screen.getByRole("switch", { name: "Портрети героїв поза боєм" }));
    expect(screen.queryByRole("list", { name: "Герої" })).toBeNull();

    cleanup();
    render(<GameRoomMap view={gmView()} />);
    expect(screen.queryByRole("list", { name: "Герої" })).toBeNull();
    cleanup();
    render(<GameRoomMap view={gmView({ id: 8 })} />);
    expect(isInRowAboveMap()).toBe(false);

    cleanup();
    turnScreen("portrait");
    render(<GameRoomMap view={gmView({ id: 9 })} />);
    expect(isInRowAboveMap()).toBe(true);
  });

  it("портрет героя підсвічує той самий знак, що й токен: гравець — лише свого героя, майстер — будь-кого", () => {
    render(<GameRoomMap view={buildView({ id: 11 })} />);
    const party = screen.getByRole("list", { name: "Герої" });
    expect(within(party).queryByRole("button", { name: "Підсвітити «Торин»" })).toBeNull();
    fireEvent.click(within(party).getByRole("button", { name: "Підсвітити «Арвен»" }));
    expect(mocks.changeHeroConditionsAction).toHaveBeenCalledWith(11, 2, { kind: "toggle", condition: SPOTLIGHT, isActive: true });
    expect(within(party).getByRole("button", { name: "Підсвітити «Арвен»" }).getAttribute("aria-pressed")).toBe("true");

    cleanup();
    render(<GameRoomMap view={gmView({ id: 11 })} />);
    const map = placeMap();
    fireEvent.click(within(screen.getByRole("list", { name: "Герої" })).getByRole("button", { name: "Підсвітити «Торин»" }));
    expect(mocks.changeHeroConditionsAction).toHaveBeenCalledWith(11, 3, { kind: "toggle", condition: SPOTLIGHT, isActive: true });
    expect(within(map).getByText("Підсвічено")).toBeTruthy();
  });

  it("повзунок зменшує лише токени на мапі, ховає дрібні імена й памʼятає розмір для кімнати", () => {
    const stored = new Map<string, string>();
    Object.defineProperty(window, "localStorage", { configurable: true, value: { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => void stored.set(key, value) } });
    const { unmount } = render(<GameRoomMap view={gmView()} />);
    openTray();
    const map = placeMap();
    const readAvatarSize = (scope: HTMLElement, name: RegExp) => within(scope).getByRole("button", { name }).parentElement!.style.width;
    expect(readAvatarSize(map, /Токен «Торин»/)).toBe(onMap(44));

    openViewTool();
    fireEvent.change(screen.getByRole("slider", { name: "Розмір токенів" }), { target: { value: "0.6" } });
    expect(readAvatarSize(map, /Токен «Торин»/)).toBe(onMap(26));
    expect(within(map).queryByText("Торин")).toBeNull();
    expect(readAvatarSize(document.body, /Токен «Арвен»/)).toBe("44px");
    expect(within(screen.getByRole("button", { name: /Токен «Арвен»/ }).parentElement!.parentElement!).getByText("Арвен")).toBeTruthy();

    unmount();
    render(<GameRoomMap view={gmView()} />);
    expect(readAvatarSize(placeMap(), /Токен «Торин»/)).toBe(onMap(26));
    cleanup();
    render(<GameRoomMap view={gmView({ id: 8 })} />);
    expect(readAvatarSize(placeMap(), /Токен «Торин»/)).toBe(onMap(44));
  });

  it("майстер ставить істоту з ряду на мапу, відкриває статблок з панелі токена і прибирає її — з картки або витягнувши за мапу", async () => {
    render(<GameRoomMap view={gmView({ creatures: [goblin(51, 1), goblin(52, 2, { x: 0.5, y: 0.5 }), goblin(53, 3, { x: 0.25, y: 0.25 })] })} />);
    const map = placeMap();
    const tray = screen.getByRole("list", { name: "Істоти поза мапою" });
    drag(within(tray).getByRole("button", { name: /«Гоблін 1»/ }), { clientX: 10, clientY: 300 }, { clientX: 100, clientY: 150 });
    expect(mocks.moveMapCreatureAction).toHaveBeenCalledWith(7, 51, { x: 0.25, y: 0.75 }, null);

    const placed = within(map).getByRole("button", { name: /Токен «Гоблін 2»/ });
    fireEvent.pointerDown(placed, { button: 0, clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(placed, { clientX: 201, clientY: 100, pointerId: 1 });
    expect(screen.queryByRole("dialog", { name: "Гоблін 2" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Статблок і стани" }));
    const statblock = screen.getByRole("dialog", { name: "Гоблін 2" });
    expect(within(statblock).getByRole("radiogroup", { name: "Колір обводки" })).toBeTruthy();
    fireEvent.click(within(statblock).getByRole("button", { name: "Прибрати з мапи" }));
    expect(mocks.removeMapCreaturesAction).toHaveBeenCalledWith(7, 52);
    expect(within(map).queryByRole("button", { name: /«Гоблін 2»/ })).toBeNull();

    drag(within(map).getByRole("button", { name: /«Гоблін 3»/ }), { clientX: 100, clientY: 50 }, { clientX: 100, clientY: 260 });
    expect(mocks.removeMapCreaturesAction).toHaveBeenCalledWith(7, 53);
    expect(mocks.moveMapCreatureAction).toHaveBeenCalledTimes(1);
  });

  it("майстер обводить мишею героя й істот рамкою, тягне одну — уся група переїжджає одним запитом; дотик по мапі знімає вибір", () => {
    render(<GameRoomMap view={gmView({ creatures: [goblin(55, 1, { x: 0.25, y: 0.25 }), goblin(56, 2, { x: 0.5, y: 0.5 }), goblin(57, 3, { x: 0.9, y: 0.9 })] })} />);
    const map = placeMap();
    const viewport = map.parentElement!;
    fireEvent.pointerDown(viewport, { button: 0, clientX: 50, clientY: 25, pointerId: 2, pointerType: "mouse" });
    fireEvent.pointerMove(viewport, { clientX: 150, clientY: 70, pointerId: 2, pointerType: "mouse" });
    fireEvent.pointerMove(viewport, { clientX: 250, clientY: 125, pointerId: 2, pointerType: "mouse" });
    fireEvent.pointerUp(viewport, { clientX: 250, clientY: 125, pointerId: 2, pointerType: "mouse" });
    expect(screen.getByRole("region", { name: "Вибрано: 3" })).toBeTruthy();

    drag(within(map).getByRole("button", { name: /«Гоблін 1»/ }), { clientX: 100, clientY: 50 }, { clientX: 140, clientY: 70 });
    expect(mocks.moveMapTokensAction).toHaveBeenCalledWith(7, 1, { heroes: [{ id: 3, at: { x: 0.6, y: 0.6 } }], creatures: [{ id: 55, at: { x: 0.35, y: 0.35 } }, { id: 56, at: { x: 0.6, y: 0.6 } }] });
    expect(mocks.moveMapCreatureAction).not.toHaveBeenCalled();
    expect(mocks.moveGameTokenAction).not.toHaveBeenCalled();

    fireEvent.pointerDown(viewport, { button: 0, clientX: 380, clientY: 20, pointerId: 3, pointerType: "mouse" });
    fireEvent.pointerUp(viewport, { clientX: 380, clientY: 20, pointerId: 3, pointerType: "mouse" });
    expect(screen.queryByRole("region", { name: /Вибрано/ })).toBeNull();
  });

  it("під час перетягування група їде слідом, а панель групи змінює розмір і підсвітку всім одразу й скасовується одним кроком", () => {
    render(<GameRoomMap view={gmView({ creatures: [goblin(55, 1, { x: 0.25, y: 0.25 }), goblin(56, 2, { x: 0.5, y: 0.5 })] })} />);
    const map = placeMap();
    const viewport = map.parentElement!;
    fireEvent.pointerDown(viewport, { button: 0, clientX: 50, clientY: 25, pointerId: 2, pointerType: "mouse" });
    fireEvent.pointerMove(viewport, { clientX: 250, clientY: 125, pointerId: 2, pointerType: "mouse" });
    fireEvent.pointerUp(viewport, { clientX: 250, clientY: 125, pointerId: 2, pointerType: "mouse" });
    const panel = within(screen.getByRole("region", { name: "Вибрано: 3" }));

    const follower = within(map).getByRole("button", { name: /«Гоблін 2»/ });
    fireEvent.pointerDown(within(map).getByRole("button", { name: /«Гоблін 1»/ }), { button: 0, clientX: 100, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(within(map).getByRole("button", { name: /«Гоблін 1»/ }), { clientX: 140, clientY: 70, pointerId: 1 });
    const followerSlot = follower.closest<HTMLElement>("[style*='left']")!;
    expect(followerSlot.style.left).toContain("var(--group-dx, 0)");
    expect(Number(followerSlot.parentElement!.style.getPropertyValue("--group-dx"))).toBeCloseTo(0.1);
    fireEvent.pointerUp(within(map).getByRole("button", { name: /«Гоблін 1»/ }), { clientX: 140, clientY: 70, pointerId: 1 });
    expect(followerSlot.parentElement!.style.getPropertyValue("--group-dx")).toBe("");

    const groupSize = panel.getByRole("slider", { name: "Розмір" });
    fireEvent.change(groupSize, { target: { value: "300" } });
    expect(mocks.transformMapCreatureAction).not.toHaveBeenCalled();
    fireEvent.pointerUp(groupSize);
    expect(mocks.transformHeroTokenAction).toHaveBeenCalledWith(7, 1, 3, { rotation: 0, scale: 300 });
    expect(mocks.transformMapCreatureAction).toHaveBeenCalledWith(7, 55, { rotation: 0, scale: 300 });
    expect(mocks.transformMapCreatureAction).toHaveBeenCalledWith(7, 56, { rotation: 0, scale: 300 });
    expect(groupSize.getAttribute("aria-valuetext")).toBe("300%");
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(mocks.transformHeroTokenAction).toHaveBeenLastCalledWith(7, 1, 3, { rotation: 0, scale: 100 });
    expect(mocks.transformMapCreatureAction).toHaveBeenCalledTimes(4);
    expect(mocks.transformMapCreatureAction).toHaveBeenLastCalledWith(7, 56, { rotation: 0, scale: 100 });

    fireEvent.click(within(panel.getByRole("group", { name: "Підсвітка" })).getByRole("button", { name: "Полумʼя" }));
    expect(mocks.changeHeroConditionsAction).toHaveBeenCalledWith(7, 3, { kind: "toggle", condition: "spotlit-fire", isActive: true });
    expect(mocks.changeMapCreatureConditionsAction).toHaveBeenCalledWith(7, 55, { kind: "toggle", condition: "spotlit-fire", isActive: true });
    expect(mocks.changeMapCreatureConditionsAction).toHaveBeenCalledWith(7, 56, { kind: "toggle", condition: "spotlit-fire", isActive: true });
    expect(within(panel.getByRole("group", { name: "Підсвітка" })).getByRole("button", { name: "Полумʼя" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("гравець не рухає істот і не має ряду майстра, але дотиком відкриває статблок без кнопки «прибрати»", () => {
    render(<GameRoomMap view={buildView({ creatures: [goblin(52, 2, { x: 0.5, y: 0.5 })] })} />);
    const map = placeMap();
    expect(screen.queryByRole("button", { name: "Додати істот" })).toBeNull();
    const placed = within(map).getByRole("button", { name: /Токен «Гоблін 2»/ });
    drag(placed, { clientX: 200, clientY: 100 }, { clientX: 100, clientY: 260 });
    expect(mocks.moveMapCreatureAction).not.toHaveBeenCalled();
    expect(mocks.removeMapCreaturesAction).not.toHaveBeenCalled();

    fireEvent.click(placed);
    const statblock = screen.getByRole("dialog", { name: "Гоблін 2" });
    expect(within(statblock).getByText("Завантаження статблоку…")).toBeTruthy();
    expect(within(statblock).queryByRole("button", { name: "Прибрати з мапи" })).toBeNull();
  });

  it("майстер обирає розмір кожної істоти й показ імен істот для всіх, а розмір зі статблоку множиться на повзунок", async () => {
    const dragon = { ...goblin(61, 1, { x: 0.5, y: 0.5 }), label: "Дракон", badge: null, tokenSize: "huge" as const };
    render(<GameRoomMap view={gmView({ id: 9, creatures: [dragon, goblin(62, 2, { x: 0.25, y: 0.25 })] })} />);
    const map = placeMap();
    const readSize = (name: RegExp) => within(map).getByRole("button", { name, hidden: true }).parentElement!.style.width;
    expect([readSize(/«Дракон»/), readSize(/«Гоблін 2»/)]).toEqual([onMap(88), onMap(44)]);

    tapTwice(within(map).getByRole("button", { name: /«Гоблін 2»/ }));
    const statblock = screen.getByRole("dialog", { name: "Гоблін 2" });
    fireEvent.click(within(statblock).getByRole("button", { name: "Крихітний" }));
    expect(mocks.setMapCreatureSizeAction).toHaveBeenCalledWith(9, 62, "tiny");
    expect(readSize(/«Гоблін 2»/)).toBe(onMap(26));

    fireEvent.keyDown(statblock, { key: "Escape" });
    openViewTool();
    fireEvent.click(within(screen.getByRole("group", { name: "Імена істот" })).getByRole("button", { name: "2 рядки" }));
    expect(mocks.setCreatureNameModeAction).toHaveBeenCalledWith(9, "wrap");
    expect(within(map).getByText("Дракон").className).toContain("line-clamp-2");
  });

  it("гравець бачить картку істоти без статблоку, а майстер — справжній статблок і що бачать гравці", () => {
    const shadow = { ...goblin(71, 1, { x: 0.5, y: 0.5 }), label: "Тінь", badge: null };
    render(<GameRoomMap view={buildView({ creatures: [{ ...shadow, creatureKey: null }] })} />);
    fireEvent.click(within(placeMap()).getByRole("button", { name: /«Тінь»/ }));
    const playerDialog = within(screen.getByRole("dialog", { name: "Тінь" }));
    expect(playerDialog.queryByText("Завантаження статблоку…")).toBeNull();
    expect(playerDialog.queryByLabelText("Що бачать гравці")).toBeNull();
    expect(screen.queryByRole("group", { name: "Розмір на мапі" })).toBeNull();
    cleanup();

    render(<GameRoomMap view={gmView({ creatures: [{ ...shadow, statblockName: "Гоблін", customName: "Тінь" }] })} />);
    tapTwice(within(placeMap()).getByRole("button", { name: /«Тінь»/ }));
    const dialog = within(screen.getByRole("dialog", { name: "Тінь" }));
    expect((dialog.getByLabelText("Що бачать гравці") as HTMLInputElement).value).toBe("Тінь");
    expect(dialog.getByText("Гравці бачать «Тінь» і картинку, статблок — ніколи.")).toBeTruthy();
    expect(dialog.getByRole("button", { name: "Повернути справжню назву" })).toBeTruthy();
  });

  it("майстер відкриває статблок істоти з черги бою", () => {
    const shade = goblin(91, 1, { x: 0.5, y: 0.5 });
    const combat = { round: 1, currentId: 1, combatants: [{ id: 1, initiative: 14, hero: null, creature: shade }] };
    render(
      <CombatTurnProvider combat={combat}>
        <GameRoomMap view={gmView({ combat, creatures: [shade] })} />
      </CombatTurnProvider>,
    );
    placeMap();
    fireEvent.click(within(screen.getByRole("list", { name: "Черга ходів" })).getByRole("button", { name: "Статблок «Гоблін 1»" }));
    expect(within(screen.getByRole("dialog", { name: "Гоблін 1" })).getByRole("button", { name: "Прибрати з мапи" })).toBeTruthy();
  });

  it("токен героя, чий зараз хід, підсвічено для всіх, а токен того, хто чекає, — ні", () => {
    const combat = { round: 1, currentId: 1, combatants: [{ id: 1, initiative: 15, hero: { persId: 30, userId: 3, name: "Торин", avatarUrl: null }, creature: null }] };
    render(
      <CombatTurnProvider combat={combat}>
        <GameRoomMap view={buildView({ combat, members: [member(1, "GM", null), member(2, "PLAYER", "Арвен", { x: 0.2, y: 0.2 }), member(3, "PLAYER", "Торин", { x: 0.5, y: 0.5 })] })} />
      </CombatTurnProvider>,
    );
    const map = placeMap();
    expect(within(map).getByText("Т").className).toContain("token-turn-ring");
    expect(within(map).getByText("А").className).not.toContain("token-turn-ring");
  });

  it("обрана аура замінює рамку ходу на токені", () => {
    const combat = { round: 1, currentId: 1, combatants: [{ id: 1, initiative: 15, hero: { persId: 30, userId: 3, name: "Торин", avatarUrl: null }, creature: null }] };
    render(
      <CombatTurnProvider combat={combat}>
        <GameRoomMap view={buildView({ combat, members: [member(1, "GM", null), { ...member(3, "PLAYER", "Торин", { x: 0.5, y: 0.5 }), conditions: { conditions: ["spotlit-arcane"], exhaustionLevel: 0 } }] })} />
      </CombatTurnProvider>,
    );
    const map = placeMap();
    expect(within(map).getByText("Т").className).not.toContain("token-turn-ring");
    expect(map.querySelector(".token-aura-arcane")).not.toBeNull();
  });

  it("майстер бачить хіти під токеном і б'є істоту в діалозі: шкода одразу видна, на нулі токен повалений", async () => {
    const wounded = { ...goblin(81, 1, { x: 0.5, y: 0.5 }), hitPoints: { current: 7, max: 10 } };
    render(<GameRoomMap view={gmView({ id: 9, creatures: [wounded] })} />);
    const map = placeMap();
    expect(within(map).getByRole("button", { name: /«Гоблін 1», хіти 7 з 10/ })).toBeTruthy();
    tapTwice(within(map).getByRole("button", { name: /«Гоблін 1»/ }));

    const statblock = screen.getByRole("dialog", { name: "Гоблін 1" });
    const hitPoints = within(statblock).getByRole("region", { name: "Хіти" });
    expect(within(hitPoints).getByText("7 / 10")).toBeTruthy();
    expect(within(hitPoints).getByRole("button", { name: "Шкода" }).hasAttribute("disabled")).toBe(true);

    fireEvent.change(within(hitPoints).getByLabelText("Кількість хітів"), { target: { value: "4" } });
    fireEvent.click(within(hitPoints).getByRole("button", { name: "Шкода" }));
    expect(mocks.changeMapCreatureHitPointsAction).toHaveBeenCalledWith(9, 81, { kind: "damage", amount: 4 });
    expect(await within(statblock).findByText("3 / 10")).toBeTruthy();

    fireEvent.change(within(hitPoints).getByLabelText("Кількість хітів"), { target: { value: "50" } });
    fireEvent.click(within(hitPoints).getByRole("button", { name: "Шкода" }));
    expect(await within(statblock).findByText("0 / 10")).toBeTruthy();
    expect(within(statblock).getAllByText("Повалений")).toHaveLength(2);
    expect(mocks.changeMapCreatureHitPointsAction).toHaveBeenLastCalledWith(9, 81, { kind: "damage", amount: 50 });
    expect(within(map).getByRole("button", { name: /хіти 0 з 10, повалений/, hidden: true })).toBeTruthy();

    fireEvent.change(within(hitPoints).getByLabelText("Кількість хітів"), { target: { value: "6" } });
    fireEvent.click(within(hitPoints).getByRole("button", { name: "Лікування" }));
    expect(mocks.changeMapCreatureHitPointsAction).toHaveBeenLastCalledWith(9, 81, { kind: "heal", amount: 6 });
    expect(await within(statblock).findByText("6 / 10")).toBeTruthy();
  });

  it("помилка сервера повертає хіти назад і показує причину; без хітів у статблоку їх лише задають", async () => {
    mocks.changeMapCreatureHitPointsAction.mockResolvedValue({ ok: false, error: "Це може зробити лише майстер" });
    render(<GameRoomMap view={gmView({ id: 9, creatures: [{ ...goblin(82, 1, { x: 0.5, y: 0.5 }), hitPoints: { current: 7, max: 10 } }] })} />);
    tapTwice(within(placeMap()).getByRole("button", { name: /«Гоблін 1»/ }));
    const hitPoints = within(screen.getByRole("dialog", { name: "Гоблін 1" })).getByRole("region", { name: "Хіти" });
    fireEvent.change(within(hitPoints).getByLabelText("Кількість хітів"), { target: { value: "4" } });
    fireEvent.click(within(hitPoints).getByRole("button", { name: "Шкода" }));
    expect(await within(hitPoints).findByText("7 / 10")).toBeTruthy();
    cleanup();

    render(<GameRoomMap view={gmView({ id: 9, creatures: [goblin(83, 1, { x: 0.5, y: 0.5 })] })} />);
    tapTwice(within(placeMap()).getByRole("button", { name: /«Гоблін 1»/ }));
    const unset = within(screen.getByRole("dialog", { name: "Гоблін 1" })).getByRole("region", { name: "Хіти" });
    expect(within(unset).getByText("не задано")).toBeTruthy();
    expect(within(unset).queryByRole("button", { name: "Шкода" })).toBeNull();
    fireEvent.change(within(unset).getByLabelText("Кількість хітів"), { target: { value: "12" } });
    fireEvent.click(within(unset).getByRole("button", { name: "Задати максимум" }));
    expect(mocks.changeMapCreatureHitPointsAction).toHaveBeenLastCalledWith(9, 83, { kind: "set_max", amount: 12 });
    expect(await within(unset).findByText("12 / 12")).toBeTruthy();
  });

  it("гравець не бачить ні хітів, ні блоку хітів, але бачить повалену істоту", () => {
    const down = { ...goblin(84, 1, { x: 0.5, y: 0.5 }), isDown: true };
    render(<GameRoomMap view={buildView({ creatures: [down] })} />);
    const token = within(placeMap()).getByRole("button", { name: /Токен «Гоблін 1», повалений/ });
    expect(token.getAttribute("aria-label")).not.toMatch(/хіти/);
    fireEvent.click(token);
    const statblock = screen.getByRole("dialog", { name: "Гоблін 1" });
    expect(within(statblock).getByText("Повалений")).toBeTruthy();
    expect(within(statblock).queryByRole("region", { name: "Хіти" })).toBeNull();
  });
});

describe("обʼєкти на мапі", () => {
  const loadMap = () => {
    const image = screen.getByRole("img", { name: "Мапа сцени" });
    Object.defineProperties(image, { complete: { value: true }, naturalWidth: { value: 800 }, naturalHeight: { value: 400 } });
    fireEvent.load(image);
    return placeMap();
  };
  const chest = (overrides: Partial<SceneObjectView> = {}): SceneObjectView => ({ id: 31, imageKey: "token-images/1/chest", imageUrl: "https://media.test/chest.webp", name: "Скриня", at: { x: 0.5, y: 0.5 }, widthCells: 1, rotation: 0, isHidden: false, sortOrder: 0, floor: null, aspect: 1, ...overrides });

  it("без інструмента обʼєкт — лише картинка під токенами, і дотик по істоті над ним її вибирає", () => {
    render(<GameRoomMap view={gmView({ objects: [chest()], creatures: [goblin(52, 2, { x: 0.5, y: 0.5 })] })} />);
    const map = loadMap();
    const object = within(map).getByRole("img", { name: "Скриня" });
    expect(object.closest(".pointer-events-none")).not.toBeNull();
    expect(within(map).queryByRole("button", { name: /Скриня/ })).toBeNull();
    tapTwice(within(map).getByRole("button", { name: /«Гоблін 2»/ }));
    expect(screen.getByRole("dialog", { name: "Гоблін 2" })).toBeTruthy();
  });

  it("майстер з інструментом тягне обʼєкт, ховає його й прибирає, а скасування повертає", async () => {
    render(<GameRoomMap view={gmView({ objects: [chest()] })} />);
    const map = loadMap();
    fireEvent.click(screen.getByRole("button", { name: "Обʼєкти" }));
    const object = within(map).getByRole("button", { name: "Скриня" });
    drag(object, { clientX: 200, clientY: 100 }, { clientX: 100, clientY: 150 });
    expect(mocks.changeSceneObjectAction).toHaveBeenLastCalledWith(7, 1, 31, expect.objectContaining({ at: { x: 0.25, y: 0.75 } }));

    tap(within(map).getByRole("button", { name: "Скриня" }));
    const panel = screen.getByRole("region", { name: "Скриня" });
    fireEvent.click(within(panel).getByRole("switch"));
    expect(mocks.changeSceneObjectAction).toHaveBeenLastCalledWith(7, 1, 31, expect.objectContaining({ isHidden: true }));
    expect(within(map).getByRole("button", { name: "Скриня, схований" })).toBeTruthy();

    await act(async () => fireEvent.click(within(panel).getByRole("button", { name: "Видалити" })));
    expect(mocks.removeSceneObjectsAction).toHaveBeenCalledWith(7, 1, [31]);
    expect(within(map).queryByRole("button", { name: /Скриня/ })).toBeNull();
    await act(async () => fireEvent.click(screen.getAllByRole("button", { name: "Скасувати" })[0]));
    expect(mocks.addSceneObjectAction).toHaveBeenCalledWith(7, 1, "token-images/1/chest", expect.objectContaining({ at: { x: 0.25, y: 0.75 }, isHidden: true }));
  });

  it("в інструменті «Поверхи» майстер тягне план показаного поверху, а решта обʼєктів не ловить дотиків", () => {
    const plan = chest({ id: 41, name: "План горища", floor: 1 });
    render(<GameRoomMap view={gmView({ objects: [plan, chest()], floors: [{ id: 1, name: "Горище" }], shownFloor: 1 })} />);
    const map = loadMap();
    fireEvent.click(screen.getByRole("button", { name: "Поверхи" }));
    expect(within(map).queryByRole("button", { name: "Скриня" })).toBeNull();
    expect(within(map).getByRole("img", { name: "Скриня" }).closest(".pointer-events-none")).not.toBeNull();
    drag(within(map).getByRole("button", { name: "План горища" }), { clientX: 200, clientY: 100 }, { clientX: 100, clientY: 150 });
    expect(mocks.changeSceneObjectAction).toHaveBeenLastCalledWith(7, 1, 41, expect.objectContaining({ at: { x: 0.25, y: 0.75 }, floor: 1 }));
  });

  it("вибраний обʼєкт видаляє клавіша Delete, але не під час введення назви", async () => {
    render(<GameRoomMap view={gmView({ objects: [chest({ id: 32 })] })} />);
    const map = loadMap();
    fireEvent.click(screen.getByRole("button", { name: "Обʼєкти" }));
    fireEvent.keyDown(window, { key: "Delete" });
    expect(mocks.removeSceneObjectsAction).not.toHaveBeenCalled();

    tap(within(map).getByRole("button", { name: "Скриня" }));
    fireEvent.keyDown(within(screen.getByRole("region", { name: "Скриня" })).getByRole("textbox"), { key: "Backspace" });
    expect(mocks.removeSceneObjectsAction).not.toHaveBeenCalled();
    await act(async () => fireEvent.keyDown(window, { key: "Delete" }));
    expect(mocks.removeSceneObjectsAction).toHaveBeenCalledWith(7, 1, [32]);
    expect(within(map).queryByRole("button", { name: /Скриня/ })).toBeNull();
  });

  it("майстер ставить картинку з бібліотеки в центр мапи; гравець інструмента не має", async () => {
    render(<GameRoomMap view={gmView()} />);
    loadMap();
    fireEvent.click(screen.getByRole("button", { name: "Обʼєкти" }));
    const tile = await screen.findByRole("button", { name: "Поставити зображення 1" });
    await act(async () => fireEvent.click(tile));
    expect(mocks.addSceneObjectAction).toHaveBeenCalledWith(7, 1, "token-images/1/chest", { at: { x: 0.5, y: 0.5 }, widthCells: 1, rotation: 0, name: null, isHidden: false, sortOrder: 0, floor: null, aspect: 1 });
    cleanup();
    render(<GameRoomMap view={buildView()} />);
    expect(screen.queryByRole("button", { name: "Обʼєкти" })).toBeNull();
  });

  it("майстер вмикає свій звук фоном, і гучність підписана його назвою", async () => {
    mocks.setSceneAmbienceAction.mockResolvedValue({ ok: true, value: null });
    render(<GameRoomMap view={gmView()} />);
    fireEvent.click(screen.getByRole("button", { name: "Звуки" }));
    const own = await screen.findByRole("region", { name: "Мої звуки" });
    expect(await within(own).findByText("Сміх корчмаря")).toBeTruthy();
    await act(async () => fireEvent.click(within(own).getByRole("button", { name: "Фоном" })));
    expect(mocks.setSceneAmbienceAction).toHaveBeenCalledWith(7, 1, [{ key: "own:0b6f3c1e-8a2d-4c4e-9f00-1234567890ab", volume: 60 }]);
    expect(within(own).getByRole("button", { name: "Фоном" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("radiogroup", { name: "Гучність: Сміх корчмаря" })).toBeTruthy();
  });

  it("з набору обʼєкт стає з шириною з каталогу", async () => {
    render(<GameRoomMap view={gmView()} />);
    loadMap();
    fireEvent.click(screen.getByRole("button", { name: "Обʼєкти" }));
    fireEvent.click(screen.getByRole("radio", { name: "Набір" }));
    fireEvent.change(await screen.findByRole("combobox", { name: "Категорія обʼєктів" }), { target: { value: "tables" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Поставити: Столи, 1" })));
    expect(mocks.addSceneObjectAction).toHaveBeenCalledWith(7, 1, "library/objects/table-long", expect.objectContaining({ at: { x: 0.5, y: 0.5 }, widthCells: 3 }));
  });

  it("обʼєкт із набору можна одразу перетягнути на потрібне місце мапи", async () => {
    render(<GameRoomMap view={gmView()} />);
    loadMap();
    placeMap();
    fireEvent.click(screen.getByRole("button", { name: "Обʼєкти" }));
    fireEvent.click(screen.getByRole("radio", { name: "Набір" }));
    fireEvent.change(await screen.findByRole("combobox", { name: "Категорія обʼєктів" }), { target: { value: "tables" } });
    await act(async () => drag(screen.getByRole("button", { name: "Поставити: Столи, 1" }), { clientX: 500, clientY: 500 }, { clientX: 100, clientY: 50 }));
    expect(mocks.addSceneObjectAction).toHaveBeenCalledTimes(1);
    expect(mocks.addSceneObjectAction).toHaveBeenCalledWith(7, 1, "library/objects/table-long", expect.objectContaining({ at: { x: 0.25, y: 0.25 }, widthCells: 3 }));
  });
});

describe("стани й ціль на мапі", () => {
  const placedGoblin = (id: number, conditions: MapCreatureView["conditions"]) => ({ ...goblin(id, 1, { x: 0.5, y: 0.5 }), conditions });

  afterEach(() => useGameSessionStore.setState({ targetCreatureBySession: {} }));

  it("під токеном видно два стани та «+N», а повний список читає скрінрідер", () => {
    const conditions = { conditions: ["blinded", "prone"], exhaustionLevel: 3 } as MapCreatureView["conditions"];
    render(<GameRoomMap view={buildView({ creatures: [placedGoblin(91, conditions)] })} />);
    const map = placeMap();
    expect(within(map).getByText("Зс")).toBeTruthy();
    expect(within(map).getByText("По")).toBeTruthy();
    expect(within(map).getByText("+1")).toBeTruthy();
    expect(within(map).getByText("Стани: Засліплений, Повалений, Виснажений 3")).toBeTruthy();
  });

  it("майстер перемикає стани й виснаження в статблоку одразу, а гравець бачить лише список", async () => {
    render(<GameRoomMap view={gmView({ id: 9, creatures: [placedGoblin(92, { conditions: ["poisoned"], exhaustionLevel: 0 })] })} />);
    tapTwice(within(placeMap()).getByRole("button", { name: /«Гоблін 1»/ }));
    const conditions = within(screen.getByRole("dialog", { name: "Гоблін 1" })).getByRole("region", { name: "Стани" });
    const isPressed = (name: string) => within(conditions).getByRole("button", { name }).getAttribute("aria-pressed");
    expect(isPressed("Отруєний")).toBe("true");

    fireEvent.click(within(conditions).getByRole("button", { name: "Отруєний" }));
    expect(mocks.changeMapCreatureConditionsAction).toHaveBeenCalledWith(9, 92, { kind: "toggle", condition: "poisoned", isActive: false });
    fireEvent.click(within(conditions).getByRole("button", { name: "Скований" }));
    expect(mocks.changeMapCreatureConditionsAction).toHaveBeenLastCalledWith(9, 92, { kind: "toggle", condition: "restrained", isActive: true });
    fireEvent.click(within(conditions).getByRole("button", { name: "Рівень 4" }));
    expect(mocks.changeMapCreatureConditionsAction).toHaveBeenLastCalledWith(9, 92, { kind: "exhaustion", level: 4 });
    expect([isPressed("Отруєний"), isPressed("Скований"), isPressed("Рівень 4")]).toEqual(["false", "true", "true"]);
    await act(async () => {});
    expect([isPressed("Отруєний"), isPressed("Скований")]).toEqual(["false", "true"]);
    cleanup();
    resetOptimisticValues();

    render(<GameRoomMap view={buildView({ creatures: [placedGoblin(92, { conditions: ["poisoned"], exhaustionLevel: 0 })] })} />);
    fireEvent.click(within(placeMap()).getByRole("button", { name: /«Гоблін 1»/ }));
    const readOnly = within(screen.getByRole("dialog", { name: "Гоблін 1" })).getByRole("region", { name: "Стани" });
    expect(within(readOnly).getByText("Отруєний")).toBeTruthy();
    expect(within(readOnly).queryByRole("button")).toBeNull();
  });

  it("якщо сервер відмовив, стан повертається до збереженого", async () => {
    mocks.changeMapCreatureConditionsAction.mockResolvedValueOnce({ ok: false, error: "Істоти вже немає" });
    render(<GameRoomMap view={gmView({ id: 9, creatures: [placedGoblin(94, { conditions: [], exhaustionLevel: 0 })] })} />);
    tapTwice(within(placeMap()).getByRole("button", { name: /«Гоблін 1»/ }));
    const conditions = within(screen.getByRole("dialog", { name: "Гоблін 1" })).getByRole("region", { name: "Стани" });
    fireEvent.click(within(conditions).getByRole("button", { name: "Наляканий" }));
    expect(within(conditions).getByRole("button", { name: "Наляканий" }).getAttribute("aria-pressed")).toBe("true");
    await act(async () => {});
    expect(within(conditions).getByRole("button", { name: "Наляканий" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("учасник з героєм ставить і знімає ціль зі статблоку; токен цілі підписано", () => {
    render(<GameRoomMap view={buildView({ creatures: [placedGoblin(93, { conditions: [], exhaustionLevel: 0 })] })} />);
    const map = placeMap();
    fireEvent.click(within(map).getByRole("button", { name: /«Гоблін 1»/ }));
    const statblock = screen.getByRole("dialog", { name: "Гоблін 1" });
    expect(within(statblock).getByText(/з аркуша «Арвен» підуть по цій істоті/)).toBeTruthy();
    fireEvent.click(within(statblock).getByRole("button", { name: "Обрати ціллю" }));
    expect(useGameSessionStore.getState().targetCreatureBySession).toEqual({ 7: 93 });
    expect(within(statblock).getByRole("button", { name: "Зняти ціль" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(map).getByRole("button", { name: /, ціль/, hidden: true })).toBeTruthy();

    fireEvent.click(within(statblock).getByRole("button", { name: "Зняти ціль" }));
    expect(useGameSessionStore.getState().targetCreatureBySession).toEqual({});
  });

  it("майстру без героя ціль не пропонується: кидати по ній нема з чого", () => {
    render(<GameRoomMap view={gmView({ creatures: [placedGoblin(95, { conditions: [], exhaustionLevel: 0 })] })} />);
    tapTwice(within(placeMap()).getByRole("button", { name: /«Гоблін 1»/ }));
    expect(within(screen.getByRole("dialog", { name: "Гоблін 1" })).queryByRole("button", { name: "Обрати ціллю" })).toBeNull();
  });

  it("гравець міняє стани лише свого героя дотиком, а чужого героя не чіпає", () => {
    render(<GameRoomMap view={buildView({ members: [member(1, "GM", null), member(2, "PLAYER", "Арвен", { x: 0.2, y: 0.2 }), member(3, "PLAYER", "Торин", { x: 0.5, y: 0.5 })] })} />);
    const map = placeMap();
    expect(within(map).queryByRole("button", { name: /Токен «Торин»/ })).toBeNull();

    tapTwice(within(map).getByRole("button", { name: /Токен «Арвен»/ }));
    const dialog = screen.getByRole("dialog", { name: "Арвен: стани" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Невидимий" }));
    expect(mocks.changeHeroConditionsAction).toHaveBeenCalledWith(7, 2, { kind: "toggle", condition: "invisible", isActive: true });
  });

  it("майстер відкриває стани будь-якого героя, а позначки героя видно всім", () => {
    const withMark = { ...member(3, "PLAYER", "Торин", { x: 0.5, y: 0.5 }), conditions: { conditions: ["frightened"], exhaustionLevel: 0 } } as GameSessionMemberView;
    render(<GameRoomMap view={gmView({ members: [member(1, "GM", null), withMark] })} />);
    const map = placeMap();
    expect(within(map).getByText("Стани: Наляканий")).toBeTruthy();
    tapTwice(within(map).getByRole("button", { name: /Токен «Торин»/ }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Торин: стани" })).getByRole("button", { name: "Наляканий" }));
    expect(mocks.changeHeroConditionsAction).toHaveBeenCalledWith(7, 3, { kind: "toggle", condition: "frightened", isActive: false });
  });

  it("майстер відкриває лист героя гравця з токена в бічній панелі, не покидаючи стіл", () => {
    render(<GameRoomMap view={gmView({ members: [member(1, "GM", null), member(3, "PLAYER", "Торин", { x: 0.5, y: 0.5 })] })} />);
    tapTwice(within(placeMap()).getByRole("button", { name: /Токен «Торин»/ }));
    const dialog = screen.getByRole("dialog", { name: "Торин: стани" });
    expect(within(dialog).queryByRole("link", { name: "Відкрити лист персонажа" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Відкрити лист персонажа" }));
    expect(screen.queryByRole("dialog", { name: "Торин: стани" })).toBeNull();
    expect(useRoomTabStore.getState().tab).toBe("hero");
  });

  it("власний герой відкриває лист у вкладці кімнати, без переходу зі столу", () => {
    render(<GameRoomMap view={buildView({ members: [member(1, "GM", null), member(2, "PLAYER", "Арвен", { x: 0.2, y: 0.2 })] })} />);
    tapTwice(within(placeMap()).getByRole("button", { name: /Токен «Арвен»/ }));
    const dialog = screen.getByRole("dialog", { name: "Арвен: стани" });
    expect(within(dialog).queryByRole("link", { name: "Відкрити лист персонажа" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Відкрити лист персонажа" }));
    expect(screen.queryByRole("dialog", { name: "Арвен: стани" })).toBeNull();
    expect(useRoomTabStore.getState().tab).toBe("hero");
  });

  it("герой без тями показує кидки смерті, загиблий — що загинув, і це бачать усі", () => {
    const dying = { ...member(3, "PLAYER", "Торин", { x: 0.5, y: 0.5 }), lifeState: { kind: "dying", successes: 1, failures: 2 } } as GameSessionMemberView;
    const dead = { ...member(4, "PLAYER", "Гімлі", { x: 0.2, y: 0.2 }), lifeState: { kind: "dead" } } as GameSessionMemberView;
    render(<GameRoomMap view={gmView({ members: [member(1, "GM", null), dying, dead] })} />);
    const map = placeMap();
    expect(within(map).getByRole("button", { name: /^Токен «Торин», без тями, кидки смерті: успіхів 1 з 3, провалів 2 з 3\./ })).toBeTruthy();
    expect(within(map).getByRole("button", { name: /^Токен «Гімлі», загинув\./ })).toBeTruthy();
    cleanup();

    render(<GameRoomMap view={buildView({ members: [member(1, "GM", null), member(2, "PLAYER", "Арвен"), dying] })} />);
    expect(within(placeMap()).getByText("без тями, кидки смерті: успіхів 1 з 3, провалів 2 з 3")).toBeTruthy();
  });
});

describe("інструменти мапи на весь екран", () => {
  const grid = { columns: 20, offsetX: 0, offsetY: 0, isVisible: true, opacity: 0.35 };
  const rect = { left: 0, top: 0, width: 400, height: 200, right: 400, bottom: 200, x: 0, y: 0, toJSON: () => null };

  function openFullscreen(view: GameSessionView) {
    window.matchMedia = ((query: string) => ({ matches: query === "(orientation: landscape)" })) as unknown as typeof window.matchMedia;
    render(<GameRoomMap view={view} />);
    fireEvent.click(screen.getByRole("button", { name: "Мапа на весь екран" }));
    const dialog = screen.getByRole("dialog", { name: "Печера" });
    const image = within(dialog).getByRole("img", { name: "Мапа сцени" });
    Object.defineProperties(image, { complete: { value: true }, naturalWidth: { value: 800 }, naturalHeight: { value: 400 } });
    fireEvent.load(image);
    const board = image.parentElement!;
    board.getBoundingClientRect = () => rect;
    board.parentElement!.getBoundingClientRect = () => rect;
    return { dialog, viewport: board.parentElement!, board };
  }

  it("гравець міряє відстань лінійкою по клітинках, а туман і сітка йому недоступні", () => {
    const { dialog, viewport } = openFullscreen(buildView({ grid }));
    const tools = within(dialog).getByRole("toolbar", { name: "Інструменти мапи" });
    expect(within(tools).queryByRole("button", { name: "Туман" })).toBeNull();
    expect(within(tools).queryByRole("button", { name: "Сітка" })).toBeNull();

    fireEvent.click(within(tools).getByRole("button", { name: "Лінійка" }));
    fireEvent.pointerDown(viewport, { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(viewport, { clientX: 70, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(viewport, { clientX: 70, clientY: 50, pointerId: 1 });
    expect(within(within(dialog).getByRole("region", { name: "Лінійка" })).getByText("15 фт")).toBeTruthy();
  });

  it("права кнопка миші тягне наближену мапу, а лінійка лишається ввімкненою й нічого не міряє", () => {
    const { dialog, viewport, board } = openFullscreen(buildView({ grid }));
    Object.defineProperties(board, { offsetWidth: { value: 400 }, offsetHeight: { value: 200 } });
    Object.defineProperties(viewport, { clientWidth: { value: 400 }, clientHeight: { value: 200 } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Лінійка" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Наблизити" }));
    const before = board.style.transform;

    fireEvent.pointerDown(viewport, { button: 2, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(viewport, { clientX: 60, clientY: 80, pointerId: 1 });
    fireEvent.pointerUp(viewport, { clientX: 60, clientY: 80, pointerId: 1 });

    expect(board.style.transform).not.toBe(before);
    expect(within(dialog).getByRole("region", { name: "Лінійка" }).textContent).not.toContain("фт");
    expect(fireEvent.contextMenu(viewport)).toBe(false);
  });

  it("утримання на порожньому місці мапи показує всім точку з іменем і саме згасає; рух або інструмент пінга не дають", () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      resetLiveSession(7);
      const { dialog, viewport, board } = openFullscreen(buildView({ grid }));
      const hold = (move?: { clientX: number; clientY: number }) => {
        fireEvent.pointerDown(viewport, { button: 0, clientX: 100, clientY: 50, pointerId: 1 });
        if (move) fireEvent.pointerMove(viewport, { ...move, pointerId: 1 });
        act(() => void vi.advanceTimersByTime(500));
        fireEvent.pointerUp(viewport, { clientX: 100, clientY: 50, pointerId: 1 });
      };

      hold();
      expect(fetchMock).toHaveBeenCalledWith("/api/game-sessions/7/ping", expect.objectContaining({ method: "POST", body: JSON.stringify({ x: 0.25, y: 0.25 }) }));
      expect(within(board).getByText("Арвен")).toBeTruthy();
      act(() => showMapPing(7, { userId: 1, at: { x: 0.5, y: 0.5 } }));
      expect(within(board).getByText("Майстер")).toBeTruthy();
      act(() => void vi.advanceTimersByTime(3000));
      expect(within(board).queryByText("Арвен")).toBeNull();
      expect(within(board).queryByText("Майстер")).toBeNull();

      hold({ clientX: 140, clientY: 50 });
      fireEvent.click(within(dialog).getByRole("button", { name: "Лінійка" }));
      hold();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      resetLiveSession(null);
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it("поки майстер налаштовує сітку, лінії видно на мапі, а розмір написано в клітинках і футах", () => {
    const { dialog, board } = openFullscreen(gmView({ grid: { ...grid, isVisible: false, opacity: 0.35 } }));
    const gridLines = () => board.querySelectorAll("path.stroke-white").length;
    expect(gridLines()).toBe(0);
    fireEvent.click(within(dialog).getByRole("button", { name: "Сітка" }));
    expect(gridLines()).toBe(1);
    expect(within(dialog).getByText("20 × 10")).toBeTruthy();
    expect(within(dialog).getByText("100 × 50")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Закрити інструмент" }));
    expect(gridLines()).toBe(0);
  });

  it("майстер міняє непрозорість ліній повзунком, і лінії на мапі стають яскравішими", () => {
    const { dialog, board } = openFullscreen(gmView({ grid }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Сітка" }));
    fireEvent.change(within(dialog).getByRole("slider", { name: /Непрозорість/ }), { target: { value: "0.8" } });
    expect(board.querySelector("path.stroke-white")?.getAttribute("stroke-opacity")).toBe("0.8");
  });

  it("майстер підганяє сітку під намальовану: обводить квадрат клітинок, а свої лінії ховає", () => {
    const { dialog, viewport } = openFullscreen(gmView({ grid }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Сітка" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Підігнати під намальовану сітку" }));
    expect(within(dialog).getByRole("group", { name: "Клітинок у квадраті" }).textContent).toContain("3 × 3");

    fireEvent.pointerDown(viewport, { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(viewport, { clientX: 55, clientY: 55, pointerId: 1 });
    fireEvent.pointerUp(viewport, { clientX: 55, clientY: 55, pointerId: 1 });

    expect(within(dialog).getByText(/Сітку підігнано/)).toBeTruthy();
    expect((within(dialog).getByRole("spinbutton", { name: "Клітинок по ширині" }) as HTMLInputElement).value).toBe("26.67");
    expect(within(dialog).getByRole("switch").getAttribute("aria-checked")).toBe("false");
  });

  it("натиск на токен виходить із сітки, а під лінійкою токени стоять, доки її не вимкнеш", () => {
    const { dialog, board } = openFullscreen(gmView({ grid, creatures: [goblin(71, 1, { x: 0.25, y: 0.25 })] }));
    const blockedLayers = () => board.querySelectorAll(String.raw`.\[\&\>\*\]\:\!pointer-events-none`).length;
    const toolButton = (name: string) => within(dialog).getByRole("button", { name });
    fireEvent.click(toolButton("Сітка"));
    expect(blockedLayers()).toBe(0);
    fireEvent.pointerDown(within(board).getByRole("button", { name: /«Гоблін 1»/, hidden: true }), { button: 0, pointerId: 1 });
    expect(toolButton("Сітка").getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(toolButton("Лінійка"));
    expect(blockedLayers()).toBe(2);
    expect(within(dialog).queryByText(/токени не рухаються/)).toBeNull();
    fireEvent.click(toolButton("Лінійка"));
    expect(blockedLayers()).toBe(0);
    expect(toolButton("Лінійка").getAttribute("aria-pressed")).toBe("false");
  });

  it("гравець не бачить істоту в тумані, але бачить героїв; майстер бачить усіх", () => {
    const fogged = { fog: { areas: [] }, creatures: [goblin(71, 1, { x: 0.25, y: 0.25 })] };
    render(<GameRoomMap view={buildView(fogged)} />);
    expect(screen.queryByRole("button", { name: /«Гоблін 1»/, hidden: true })).toBeNull();
    expect(screen.getByTitle("Торин")).toBeTruthy();
    cleanup();
    render(<GameRoomMap view={gmView(fogged)} />);
    expect(screen.getByRole("button", { name: /«Гоблін 1»/, hidden: true })).toBeTruthy();
  });

  it("гравець обирає заклинання, бачить, хто в зоні, і показує область усім", async () => {
    const { dialog } = openFullscreen(buildView({ grid }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Область" }));
    fireEvent.click(await within(dialog).findByRole("button", { name: /Вогняна куля/ }));
    const panel = within(dialog).getByRole("region", { name: "Вогняна куля" });
    expect(within(panel).getByText("Торин")).toBeTruthy();

    fireEvent.click(within(panel).getByRole("button", { name: "Розмір: більше" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Показати всім" }));
    expect(mocks.saveSceneAreaAction).toHaveBeenCalledWith(7, 1, null, { shape: "circle", sizeFeet: 25, label: "Вогняна куля", origin: { x: 0.5, y: 0.5 }, angle: 0 });
    expect(await within(panel).findByRole("button", { name: "Готово" })).toBeTruthy();
  });

  it("каст при відкритій повноекранній мапі дає «Накласти» в ній, а зона й цілі ті самі, що на дошці кімнати", () => {
    const view = buildView({ grid });
    window.matchMedia = ((query: string) => ({ matches: query === "(orientation: landscape)" })) as unknown as typeof window.matchMedia;
    render(<GameRoomMap view={view} />);
    const roomImage = screen.getByRole("img", { name: "Мапа сцени" });
    Object.defineProperties(roomImage, { complete: { value: true }, naturalWidth: { value: 800 }, naturalHeight: { value: 400 } });
    fireEvent.load(roomImage);
    placeMap();
    fireEvent.click(screen.getByRole("button", { name: "Мапа на весь екран" }));
    const dialog = screen.getByRole("dialog", { name: "Печера" });
    const image = within(dialog).getByRole("img", { name: "Мапа сцени" });
    Object.defineProperties(image, { complete: { value: true }, naturalWidth: { value: 800 }, naturalHeight: { value: 400 } });
    fireEvent.load(image);
    image.parentElement!.getBoundingClientRect = () => rect;
    image.parentElement!.parentElement!.getBoundingClientRect = () => rect;

    const roll = { title: "Вогняна куля", actions: [], targetSave: { abilityName: "Спритності", dc: 15, spell: { engName: "Fireball", level: 3, ruleset: "RULES_2014" as const } } };
    act(() => useAreaCastStore.setState({ cast: { sessionId: 7, roll, area: { name: "Вогняна куля", shape: "circle", sizeFeet: 20 }, isPlaced: false } }));

    expect(within(dialog).getByRole("button", { name: "Накласти (1)" })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: /Торин/, pressed: true }));
    expect(within(dialog).getByRole("button", { name: "Накласти" })).toBeTruthy();
    const roomPanel = screen.getAllByRole("region", { name: "Вогняна куля", hidden: true }).find((region) => !dialog.contains(region))!;
    expect(within(roomPanel).getByRole("button", { name: /Торин/, pressed: false, hidden: true })).toBeTruthy();
    act(() => useAreaCastStore.setState({ cast: null }));
  });

  function swipe(viewport: HTMLElement, points: Array<[number, number]>) {
    const [first, ...rest] = points;
    fireEvent.pointerDown(viewport, { button: 0, clientX: first[0], clientY: first[1], pointerId: 1 });
    for (const [clientX, clientY] of rest) fireEvent.pointerMove(viewport, { clientX, clientY, pointerId: 1 });
    const last = points[points.length - 1];
    fireEvent.pointerUp(viewport, { clientX: last[0], clientY: last[1], pointerId: 1 });
  }

  it("майстер скасовує «Сховати все» кнопкою біля мапи й клавішами Ctrl+Z", () => {
    const { dialog } = openFullscreen(gmView({ grid }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Туман" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Сховати все" }));
    expect(mocks.changeSceneFogAction).toHaveBeenLastCalledWith(7, 1, { kind: "cover" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Скасувати останню дію (Ctrl+Z)" }));
    expect(mocks.changeSceneFogAction).toHaveBeenLastCalledWith(7, 1, { kind: "set", fog: null });
    expect(within(dialog).queryByRole("button", { name: "Скасувати останню дію (Ctrl+Z)" })).toBeNull();

    fireEvent.click(within(dialog).getByRole("button", { name: "Сховати все" }));
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(mocks.changeSceneFogAction).toHaveBeenLastCalledWith(7, 1, { kind: "set", fog: null });
    expect(mocks.changeSceneFogAction).toHaveBeenCalledTimes(4);
  });

  it("Ctrl+Z скасовує й на українській розкладці", () => {
    const { dialog } = openFullscreen(gmView({ grid }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Туман" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Сховати все" }));
    fireEvent.keyDown(window, { key: "я", code: "KeyZ", ctrlKey: true });
    expect(mocks.changeSceneFogAction).toHaveBeenLastCalledWith(7, 1, { kind: "set", fog: null });
  });

  it("майстер повторює скасоване кнопкою й клавішами, а нова правка стирає повтор", () => {
    const { dialog } = openFullscreen(gmView({ grid }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Туман" }));
    const panel = within(dialog).getByRole("region", { name: "Туман війни" });
    expect((within(panel).getByRole("button", { name: "Повторити" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(dialog).getByRole("button", { name: "Сховати все" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Скасувати" }));

    fireEvent.click(within(dialog).getByRole("button", { name: "Повторити скасовану дію (Ctrl+Shift+Z)" }));
    expect(mocks.changeSceneFogAction).toHaveBeenLastCalledWith(7, 1, { kind: "set", fog: expect.anything() });
    expect(within(dialog).queryByRole("button", { name: "Повторити скасовану дію (Ctrl+Shift+Z)" })).toBeNull();

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(mocks.changeSceneFogAction).toHaveBeenLastCalledWith(7, 1, { kind: "set", fog: expect.anything() });
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    fireEvent.keyDown(window, { key: "Z", ctrlKey: true, shiftKey: true });
    expect(mocks.changeSceneFogAction).toHaveBeenLastCalledWith(7, 1, { kind: "set", fog: expect.anything() });
    expect(mocks.changeSceneFogAction).toHaveBeenCalledTimes(7);

    fireEvent.click(within(panel).getByRole("button", { name: "Скасувати" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Сховати все" }));
    expect((within(panel).getByRole("button", { name: "Повторити" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("круглий пензель туману веде лінію за пальцем, не прив'язану до клітинок", () => {
    const { dialog, viewport } = openFullscreen(gmView({ grid, fog: { areas: [] } }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Туман" }));
    fireEvent.click(within(dialog).getByRole("radio", { name: "Пензель" }));
    swipe(viewport, [[40, 40], [80, 70], [130, 50]]);
    const [, , change] = mocks.changeSceneFogAction.mock.lastCall!;
    expect(change.kind).toBe("area");
    expect(change.area.points.length).toBeGreaterThanOrEqual(2);
    expect(change.area.points[0]).toEqual({ x: 0.1, y: 0.2 });
  });

  it("дотик без руху по токену з туманом вибирає токен і закриває туман, нічого не ховаючи", () => {
    const { dialog, viewport, board } = openFullscreen(gmView({ grid, fog: { areas: [] }, creatures: [goblin(64, 4, { x: 0.5, y: 0.5 })] }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Туман" }));
    within(board).getByRole("button", { name: /«Гоблін 4»/ }).getBoundingClientRect = () => ({ ...rect, left: 190, top: 90, right: 210, bottom: 110, width: 20, height: 20 });
    swipe(viewport, [[200, 100]]);
    expect(mocks.changeSceneFogAction).not.toHaveBeenCalled();
    expect(within(dialog).queryByRole("region", { name: "Туман війни" })).toBeNull();
    expect(within(dialog).getByRole("region", { name: "Гоблін 4" })).toBeTruthy();
  });

  it("гравець малює олівцем лінію для всіх і скасовує її", async () => {
    const { dialog, viewport, board } = openFullscreen(buildView({ grid }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Малювання" }));
    fireEvent.click(within(dialog).getByRole("radio", { name: "Блакитний" }));
    fireEvent.click(within(dialog).getByRole("radio", { name: "Товста" }));
    swipe(viewport, [[40, 40], [120, 40], [200, 60]]);

    expect(mocks.saveSceneDrawingsAction).toHaveBeenCalledWith(7, 1, [expect.objectContaining({ color: "#38bdf8", width: "bold" })]);
    expect(board.querySelectorAll("path[stroke=\"#38bdf8\"]")).toHaveLength(1);
    await act(async () => {});

    fireEvent.click(within(within(dialog).getByRole("region", { name: "Малювання" })).getByRole("button", { name: "Скасувати" }));
    await act(async () => {});
    expect(mocks.removeSceneDrawingsAction).toHaveBeenCalledWith(7, 1, [501]);
    expect(board.querySelectorAll("path[stroke=\"#38bdf8\"]")).toHaveLength(0);
  });

  it("текст пишуть у панелі й ставлять дотиком на мапу", async () => {
    const { dialog, viewport, board } = openFullscreen(buildView({ grid }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Малювання" }));
    fireEvent.click(within(dialog).getByRole("radio", { name: "Текст" }));
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Текст для мапи" }), { target: { value: "Тут дракон" } });
    fireEvent.click(within(dialog).getByRole("radio", { name: "Вʼязь" }));
    swipe(viewport, [[100, 50]]);

    expect(mocks.saveSceneDrawingsAction).toHaveBeenCalledWith(7, 1, [expect.objectContaining({ shape: "text", label: { text: "Тут дракон", font: "ornate", effect: "outline" } })]);
    expect(board.querySelector("text")?.textContent).toBe("Тут дракон");
    expect((within(dialog).getByRole("textbox", { name: "Текст для мапи" }) as HTMLTextAreaElement).value).toBe("");
    await act(async () => {});
  });

  it("гравець пересуває свою лінію в режимі «Рухати» і стирає виділену", async () => {
    const drawings = [{ id: 9, userId: 2, shape: "line" as const, isFilled: false, fillOpacity: 1, color: "sky", width: "bold" as const, label: null, points: [{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }] }];
    const { dialog, viewport } = openFullscreen(buildView({ grid, drawings }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Малювання" }));
    fireEvent.click(within(dialog).getByRole("radio", { name: "Рухати" }));
    swipe(viewport, [[200, 100], [200, 120], [200, 140]]);
    await act(async () => {});

    const [, , id, points] = mocks.moveSceneDrawingAction.mock.lastCall!;
    expect(id).toBe(9);
    expect(points[0].y).toBeGreaterThan(0.5);
    fireEvent.click(within(dialog).getByRole("button", { name: "Стерти виділене" }));
    expect(mocks.removeSceneDrawingsAction).toHaveBeenCalledWith(7, 1, [9]);
  });

  it("повторена лінія зберігається наново, і наступне скасування прибирає вже її", async () => {
    const { dialog, viewport, board } = openFullscreen(buildView({ grid }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Малювання" }));
    swipe(viewport, [[40, 40], [120, 40], [200, 60]]);
    await act(async () => {});
    const panel = within(within(dialog).getByRole("region", { name: "Малювання" }));
    fireEvent.click(panel.getByRole("button", { name: "Скасувати" }));
    await act(async () => {});

    mocks.saveSceneDrawingsAction.mockResolvedValueOnce({ ok: true, value: { ids: [502] } });
    fireEvent.click(panel.getByRole("button", { name: "Повторити" }));
    await act(async () => {});
    expect(mocks.saveSceneDrawingsAction).toHaveBeenCalledTimes(2);
    expect(board.querySelectorAll("path[stroke=\"#ef4444\"]")).toHaveLength(1);

    fireEvent.click(panel.getByRole("button", { name: "Скасувати" }));
    await act(async () => {});
    expect(mocks.removeSceneDrawingsAction).toHaveBeenLastCalledWith(7, 1, [502]);
  });

  it("повтор стирання знову прибирає повернуті лінії", async () => {
    const drawings = [{ id: 9, userId: 2, shape: "line" as const, isFilled: false, fillOpacity: 1, color: "sky", width: "bold" as const, label: null, points: [{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }] }];
    const { dialog } = openFullscreen(buildView({ grid, drawings }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Малювання" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Стерти мої" }));
    const panel = within(within(dialog).getByRole("region", { name: "Малювання" }));
    fireEvent.click(panel.getByRole("button", { name: "Скасувати" }));
    await act(async () => {});
    fireEvent.click(panel.getByRole("button", { name: "Повторити" }));
    await act(async () => {});
    expect(mocks.removeSceneDrawingsAction).toHaveBeenLastCalledWith(7, 1, [501]);
  });

  it("гумка гравця стирає лише його лінії, а майстер стирає все; в архіві олівця немає", () => {
    const drawings = [
      { id: 9, userId: 2, shape: "line" as const, isFilled: false, fillOpacity: 1, color: "sky", width: "bold" as const, label: null, points: [{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }] },
      { id: 10, userId: 3, shape: "line" as const, isFilled: false, fillOpacity: 1, color: "red", width: "thin" as const, label: null, points: [{ x: 0.1, y: 0.2 }, { x: 0.9, y: 0.2 }] },
    ];
    const { dialog, viewport } = openFullscreen(buildView({ grid, drawings }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Малювання" }));
    fireEvent.click(within(dialog).getByRole("radio", { name: "Гумка" }));
    swipe(viewport, [[200, 40], [200, 100]]);
    expect(mocks.removeSceneDrawingsAction).toHaveBeenCalledWith(7, 1, [9]);
    expect((within(dialog).getByRole("button", { name: "Стерти мої" }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();

    const gm = openFullscreen(gmView({ grid, drawings }));
    fireEvent.click(within(gm.dialog).getByRole("button", { name: "Малювання" }));
    fireEvent.click(within(gm.dialog).getByRole("button", { name: "Стерти все" }));
    expect(mocks.removeSceneDrawingsAction).toHaveBeenLastCalledWith(7, 1, "all");
    cleanup();

    openFullscreen(buildView({ grid, drawings, isArchived: true }));
    expect(screen.queryByRole("button", { name: "Малювання" })).toBeNull();
  });

  it("скасоване «Стерти все» повертає 120 ліній запитами по 50", async () => {
    const drawings = Array.from({ length: 120 }, (_, index) => ({ id: index + 1, userId: 2, shape: "line" as const, isFilled: false, fillOpacity: 1, color: "red", width: "thin" as const, label: null, points: [{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }] }));
    const { dialog } = openFullscreen(gmView({ grid, drawings }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Малювання" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Стерти все" }));
    fireEvent.click(within(within(dialog).getByRole("region", { name: "Малювання" })).getByRole("button", { name: "Скасувати" }));
    await act(async () => {});
    await act(async () => {});

    expect(mocks.saveSceneDrawingsAction.mock.calls.map(([, , strokes]) => strokes.length)).toEqual([50, 50, 20]);
  });
  it("майстер обводить кімнату рамкою й врізає двері; скасування повертає цілу стіну, а гравець інструмента не має", async () => {
    const { dialog, viewport, board } = openFullscreen(gmView({ grid }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Стіни" }));
    const panel = within(within(dialog).getByRole("region", { name: "Стіни" }));
    fireEvent.click(panel.getByRole("radio", { name: "Кімната" }));
    swipe(viewport, [[40, 40], [120, 80], [200, 120]]);
    await act(async () => {});
    const room = { kind: "wall", isOpen: false, lock: "none", isCurtained: false, points: [{ x: 0.1, y: 0.2 }, { x: 0.5, y: 0.2 }, { x: 0.5, y: 0.6 }, { x: 0.1, y: 0.6 }, { x: 0.1, y: 0.2 }] };
    expect(mocks.editSceneWallsAction).toHaveBeenLastCalledWith(7, 1, { removedIds: [], added: [room] });

    mocks.editSceneWallsAction.mockResolvedValueOnce({ ok: true, value: { ids: [602, 603, 604] } });
    fireEvent.click(panel.getByRole("radio", { name: "Двері" }));
    swipe(viewport, [[80, 40]]);
    swipe(viewport, [[120, 40]]);
    await act(async () => {});
    expect(mocks.editSceneWallsAction).toHaveBeenLastCalledWith(7, 1, { removedIds: [601], added: [expect.objectContaining({ kind: "wall" }), expect.objectContaining({ kind: "wall" }), { kind: "door", isOpen: false, lock: "none", isCurtained: false, points: [{ x: 0.2, y: 0.2 }, { x: 0.3, y: 0.2 }] }] });
    expect(board.querySelectorAll("path.stroke-sky-300")).toHaveLength(1);

    mocks.editSceneWallsAction.mockResolvedValueOnce({ ok: true, value: { ids: [605] } });
    fireEvent.click(panel.getByRole("button", { name: "Скасувати" }));
    await act(async () => {});
    expect(mocks.editSceneWallsAction).toHaveBeenLastCalledWith(7, 1, { removedIds: [602, 603, 604], added: [room] });
    expect(board.querySelectorAll("path.stroke-sky-300")).toHaveLength(0);

    cleanup();
    const player = openFullscreen(buildView({ grid }));
    expect(within(player.dialog).queryByRole("button", { name: "Стіни" })).toBeNull();
  });

  it("протягнутий палець малює стіну й двері одним рухом, як лінію", async () => {
    const { dialog, viewport } = openFullscreen(gmView({ grid }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Стіни" }));
    const panel = within(within(dialog).getByRole("region", { name: "Стіни" }));
    mocks.editSceneWallsAction.mockResolvedValueOnce({ ok: true, value: { ids: [801] } });
    swipe(viewport, [[40, 40], [120, 40], [200, 40]]);
    await act(async () => {});
    expect(mocks.editSceneWallsAction).toHaveBeenLastCalledWith(7, 1, { removedIds: [], added: [{ kind: "wall", isOpen: false, lock: "none", isCurtained: false, points: [{ x: 0.1, y: 0.2 }, { x: 0.5, y: 0.2 }] }] });
    expect(panel.queryByRole("button", { name: "Завершити стіну" })).toBeNull();

    mocks.editSceneWallsAction.mockResolvedValueOnce({ ok: true, value: { ids: [802, 803, 804] } });
    fireEvent.click(panel.getByRole("radio", { name: "Двері" }));
    swipe(viewport, [[80, 40], [120, 40]]);
    await act(async () => {});
    expect(mocks.editSceneWallsAction).toHaveBeenLastCalledWith(7, 1, { removedIds: [801], added: [expect.objectContaining({ kind: "wall" }), expect.objectContaining({ kind: "wall" }), { kind: "door", isOpen: false, lock: "none", isCurtained: false, points: [{ x: 0.2, y: 0.2 }, { x: 0.3, y: 0.2 }] }] });
  });

  it("поки стіна малюється, Ctrl+Z прибирає її останній кут, а не попередню правку", async () => {
    const { dialog, viewport } = openFullscreen(gmView({ grid }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Туман" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Сховати все" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Стіни" }));
    const panel = within(within(dialog).getByRole("region", { name: "Стіни" }));
    swipe(viewport, [[40, 40]]);
    swipe(viewport, [[200, 40]]);
    swipe(viewport, [[200, 120]]);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    mocks.editSceneWallsAction.mockResolvedValueOnce({ ok: true, value: { ids: [701] } });
    fireEvent.click(panel.getByRole("button", { name: "Завершити стіну" }));
    await act(async () => {});
    expect(mocks.editSceneWallsAction).toHaveBeenLastCalledWith(7, 1, { removedIds: [], added: [{ kind: "wall", isOpen: false, lock: "none", isCurtained: false, points: [{ x: 0.1, y: 0.2 }, { x: 0.5, y: 0.2 }] }] });
    expect(mocks.changeSceneFogAction).toHaveBeenCalledTimes(1);

    mocks.editSceneWallsAction.mockResolvedValueOnce({ ok: true, value: { ids: [] } });
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    await act(async () => {});
    expect(mocks.editSceneWallsAction).toHaveBeenLastCalledWith(7, 1, { removedIds: [701], added: [] });
  });

  it("стіна зберігається без «Готово»: при зміні інструмента, режиму й повторному дотику в останній кут", async () => {
    const { dialog, viewport } = openFullscreen(gmView({ grid }));
    const openWalls = () => fireEvent.click(within(dialog).getByRole("button", { name: "Стіни" }));
    const corner = { x: 0.1, y: 0.2 };
    const wallTo = (...points: TokenPosition[]) => ({ removedIds: [], added: [{ kind: "wall", isOpen: false, lock: "none", isCurtained: false, points: [corner, ...points] }] });
    openWalls();
    swipe(viewport, [[40, 40]]);
    swipe(viewport, [[200, 40]]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Світло" }));
    expect(mocks.editSceneWallsAction).toHaveBeenLastCalledWith(7, 1, wallTo({ x: 0.5, y: 0.2 }));

    openWalls();
    swipe(viewport, [[40, 40]]);
    swipe(viewport, [[40, 120]]);
    fireEvent.click(within(within(dialog).getByRole("region", { name: "Стіни" })).getByRole("radio", { name: "Кімната" }));
    expect(mocks.editSceneWallsAction).toHaveBeenLastCalledWith(7, 1, wallTo({ x: 0.1, y: 0.6 }));

    fireEvent.click(within(within(dialog).getByRole("region", { name: "Стіни" })).getByRole("radio", { name: "Стіна" }));
    swipe(viewport, [[40, 40]]);
    swipe(viewport, [[120, 120]]);
    swipe(viewport, [[120, 120]]);
    expect(mocks.editSceneWallsAction).toHaveBeenLastCalledWith(7, 1, wallTo({ x: 0.3, y: 0.6 }));
    expect(mocks.editSceneWallsAction).toHaveBeenCalledTimes(3);
    await act(async () => {});
  });

  it("Ctrl+Z повертає двері, хіти, стани й сітку, як були до правки майстра", async () => {
    const door = { id: 9, kind: "door" as const, isOpen: false, lock: "none" as const, isCurtained: false, points: [{ x: 0.2, y: 0.2 }, { x: 0.3, y: 0.2 }] };
    const wounded = { ...goblin(81, 1, { x: 0.5, y: 0.5 }), hitPoints: { current: 7, max: 10 }, conditions: { conditions: ["poisoned" as const], exhaustionLevel: 2 } };
    const { dialog } = openFullscreen(gmView({ grid, walls: [door], creatures: [wounded] }));
    const undo = () => act(async () => void fireEvent.keyDown(window, { key: "z", ctrlKey: true }));

    openMenu(within(dialog).getByRole("button", { name: "Звичайні двері, зачинені" }));
    await act(async () => fireEvent.click(await screen.findByRole("menuitem", { name: "Відчинити двері" })));
    await undo();
    expect(mocks.changeSceneOpeningAction).toHaveBeenLastCalledWith(7, 1, 9, { isOpen: false });

    fireEvent.click(within(dialog).getByRole("button", { name: "Сітка" }));
    fireEvent.change(within(dialog).getByRole("slider", { name: /Непрозорість/ }), { target: { value: "0.6" } });
    fireEvent.change(within(dialog).getByRole("slider", { name: /Непрозорість/ }), { target: { value: "0.8" } });
    await act(() => new Promise((resolve) => setTimeout(resolve, 500)));
    expect(mocks.changeSceneGridAction).toHaveBeenCalledTimes(1);
    await undo();
    expect(mocks.changeSceneGridAction).toHaveBeenLastCalledWith(7, 1, grid);
    fireEvent.click(within(dialog).getByRole("button", { name: "Закрити інструмент" }));

    tapTwice(within(dialog).getByRole("button", { name: /«Гоблін 1»/ }));
    const statblock = screen.getByRole("dialog", { name: "Гоблін 1" });
    const hitPoints = within(statblock).getByRole("region", { name: "Хіти" });
    fireEvent.change(within(hitPoints).getByLabelText("Кількість хітів"), { target: { value: "50" } });
    await act(async () => fireEvent.click(within(hitPoints).getByRole("button", { name: "Шкода" })));
    await undo();
    expect(mocks.changeMapCreatureHitPointsAction).toHaveBeenLastCalledWith(7, 81, { kind: "heal", amount: 7 });

    const conditions = within(statblock).getByRole("region", { name: "Стани" });
    await act(async () => fireEvent.click(within(conditions).getByRole("button", { name: "Отруєний" })));
    await act(async () => fireEvent.click(within(conditions).getByRole("button", { name: "Рівень 4" })));
    await undo();
    expect(mocks.changeMapCreatureConditionsAction).toHaveBeenLastCalledWith(7, 81, { kind: "exhaustion", level: 2 });
    await undo();
    expect(mocks.changeMapCreatureConditionsAction).toHaveBeenLastCalledWith(7, 81, { kind: "toggle", condition: "poisoned", isActive: true });
    await act(async () => void fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true }));
    expect(mocks.changeMapCreatureConditionsAction).toHaveBeenLastCalledWith(7, 81, { kind: "toggle", condition: "poisoned", isActive: false });
  });

  it("майстер відчиняє двері й міняє їхній вид через меню значка, а вікно — зачиняє штору", async () => {
    const door = { id: 9, kind: "door" as const, isOpen: false, lock: "none" as const, isCurtained: false, points: [{ x: 0.2, y: 0.2 }, { x: 0.3, y: 0.2 }] };
    const window = { ...door, id: 10, kind: "window" as const, points: [{ x: 0.6, y: 0.2 }, { x: 0.7, y: 0.2 }] };
    const { dialog } = openFullscreen(gmView({ grid, walls: [door, window] }));
    openMenu(within(dialog).getByRole("button", { name: "Звичайні двері, зачинені" }));
    await act(async () => fireEvent.click(await screen.findByRole("menuitem", { name: "Відчинити двері" })));
    expect(mocks.changeSceneOpeningAction).toHaveBeenCalledWith(7, 1, 9, { isOpen: true });

    openMenu(within(dialog).getByRole("button", { name: "Звичайні двері, відчинені" }));
    await act(async () => fireEvent.click(await screen.findByRole("menuitemradio", { name: /Секретні/ })));
    expect(mocks.changeSceneOpeningAction).toHaveBeenLastCalledWith(7, 1, 9, { lock: "secret" });
    expect(within(dialog).getByRole("button", { name: "Секретні двері, відчинені" })).toBeTruthy();

    openMenu(within(dialog).getByRole("button", { name: "Вікно, зачинене" }));
    await act(async () => fireEvent.click(await screen.findByRole("menuitem", { name: "Засунути штору" })));
    expect(mocks.changeSceneOpeningAction).toHaveBeenLastCalledWith(7, 1, 10, { isCurtained: true });
    expect(within(dialog).getByRole("button", { name: "Вікно, зачинене, за шторою" })).toBeTruthy();
  });

  it("гравець відчиняє звичайні двері дотиком, у замкнені не проходить, а значків вікон не бачить", async () => {
    const door = { id: 9, kind: "door" as const, isOpen: false, lock: "none" as const, isCurtained: false, points: [{ x: 0.2, y: 0.2 }, { x: 0.3, y: 0.2 }] };
    const locked = { ...door, id: 11, lock: "locked" as const, points: [{ x: 0.2, y: 0.6 }, { x: 0.3, y: 0.6 }] };
    const window = { ...door, id: 10, kind: "window" as const, points: [{ x: 0.6, y: 0.2 }, { x: 0.7, y: 0.2 }] };
    const { dialog } = openFullscreen(buildView({ grid, walls: [door, locked, window] }));
    expect(within(dialog).queryByRole("button", { name: /Вікно/ })).toBeNull();

    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "Звичайні двері, зачинені" })));
    expect(mocks.changeSceneOpeningAction).toHaveBeenCalledWith(7, 1, 9, { isOpen: true });
    expect(within(dialog).getByRole("button", { name: "Звичайні двері, відчинені" })).toBeTruthy();

    mocks.changeSceneOpeningAction.mockClear();
    fireEvent.click(within(dialog).getByRole("button", { name: "Замкнені двері, зачинені" }));
    expect(toast).toHaveBeenCalledWith("Двері замкнені — відімкнути може майстер");
    expect(mocks.changeSceneOpeningAction).not.toHaveBeenCalled();
  });

  it("у темряві гравець бачить гобліна лише в світлі й без стіни між ним і героєм, а майстер бачить завжди", () => {
    const farGoblin = goblin(5, 1, { x: 0.875, y: 0.55 });
    const torch = { id: 1, at: { x: 0.875, y: 0.55 }, brightFeet: 20, dimFeet: 20, isOn: true, look: DEFAULT_LIGHT_LOOK };
    const wall = [{ x: 0.7, y: 0 }, { x: 0.7, y: 1 }];
    const members = [member(1, "GM", null), member(2, "PLAYER", "Арвен", { x: 0.5, y: 0.5 })];
    const isGoblinShown = (view: GameSessionView) => {
      const { dialog } = openFullscreen(view);
      const isShown = dialog.querySelector('[title="Гоблін 1"]') !== null;
      cleanup();
      return isShown;
    };

    expect(isGoblinShown(buildView({ grid, lighting: "dark", creatures: [farGoblin], members }))).toBe(false);
    expect(isGoblinShown(buildView({ grid, lighting: "dark", creatures: [farGoblin], members, lights: [torch] }))).toBe(true);
    expect(isGoblinShown(buildView({ grid, lighting: "dark", creatures: [farGoblin], members, lights: [torch], walls: [asWall(wall)] }))).toBe(false);
    expect(isGoblinShown(buildView({ grid, lighting: "off", creatures: [farGoblin], members, walls: [asWall(wall)] }))).toBe(true);
    expect(isGoblinShown(gmView({ grid, lighting: "dark", creatures: [farGoblin], members }))).toBe(true);
  });

  it("у темряві чи тумані гравець отримує мапу лише крізь маску видимого, а майстер — звичайну картинку", () => {
    const members = [member(1, "GM", null), member(2, "PLAYER", "Арвен", { x: 0.5, y: 0.5 })];
    const findMaskedMap = (dialog: HTMLElement) => dialog.querySelector("svg image");
    const isPlainMapShown = (dialog: HTMLElement) => !within(dialog).getByRole("img", { name: "Мапа сцени" }).classList.contains("invisible");

    const dark = openFullscreen(buildView({ grid, lighting: "dark", members })).dialog;
    expect(isPlainMapShown(dark)).toBe(false);
    expect(findMaskedMap(dark)?.getAttribute("mask")).toMatch(/^url\(#/);
    cleanup();

    const fogged = openFullscreen(buildView({ grid, fog: { areas: [] }, members })).dialog;
    expect(isPlainMapShown(fogged)).toBe(false);
    expect(findMaskedMap(fogged)?.parentElement?.getAttribute("mask")).toMatch(/^url\(#/);
    cleanup();

    const gm = openFullscreen(gmView({ grid, lighting: "dark", fog: { areas: [] }, members })).dialog;
    expect(isPlainMapShown(gm)).toBe(true);
    expect(findMaskedMap(gm)).toBeNull();
  });

  it("гравець без героя на мапі в темряві бачить підказку, а не мапу", () => {
    const { dialog } = openFullscreen(buildView({ grid, lighting: "dark", members: [member(1, "GM", null), member(2, "PLAYER", "Арвен")] }));
    expect(within(dialog).getByText("Поставте героя на мапу, щоб бачити")).toBeTruthy();
  });

  describe("зір кожного героя", () => {
    const farGoblin = goblin(5, 1, { x: 0.875, y: 0.55 });
    const seeingHeroes = () => [member(1, "GM", null), member(2, "PLAYER", "Арвен", { x: 0.1, y: 0.55 }), { ...member(3, "PLAYER", "Торин", { x: 0.8, y: 0.55 }), darkvisionFeet: 60 }];
    const darkScene = { grid, lighting: "dark" as const, creatures: [farGoblin] };
    const isGoblinShown = (dialog: HTMLElement) => dialog.querySelector('[title="Гоблін 1"]') !== null;

    it("гравець бачить лише очима свого героя, а глядач без героя — очима партії", () => {
      expect(isGoblinShown(openFullscreen(buildView({ ...darkScene, members: seeingHeroes() })).dialog)).toBe(false);
      cleanup();
      expect(isGoblinShown(openFullscreen(buildView({ ...darkScene, myUserId: 4, myPersId: null, myPersIds: [], members: seeingHeroes() })).dialog)).toBe(true);
    });

    it("майстер дивиться очима вибраного героя через Ctrl+L, рамка вибору зникає, а повторне Ctrl+L повертає повний огляд", () => {
      const { dialog } = openFullscreen(gmView({ ...darkScene, members: seeingHeroes() }));
      expect(isGoblinShown(dialog)).toBe(true);

      tap(within(dialog).getByRole("button", { name: /Токен «Арвен»/ }));
      expect(within(dialog).getByRole("button", { name: /^Повернути токен/ })).toBeTruthy();
      fireEvent.keyDown(window, { code: "KeyL", ctrlKey: true });
      expect(isGoblinShown(dialog)).toBe(false);
      expect(within(dialog).queryByRole("button", { name: /^Повернути токен/ })).toBeNull();

      fireEvent.click(within(dialog).getByRole("button", { name: "Світло" }));
      expect(within(dialog).getByRole("button", { name: /Вийти з погляду: Арвен/ }).getAttribute("aria-pressed")).toBe("true");
      fireEvent.keyDown(window, { code: "KeyL", ctrlKey: true });
      expect(isGoblinShown(dialog)).toBe(true);
    });

    it("кнопка з оком без вибраного героя вимкнена, а Ctrl+L підказує, що вибрати", () => {
      const { dialog } = openFullscreen(gmView({ ...darkScene, members: seeingHeroes() }));
      fireEvent.click(within(dialog).getByRole("button", { name: "Світло" }));
      expect((within(within(dialog).getByRole("region", { name: "Світло" })).getByRole("button", { name: /^Очима героя/ }) as HTMLButtonElement).disabled).toBe(true);
      fireEvent.keyDown(window, { code: "KeyL", ctrlKey: true });
      expect(toast).toHaveBeenCalledWith("Виберіть героя на мапі, тоді — око або Ctrl+L");
    });

    it("у панелі «Світло» майстер вибирає героя й натискає око — бачить те, що бачить герой", () => {
      const { dialog } = openFullscreen(gmView({ ...darkScene, members: seeingHeroes() }));
      fireEvent.click(within(dialog).getByRole("button", { name: "Світло" }));
      tap(within(dialog).getByRole("button", { name: /Токен «Арвен»/ }));
      fireEvent.click(within(dialog).getByRole("button", { name: /Очима: Арвен/ }));
      expect(isGoblinShown(dialog)).toBe(false);
      fireEvent.click(within(dialog).getByRole("button", { name: "Очима: Арвен · вийти" }));
      expect(isGoblinShown(dialog)).toBe(true);
      expect(within(dialog).queryByRole("button", { name: "Очима: Арвен · вийти" })).toBeNull();
    });

    it("рейка вмикає огляд вибраного героя і приховує інших героїв за стіною та поза світлом", () => {
      const heroAt = { x: 0.1, y: 0.55 };
      const farAt = { x: 0.8, y: 0.55 };
      const members = [...seeingHeroes(), member(4, "PLAYER", "Ліра", { x: 0.3, y: 0.55 }), member(5, "PLAYER", "Нія", { x: 0.4, y: 0.8 })];
      const lights = [heroAt, farAt, { x: 0.3, y: 0.55 }].map((at, index) => ({ id: index + 1, at, brightFeet: 5, dimFeet: 0, isOn: true, look: DEFAULT_LIGHT_LOOK }));
      const wall = asWall([{ x: 0.7, y: 0 }, { x: 0.7, y: 1 }]);
      const { dialog } = openFullscreen(gmView({ ...darkScene, members, lights, walls: [wall] }));
      const findHero = (name: string) => within(dialog).queryByRole("button", { name: new RegExp(`Токен «${name}»`) });
      const eye = within(within(dialog).getByRole("toolbar", { name: "Інструменти мапи" })).getByRole("button", { name: "Очима героя" });
      expect(findHero("Торин")).toBeTruthy();
      fireEvent.click(eye);
      fireEvent.click(within(screen.getByRole("dialog", { name: "Очима якого героя?" })).getByRole("button", { name: "Арвен" }));
      const activeEye = within(within(dialog).getByRole("toolbar", { name: "Інструменти мапи" })).getByRole("button", { name: "Очима героя" });
      expect(activeEye.getAttribute("aria-pressed")).toBe("true");
      expect(findHero("Арвен")).toBeTruthy();
      expect(findHero("Ліра")).toBeTruthy();
      expect(findHero("Торин")).toBeNull();
      expect(findHero("Нія")).toBeNull();
      fireEvent.click(activeEye);
      expect(findHero("Торин")).toBeTruthy();
      expect(findHero("Нія")).toBeTruthy();
    });

    it("темний зір фарбує сцену стилем кампанії, а майстер міняє стиль для всіх", async () => {
      const mine = [member(1, "GM", null), { ...member(2, "PLAYER", "Арвен", { x: 0.8, y: 0.55 }), darkvisionFeet: 60 }];
      const { dialog } = openFullscreen(buildView({ ...darkScene, darkvisionLook: "dim", members: mine }));
      expect(dialog.querySelector('[data-darkvision="dim"]')).not.toBeNull();
      cleanup();

      const gm = openFullscreen(gmView({ ...darkScene, members: mine })).dialog;
      fireEvent.click(within(gm).getByRole("button", { name: "Світло" }));
      expect(within(gm).getByRole("heading", { name: "Відтінок мапи" })).toBeTruthy();
      expect(within(gm).getByRole("heading", { name: "Вигляд темного зору" })).toBeTruthy();
      const darkvision = within(within(gm).getByRole("radiogroup", { name: "Вигляд темного зору" }));
      await act(async () => fireEvent.click(darkvision.getByRole("radio", { name: "Тепловізор" })));
      expect(mocks.setDarkvisionLookAction).toHaveBeenCalledWith(7, "heat");
      expect(darkvision.getByRole("radio", { name: "Тепловізор" }).getAttribute("aria-checked")).toBe("true");
    });
  });

  it("гравець не проводить героя крізь стіну, але обходить її й проходить відчинені двері; майстра стіни не спиняють", () => {
    const start = { x: 0.275, y: 0.55 };
    const wall = [{ x: 0.5, y: 0 }, { x: 0.5, y: 0.8 }];
    const members = [member(1, "GM", null), member(2, "PLAYER", "Арвен", start)];
    const walk = (view: GameSessionView, path: Array<[number, number]>) => {
      mocks.moveGameTokenAction.mockClear();
      const { dialog } = openFullscreen(view);
      const token = within(dialog).getByRole("button", { name: /Токен «Арвен»/ });
      fireEvent.pointerDown(token, { button: 0, clientX: 110, clientY: 110, pointerId: 1 });
      for (const [clientX, clientY] of path) fireEvent.pointerMove(token, { clientX, clientY, pointerId: 1 });
      const [clientX, clientY] = path.at(-1)!;
      fireEvent.pointerUp(token, { clientX, clientY, pointerId: 1 });
      cleanup();
      return mocks.moveGameTokenAction.mock.calls.at(-1)?.[3];
    };
    const throughWall: Array<[number, number]> = [[200, 110], [310, 110]];

    expect(walk(buildView({ grid, members, lighting: "bright", walls: [asWall(wall)] }), throughWall)).toEqual(start);
    expect(walk(buildView({ grid, members, lighting: "bright", walls: [asWall(wall)] }), [[110, 190], [310, 190], [310, 110]])).toEqual({ x: 0.775, y: 0.55 });
    expect(walk(buildView({ grid, members, lighting: "bright" }), throughWall)).toEqual({ x: 0.775, y: 0.55 });
    expect(walk(buildView({ grid, members, lighting: "off", walls: [asWall(wall)] }), throughWall)).toEqual({ x: 0.775, y: 0.55 });
    expect(walk(gmView({ grid, members, lighting: "bright", walls: [{ id: 3, kind: "wall", isOpen: false, lock: "none", isCurtained: false, points: wall }] }), throughWall)).toEqual({ x: 0.775, y: 0.55 });
  });

  it("гравець не розвідує, тягаючи героя: зір міняється лише після ходу", () => {
    const hiddenGoblin = goblin(5, 1, { x: 0.875, y: 0.3 });
    const wall = [{ x: 0.5, y: 0 }, { x: 0.5, y: 0.8 }];
    const members = [member(1, "GM", null), member(2, "PLAYER", "Арвен", { x: 0.275, y: 0.55 })];
    const { dialog } = openFullscreen(buildView({ grid, members, lighting: "dim", creatures: [hiddenGoblin], walls: [asWall(wall)] }));
    const isGoblinShown = () => dialog.querySelector('[title="Гоблін 1"]') !== null;
    const token = within(dialog).getByRole("button", { name: /Токен «Арвен»/ });

    fireEvent.pointerDown(token, { button: 0, clientX: 110, clientY: 110, pointerId: 1 });
    fireEvent.pointerMove(token, { clientX: 110, clientY: 190, pointerId: 1 });
    fireEvent.pointerMove(token, { clientX: 310, clientY: 190, pointerId: 1 });
    expect(isGoblinShown()).toBe(false);

    fireEvent.pointerUp(token, { clientX: 310, clientY: 190, pointerId: 1 });
    expect(isGoblinShown()).toBe(true);
  });

  it("майстер вмикає темряву й ставить смолоскип у центр видимої частини мапи", async () => {
    const { dialog } = openFullscreen(gmView({ grid }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Світло" }));
    const panel = within(within(dialog).getByRole("region", { name: "Світло" }));
    fireEvent.click(panel.getByRole("radio", { name: "Темрява" }));
    expect(mocks.setSceneLightingAction).toHaveBeenLastCalledWith(7, 1, "dark");

    await act(async () => fireEvent.click(panel.getByRole("button", { name: /Смолоскип/ })));
    expect(mocks.saveSceneLightAction).toHaveBeenLastCalledWith(7, 1, null, { at: { x: 0.5, y: 0.5 }, brightFeet: 20, dimFeet: 20, isOn: true, look: DEFAULT_LIGHT_LOOK });
    expect(within(dialog).getByRole("button", { name: /Джерело світла 20\/20 фт/, pressed: true })).toBeTruthy();
    expect(panel.getByRole("group", { name: "Яскраве" })).toBeTruthy();
  });

  it("перетягування свічки ставить її у точку на мапі й ігнорує падіння за її межами", async () => {
    const { dialog } = openFullscreen(gmView({ grid }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Світло" }));
    const candle = within(dialog).getByRole("button", { name: /^Свічка/ });

    drag(candle, { clientX: 10, clientY: 300 }, { clientX: 10, clientY: 250 });
    expect(mocks.saveSceneLightAction).not.toHaveBeenCalled();

    await act(async () => drag(candle, { clientX: 10, clientY: 300 }, { clientX: 100, clientY: 150 }));
    expect(mocks.saveSceneLightAction).toHaveBeenCalledTimes(1);
    expect(mocks.saveSceneLightAction).toHaveBeenCalledWith(7, 1, null, { at: { x: 0.25, y: 0.75 }, brightFeet: 5, dimFeet: 5, isOn: true, look: DEFAULT_LIGHT_LOOK });
  });
});

describe("поворот і розмір токена на мапі", () => {
  const dragHandle = (handle: HTMLElement, from: { clientX: number; clientY: number }, to: { clientX: number; clientY: number }) => {
    fireEvent.pointerDown(handle, { button: 0, ...from, pointerId: 2 });
    fireEvent.pointerMove(handle, { ...to, pointerId: 2 });
    fireEvent.pointerUp(handle, { ...to, pointerId: 2 });
  };

  it("майстер вибирає істоту дотиком, тягне ручки й крутить кнопками, а другий дотик відкриває статблок, як і кнопка в панелі", () => {
    render(<GameRoomMap view={gmView({ id: 9, creatures: [goblin(61, 1, { x: 0.5, y: 0.5 })] })} />);
    const map = placeMap();
    const token = within(map).getByRole("button", { name: /«Гоблін 1»/ });
    tap(token);
    expect(screen.queryByRole("dialog", { name: "Гоблін 1" })).toBeNull();
    const panel = screen.getByRole("region", { name: "Гоблін 1" });
    expect((within(panel).getByRole("button", { name: "Скинути" }) as HTMLButtonElement).disabled).toBe(true);

    dragHandle(within(map).getByRole("button", { name: /^Повернути токен/ }), { clientX: 0, clientY: -40 }, { clientX: 40, clientY: 0 });
    expect(mocks.transformMapCreatureAction).toHaveBeenLastCalledWith(9, 61, { rotation: 90, scale: 100 });
    dragHandle(within(map).getByRole("button", { name: /^Розмір токена/ }), { clientX: 30, clientY: 30 }, { clientX: 60, clientY: 60 });
    expect(mocks.transformMapCreatureAction).toHaveBeenLastCalledWith(9, 61, { rotation: 90, scale: 200 });
    expect(token.parentElement!.style.width).toBe("calc(88px)");

    const size = within(panel).getByRole("slider", { name: "Розмір" });
    fireEvent.change(size, { target: { value: "190" } });
    fireEvent.pointerUp(size);
    fireEvent.click(within(panel).getByRole("button", { name: /за годинниковою$/ }));
    expect(mocks.transformMapCreatureAction).toHaveBeenLastCalledWith(9, 61, { rotation: 105, scale: 190 });
    fireEvent.click(within(panel).getByRole("button", { name: "Скинути" }));
    expect(mocks.transformMapCreatureAction).toHaveBeenLastCalledWith(9, 61, { rotation: 0, scale: 100 });

    expect(within(panel).getByText(/Другий дотик по токену відкриває «Статблок і стани»/)).toBeTruthy();
    tap(token);
    expect(screen.getByRole("dialog", { name: "Гоблін 1" })).toBeTruthy();
  });

  it("повернутий і збільшений токен однаково видно всім, а гравець відкриває картку істоти одним дотиком", () => {
    const turned = { ...goblin(62, 2, { x: 0.5, y: 0.5 }), tokenTransform: { rotation: 45, scale: 150 } };
    render(<GameRoomMap view={buildView({ creatures: [turned] })} />);
    const token = within(placeMap()).getByRole("button", { name: /«Гоблін 2»/ });
    expect(token.parentElement!.style.width).toBe("calc(39px)");
    expect(token.parentElement!.querySelector<HTMLElement>("[style*=rotate]")!.style.transform).toBe("rotate(45deg)");
    fireEvent.click(token);
    expect(screen.getByRole("dialog", { name: "Гоблін 2" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Повернути токен/ })).toBeNull();
  });

  it("під пальцем токен лишається повернутим так само, як на мапі", () => {
    const turned = { ...goblin(64, 4, { x: 0.5, y: 0.5 }), tokenTransform: { rotation: 45, scale: 100 } };
    const hero = { ...member(3, "PLAYER", "Торин", { x: 0.2, y: 0.2 }), tokenTransform: { rotation: 90, scale: 100 } };
    render(<GameRoomMap view={gmView({ creatures: [turned], members: [member(1, "GM", null), hero] })} />);
    const map = placeMap();
    const countTurned = (degrees: number) => [...document.querySelectorAll<HTMLElement>("[style*=rotate]")].filter((element) => element.style.transform === `rotate(${degrees}deg)`).length;

    for (const [name, degrees] of [[/«Гоблін 4»/, 45], [/Токен «Торин»/, 90]] as const) {
      const token = within(map).getByRole("button", { name });
      expect(countTurned(degrees)).toBe(1);
      fireEvent.pointerDown(token, { button: 0, clientX: 200, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(token, { clientX: 260, clientY: 120, pointerId: 1 });
      expect(countTurned(degrees)).toBe(2);
      fireEvent.pointerCancel(token, { pointerId: 1 });
    }
  });

  it("гравець підсвічує свого героя значком на токені, і це одразу видно на мапі без позначки стану", () => {
    render(<GameRoomMap view={buildView({ members: [member(1, "GM", null), { ...member(2, "PLAYER", "Арвен", { x: 0.2, y: 0.2 }), avatarUrl: "https://media.char.holota.family/heroes/arven-96.webp" }] })} />);
    const map = placeMap();
    const portrait = () => map.parentElement!.querySelector("img[src*='arven']")?.getAttribute("src");
    expect(portrait()).toBe("https://media.char.holota.family/heroes/arven-96.webp");
    tap(within(map).getByRole("button", { name: /Токен «Арвен»/ }));
    const handle = within(map).getByRole("button", { name: "Підсвітка" });
    expect(handle.getAttribute("aria-pressed")).toBe("false");
    expect(within(map).queryByText("Підсвічено")).toBeNull();

    fireEvent.click(handle);
    expect(mocks.changeHeroConditionsAction).toHaveBeenCalledWith(7, 2, { kind: "toggle", condition: "spotlit", isActive: true });
    expect(within(map).getByRole("button", { name: "Підсвітка" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(map).getByText("Підсвічено")).toBeTruthy();
    expect(within(map).queryByText(/^Стани:/)).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("майстер міняє вигляд підсвітки істоти й гасить її в панелі, а гравець істоту не підсвічує", () => {
    const light = (id: number, badge: number) => ({ ...goblin(id, badge, { x: 0.5, y: 0.5 }), conditions: { conditions: ["spotlit"], exhaustionLevel: 0 } }) as MapCreatureView;
    const { unmount } = render(<GameRoomMap view={gmView({ id: 9, creatures: [light(63, 3)] })} />);
    tap(within(placeMap()).getByRole("button", { name: /«Гоблін 3»/ }));
    const picker = within(within(screen.getByRole("region", { name: "Гоблін 3" })).getByRole("group", { name: "Підсвітка" }));
    expect(picker.getByRole("button", { name: "Сяйво" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(picker.getByRole("button", { name: "Полумʼя" }));
    expect(mocks.changeMapCreatureConditionsAction).toHaveBeenCalledWith(9, 63, { kind: "toggle", condition: "spotlit-fire", isActive: true });
    expect(picker.getByRole("button", { name: "Полумʼя" }).getAttribute("aria-pressed")).toBe("true");
    expect(picker.getByRole("button", { name: "Сяйво" }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(picker.getByRole("button", { name: "Полумʼя" }));
    expect(mocks.changeMapCreatureConditionsAction).toHaveBeenLastCalledWith(9, 63, { kind: "toggle", condition: "spotlit-fire", isActive: false });
    unmount();

    render(<GameRoomMap view={buildView({ creatures: [light(65, 5)] })} />);
    const map = placeMap();
    expect(within(map).getByText("Підсвічено")).toBeTruthy();
    fireEvent.click(within(map).getByRole("button", { name: /«Гоблін 5»/ }));
    expect(screen.queryByRole("button", { name: "Підсвітка" })).toBeNull();
  });

  it("гравець змінює розмір свого героя на поточній сцені, а Escape знімає вибір", () => {
    render(<GameRoomMap view={buildView({ members: [member(1, "GM", null), { ...member(2, "PLAYER", "Арвен", { x: 0.2, y: 0.2 }), avatarUrl: "https://media.char.holota.family/heroes/arven-96.webp" }] })} />);
    const map = placeMap();
    const portrait = () => map.parentElement!.querySelector("img[src*='arven']")?.getAttribute("src");
    expect(portrait()).toBe("https://media.char.holota.family/heroes/arven-96.webp");
    tap(within(map).getByRole("button", { name: /Токен «Арвен»/ }));
    const size = within(screen.getByRole("region", { name: "Арвен" })).getByRole("slider", { name: "Розмір" });
    fireEvent.change(size, { target: { value: "800" } });
    fireEvent.pointerUp(size);
    expect(mocks.transformHeroTokenAction).toHaveBeenCalledWith(7, 1, 2, { rotation: 0, scale: 800 });
    expect(portrait()).toBe("https://media.char.holota.family/heroes/arven.webp");

    fireEvent.keyDown(within(map).getByRole("button", { name: /^Розмір токена/ }), { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Арвен" })).toBeNull();
    expect(within(map).queryByRole("button", { name: /^Розмір токена/ })).toBeNull();
  });

  it("дотик до токена з відкритим інструментом закриває інструмент і показує панель токена, а не картку", () => {
    render(<GameRoomMap view={gmView({ creatures: [goblin(63, 3, { x: 0.5, y: 0.5 })] })} />);
    const map = placeMap();
    tap(within(map).getByRole("button", { name: /«Гоблін 3»/ }));
    openViewTool();
    expect(screen.queryByRole("region", { name: "Гоблін 3" })).toBeNull();
    tap(within(map).getByRole("button", { name: /«Гоблін 3»/ }));
    expect(screen.queryByRole("dialog", { name: "Гоблін 3" })).toBeNull();
    expect(screen.getByRole("region", { name: "Гоблін 3" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Вигляд" })).toBeNull();
  });

  function renderWithSidePanel(view: GameSessionView, heroTokenSlot: HTMLElement | null = null) {
    const slot = document.createElement("div");
    document.body.append(slot);
    render(
      <ToolPanelSlotContext.Provider value={slot}>
        <HeroTokenSlotContext.Provider value={heroTokenSlot}>
          <GameRoomMap view={view} />
        </HeroTokenSlotContext.Provider>
      </ToolPanelSlotContext.Provider>,
    );
    return slot;
  }

  it("другий дотик відкриває вкладку «Токен», де майстер змінює колір обводки", async () => {
    const slot = renderWithSidePanel(gmView({ id: 9, creatures: [goblin(65, 5, { x: 0.5, y: 0.5 })] }));
    const map = placeMap();
    const token = within(map).getByRole("button", { name: /«Гоблін 5»/ });
    tap(token);
    const panel = within(slot).getByRole("region", { name: "Гоблін 5" });
    expect(within(panel).getByRole("tab", { name: "Статблок", selected: true })).toBeTruthy();
    expect(within(panel).getByRole("region", { name: "Стани" })).toBeTruthy();
    expect(within(panel).getByText("Завантаження статблоку…")).toBeTruthy();
    expect(within(panel).queryByRole("slider", { name: "Розмір" })).toBeNull();
    expect(within(panel).queryByRole("radiogroup")).toBeNull();

    tap(token);
    expect(screen.queryByRole("dialog", { name: "Гоблін 5" })).toBeNull();
    expect(within(panel).getByRole("tab", { name: "Токен", selected: true })).toBeTruthy();
    const colors = within(within(panel).getByRole("radiogroup", { name: "Колір обводки" }));
    expect(colors.getByRole("radio", { name: "Звичайна", checked: true })).toBeTruthy();
    await act(async () => fireEvent.click(colors.getByRole("radio", { name: "Зелена" })));
    expect(setMapCreatureBorderColorAction).toHaveBeenLastCalledWith(9, 65, "green");
    expect(map.querySelector('[title="Гоблін 5"] .border-emerald-400')).toBeTruthy();
    await act(async () => fireEvent.click(colors.getByRole("radio", { name: "Звичайна" })));
    expect(setMapCreatureBorderColorAction).toHaveBeenLastCalledWith(9, 65, null);
    expect(map.querySelector('[title="Гоблін 5"] .border-slate-500')).toBeTruthy();
    expect(within(panel).getByRole("slider", { name: "Розмір" })).toBeTruthy();
    fireEvent.click(within(panel).getByRole("button", { name: "Прибрати з мапи" }));
    expect(mocks.removeMapCreaturesAction).toHaveBeenCalledWith(9, 65);
    slot.remove();
  });

  it("на компʼютері дотик до героя відкриває його лист у вкладці «Герой» і лишає токен вибраним, а другий дотик — стани й налаштування токена", () => {
    resetRoomTabs();
    const slot = renderWithSidePanel(gmView({ members: [member(1, "GM", null), member(3, "PLAYER", "Торин", { x: 0.5, y: 0.5 })] }));
    const map = placeMap();
    const token = within(map).getByRole("button", { name: /Токен «Торин»/ });
    tap(token);
    expect(useRoomTabStore.getState().sideTab).toBe("hero");
    expect(slot.childElementCount).toBe(0);
    expect(within(map).getByRole("button", { name: /^Повернути токен/ })).toBeTruthy();

    tap(token);
    const panel = within(slot).getByRole("region", { name: "Торин" });
    expect(within(panel).getByRole("tab", { name: "Токен", selected: true })).toBeTruthy();
    expect(within(panel).getByRole("region", { name: "Стани" })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Торин: стани" })).toBeNull();

    fireEvent.click(within(panel).getByRole("tab", { name: "Лист" }));
    expect(slot.childElementCount).toBe(0);
    expect(within(map).getByRole("button", { name: /^Повернути токен/ })).toBeTruthy();
    slot.remove();
  });

  it("на компʼютері шапка листа вибраного героя має кнопку «Токен», що відкриває його налаштування без другого дотику", () => {
    resetRoomTabs();
    const heroTokenSlot = document.createElement("div");
    document.body.append(heroTokenSlot);
    const slot = renderWithSidePanel(gmView({ members: [member(1, "GM", null), member(3, "PLAYER", "Торин", { x: 0.5, y: 0.5 })] }), heroTokenSlot);
    expect(heroTokenSlot.childElementCount).toBe(0);
    tap(within(placeMap()).getByRole("button", { name: /Токен «Торин»/ }));

    fireEvent.click(within(heroTokenSlot).getByRole("button", { name: "Токен «Торин»: стани й вигляд" }));
    const panel = within(slot).getByRole("region", { name: "Торин" });
    expect(within(panel).getByRole("tab", { name: "Токен", selected: true })).toBeTruthy();
    expect(heroTokenSlot.childElementCount).toBe(0);
    slot.remove();
    heroTokenSlot.remove();
  });
});

describe("клавіші й підказки мапи", () => {
  function renderWithHints(view: GameSessionView) {
    const hints = document.createElement("div");
    document.body.append(hints);
    render(
      <MapHintSlotContext.Provider value={hints}>
        <GameRoomMap view={view} />
        <ConfirmDialogHost />
      </MapHintSlotContext.Provider>,
    );
    return hints;
  }

  it("Delete прибирає вибраного героя з мапи в ряд, а Esc лише знімає вибір", () => {
    render(<GameRoomMap view={buildView({ members: [member(1, "GM", null), member(2, "PLAYER", "Арвен", { x: 0.2, y: 0.2 })] })} />);
    const token = within(placeMap()).getByRole("button", { name: /Токен «Арвен»/ });
    tap(token);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Арвен" })).toBeNull();
    fireEvent.keyDown(window, { key: "Delete" });
    expect(mocks.moveGameTokenAction).not.toHaveBeenCalled();

    tap(token);
    fireEvent.keyDown(window, { key: "Backspace" });
    expect(mocks.moveGameTokenAction).toHaveBeenCalledWith(7, 1, 2, null, undefined);
  });

  it("Delete на вибраній істоті спершу питає, бо прибрану істоту не повернути, і не спрацьовує, поки відкрито статблок", async () => {
    const hints = renderWithHints(gmView({ creatures: [goblin(65, 5, { x: 0.5, y: 0.5 })] }));
    tap(within(placeMap()).getByRole("button", { name: /«Гоблін 5»/ }));
    fireEvent.click(screen.getByRole("button", { name: "Статблок і стани" }));
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Гоблін 5" }), { key: "Backspace" });
    expect(screen.queryByRole("dialog", { name: "Прибрати «Гоблін 5»?" })).toBeNull();
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Гоблін 5" }), { key: "Escape" });

    fireEvent.keyDown(window, { key: "Delete" });
    const confirm = screen.getByRole("dialog", { name: "Прибрати «Гоблін 5»?" });
    expect(mocks.removeMapCreaturesAction).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(within(confirm).getByRole("button", { name: "Прибрати" })));
    expect(mocks.removeMapCreaturesAction).toHaveBeenCalledWith(7, 65);
    hints.remove();
  });

  it("шапка підказує загальні жести, а вибір токена й інструмент міняють підказки; Esc закриває інструмент", () => {
    const hints = renderWithHints(gmView({ creatures: [goblin(65, 5, { x: 0.5, y: 0.5 })] }));
    expect(hints.textContent).toContain("Тягни по порожньомурамка для кількох");
    expect(hints.textContent).toContain("Ctrl+Zскасувати");

    tap(within(placeMap()).getByRole("button", { name: /«Гоблін 5»/ }));
    expect(hints.textContent).toContain("Клік ще раз«Статблок і стани»");
    expect(hints.textContent).toContain("Deleteприбрати з мапи");
    expect(hints.textContent).not.toContain("рамка для кількох");

    fireEvent.click(screen.getByRole("button", { name: "Лінійка" }));
    expect(hints.textContent).toContain("Тягнивиміряти відстань");
    expect(hints.textContent).toContain("Escзакрити інструмент");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Лінійка" })).toBeNull();
    expect(hints.textContent).toContain("рамка для кількох");
    hints.remove();
  });
});
