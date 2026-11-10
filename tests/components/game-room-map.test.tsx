// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { MapCreatureView } from "@/rules/game-map-creatures";
import type { GameSessionMemberView, GameSessionView } from "@/server/db/game-sessions";

vi.hoisted(() => {
  const items = new Map<string, string>();
  const storage = { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key) };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true, writable: true });
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
});
const mocks = vi.hoisted(() => ({ replace: vi.fn(), moveGameTokenAction: vi.fn(), moveMapCreatureAction: vi.fn(), removeMapCreaturesAction: vi.fn(), setMapCreatureSizeAction: vi.fn(), setCreatureNameModeAction: vi.fn(), changeMapCreatureHitPointsAction: vi.fn(), changeMapCreatureConditionsAction: vi.fn(), changeHeroConditionsAction: vi.fn(), refresh: vi.fn(), changeSceneFogAction: vi.fn(), changeSceneGridAction: vi.fn(), saveSceneAreaAction: vi.fn(), removeSceneAreasAction: vi.fn(), listAreaSpellsAction: vi.fn() }));
vi.mock("@/lib/actions/game-token-images", () => ({}));
vi.mock("@/lib/actions/game-sessions", () => ({
  moveGameTokenAction: mocks.moveGameTokenAction,
  moveMapCreatureAction: mocks.moveMapCreatureAction,
  removeMapCreaturesAction: mocks.removeMapCreaturesAction,
  setMapCreatureSizeAction: mocks.setMapCreatureSizeAction,
  setCreatureNameModeAction: mocks.setCreatureNameModeAction,
  changeMapCreatureHitPointsAction: mocks.changeMapCreatureHitPointsAction,
  changeMapCreatureConditionsAction: mocks.changeMapCreatureConditionsAction,
  changeHeroConditionsAction: mocks.changeHeroConditionsAction,
  addMapCreaturesAction: vi.fn(),
}));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useNoAiHref: () => (href: string) => href, useModeRouter: () => ({ refresh: mocks.refresh, replace: mocks.replace }), useNoAiMode: () => ({ enabled: false }) }));
vi.mock("@/hooks/useCreatureStatblock", () => ({ useCreatureStatblock: () => ({ creature: null, loreGroup: null }) }));
vi.mock("@/lib/monitoring/game-analytics", () => ({ captureGameEvent: vi.fn() }));
vi.mock("@/lib/actions/game-scene-tools", () => ({
  changeSceneFogAction: mocks.changeSceneFogAction,
  changeSceneGridAction: mocks.changeSceneGridAction,
  saveSceneAreaAction: mocks.saveSceneAreaAction,
  removeSceneAreasAction: mocks.removeSceneAreasAction,
}));
vi.mock("@/lib/actions/game-area-spells", () => ({ listAreaSpellsAction: mocks.listAreaSpellsAction }));

import { CombatTurnProvider } from "@/components/games/combat-turn";
import { useRoomTabStore } from "@/components/games/room-tabs";
import { GameRoomMap } from "@/components/games/GameRoomMap";
import { useAreaCastStore } from "@/lib/components/game/area-cast";
import { resetOptimisticValues } from "@/components/games/optimistic-values";
import { useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.moveGameTokenAction.mockResolvedValue({ ok: true, value: null });
  mocks.moveMapCreatureAction.mockResolvedValue({ ok: true, value: null });
  mocks.removeMapCreaturesAction.mockResolvedValue({ ok: true, value: null });
  mocks.setMapCreatureSizeAction.mockResolvedValue({ ok: true, value: null });
  mocks.setCreatureNameModeAction.mockResolvedValue({ ok: true, value: null });
  mocks.changeMapCreatureHitPointsAction.mockResolvedValue({ ok: true, value: null });
  mocks.changeMapCreatureConditionsAction.mockResolvedValue({ ok: true, value: null });
  mocks.changeHeroConditionsAction.mockResolvedValue({ ok: true, value: null });
  mocks.changeSceneFogAction.mockResolvedValue({ ok: true, value: null });
  mocks.changeSceneGridAction.mockResolvedValue({ ok: true, value: null });
  mocks.saveSceneAreaAction.mockResolvedValue({ ok: true, value: { id: 40 } });
  mocks.removeSceneAreasAction.mockResolvedValue({ ok: true, value: null });
  mocks.listAreaSpellsAction.mockResolvedValue({ ok: true, value: { ruleset: "RULES_2014", spells: [{ name: "Вогняна куля", shape: "circle", sizeFeet: 20, isKnown: true }, { name: "Пекучі долоні", shape: "cone", sizeFeet: 15, isKnown: false }] } });
});
afterEach(() => {
  cleanup();
  resetOptimisticValues();
});

const member = (userId: number, role: "GM" | "PLAYER", persName: string | null, token: GameSessionMemberView["token"] = null): GameSessionMemberView => ({
  heroId: userId, heroSlot: 0, isCutout: false,
  userId, name: `Гравець ${userId}`, role, persId: persName ? userId * 10 : null, persName, avatarUrl: null, isOnline: true, token, conditions: { conditions: [], exhaustionLevel: 0 }, lifeState: { kind: "up" },
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
    viewedSceneId: 1,
    activeSceneId: null,
    scenes: [],
    ...overrides,
  };
}

const goblin = (id: number, badge: number, token: MapCreatureView["token"] = null): MapCreatureView => ({
  id, creatureKey: "goblin", ruleset: "RULES_2014", label: `Гоблін ${badge}`, statblockName: null, customName: null, badge, isAlly: false, imageUrl: null, isRoundImage: false, tokenSize: "medium", token, hitPoints: null, isDown: false, conditions: { conditions: [], exhaustionLevel: 0 },
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

const onMap = (px: number) => `${px}px`;

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

    expect(mocks.moveGameTokenAction).toHaveBeenCalledWith(7, 1, 2, { x: 0.25, y: 0.75 });
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
    expect(mocks.moveGameTokenAction).toHaveBeenCalledWith(7, 1, 3, null);
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
    const token = within(placeMap()).getByRole("button", { name: /Ворог «Гоблін 1»/ });
    fireEvent.pointerDown(token, { button: 0, clientX: 100, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(token, { clientX: 150, clientY: 80, pointerId: 1 });

    rerender(<GameRoomMap view={gmView({ creatures: [goblin(5, 1, null)] })} />);
    fireEvent.pointerMove(document.body, { clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(document.body, { clientX: 200, clientY: 100, pointerId: 1 });

    expect(mocks.moveMapCreatureAction).toHaveBeenCalledWith(7, 5, { x: 0.5, y: 0.5 });
    expect(document.querySelector(".fixed.z-\\[10000\\]")).toBeNull();
  });

  it("стан кімнати, прочитаний до збереження ходу, не повертає істоту на старе місце, а пізніший стан — правда", async () => {
    const findLeft = () => within(placeMap()).getByRole("button", { name: /Ворог «Гоблін 1»/ }).closest<HTMLElement>("[style*='left']")!.style.left;
    const showServerView = (token: MapCreatureView["token"]) => {
      const view = gmView({ creatures: [goblin(5, 1, token)] });
      act(() => useGameSessionLiveStore.setState({ view }));
      rerender(<GameRoomMap view={view} />);
    };
    const { rerender } = render(<GameRoomMap view={gmView({ creatures: [goblin(5, 1, { x: 0.25, y: 0.25 })] })} />);
    drag(within(placeMap()).getByRole("button", { name: /Ворог «Гоблін 1»/ }), { clientX: 100, clientY: 50 }, { clientX: 200, clientY: 100 });
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
    expect(screen.getAllByRole("button", { name: /^Токен/ })).toHaveLength(2);

    rerender(<GameRoomMap view={buildView({ mapImageUrl: null, viewedSceneId: null })} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Майстер ще не показав мапу")).toBeTruthy();
    rerender(<GameRoomMap view={buildView({ mapImageUrl: null, myUserId: 1, myRole: "GM", myPersId: null, myPersIds: [] })} />);
    expect(screen.getByText(/У цій сцені ще немає мапи/)).toBeTruthy();
    rerender(<GameRoomMap view={buildView({ mapImageUrl: null, viewedSceneId: null, myUserId: 1, myRole: "GM", myPersId: null, myPersIds: [] })} />);
    expect(screen.getByText(/Відкрийте або додайте сцену/)).toBeTruthy();
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
    expect(mocks.moveGameTokenAction).toHaveBeenCalledWith(7, 1, 3, { x: 0.25, y: 0.25 });

    fireEvent.click(within(dialog).getByRole("button", { name: "Згорнути мапу" }));
    fireEvent.click(screen.getByRole("button", { name: "Мапа на весь екран" }));
    expect(screen.getByRole("dialog", { name: "Печера" }).className).not.toContain("portrait:rotate-90");
  });

  it("повзунок зменшує лише токени на мапі, ховає дрібні імена й памʼятає розмір для кімнати", () => {
    const stored = new Map<string, string>();
    Object.defineProperty(window, "localStorage", { configurable: true, value: { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => void stored.set(key, value) } });
    const { unmount } = render(<GameRoomMap view={gmView()} />);
    const map = placeMap();
    const readAvatarSize = (scope: HTMLElement, name: RegExp) => within(scope).getByRole("button", { name }).parentElement!.style.width;
    expect(readAvatarSize(map, /Токен «Торин»/)).toBe(onMap(44));

    openViewTool();
    fireEvent.change(screen.getByRole("slider", { name: "Розмір токенів" }), { target: { value: "0.6" } });
    expect(readAvatarSize(map, /Токен «Торин»/)).toBe(onMap(26));
    expect(within(map).queryByText("Торин")).toBeNull();
    expect(readAvatarSize(document.body, /Токен «Арвен»/)).toBe("44px");
    expect(screen.getByText("Арвен")).toBeTruthy();

    unmount();
    render(<GameRoomMap view={gmView()} />);
    expect(readAvatarSize(placeMap(), /Токен «Торин»/)).toBe(onMap(26));
    cleanup();
    render(<GameRoomMap view={gmView({ id: 8 })} />);
    expect(readAvatarSize(placeMap(), /Токен «Торин»/)).toBe(onMap(44));
  });

  it("майстер ставить істоту з ряду на мапу, дотиком відкриває статблок і прибирає її — з картки або витягнувши за мапу", async () => {
    render(<GameRoomMap view={gmView({ creatures: [goblin(51, 1), goblin(52, 2, { x: 0.5, y: 0.5 }), goblin(53, 3, { x: 0.25, y: 0.25 })] })} />);
    const map = placeMap();
    const tray = screen.getByRole("list", { name: "Істоти поза мапою" });
    drag(within(tray).getByRole("button", { name: /«Гоблін 1»/ }), { clientX: 10, clientY: 300 }, { clientX: 100, clientY: 150 });
    expect(mocks.moveMapCreatureAction).toHaveBeenCalledWith(7, 51, { x: 0.25, y: 0.75 });

    const placed = within(map).getByRole("button", { name: /Ворог «Гоблін 2»/ });
    fireEvent.pointerDown(placed, { button: 0, clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(placed, { clientX: 201, clientY: 100, pointerId: 1 });
    const statblock = screen.getByRole("dialog", { name: "Гоблін 2" });
    expect(within(statblock).getByText("Ворог")).toBeTruthy();
    fireEvent.click(within(statblock).getByRole("button", { name: "Прибрати з мапи" }));
    expect(mocks.removeMapCreaturesAction).toHaveBeenCalledWith(7, 52);
    expect(within(map).queryByRole("button", { name: /«Гоблін 2»/ })).toBeNull();

    drag(within(map).getByRole("button", { name: /«Гоблін 3»/ }), { clientX: 100, clientY: 50 }, { clientX: 100, clientY: 260 });
    expect(mocks.removeMapCreaturesAction).toHaveBeenCalledWith(7, 53);
    expect(mocks.moveMapCreatureAction).toHaveBeenCalledTimes(1);
  });

  it("гравець не рухає істот і не має ряду майстра, але дотиком відкриває статблок без кнопки «прибрати»", () => {
    render(<GameRoomMap view={buildView({ creatures: [goblin(52, 2, { x: 0.5, y: 0.5 })] })} />);
    const map = placeMap();
    expect(screen.queryByRole("button", { name: "Додати істот" })).toBeNull();
    const placed = within(map).getByRole("button", { name: /Ворог «Гоблін 2»/ });
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

    tap(within(map).getByRole("button", { name: /«Гоблін 2»/ }));
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
    tap(within(placeMap()).getByRole("button", { name: /«Тінь»/ }));
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
    expect(within(map).getByText("Т").className).toContain("ring-arcane-300");
    expect(within(map).getByText("А").className).not.toContain("ring-arcane-300");
  });

  it("майстер бачить хіти під токеном і б'є істоту в діалозі: шкода одразу видна, на нулі токен повалений", async () => {
    const wounded = { ...goblin(81, 1, { x: 0.5, y: 0.5 }), hitPoints: { current: 7, max: 10 } };
    render(<GameRoomMap view={gmView({ id: 9, creatures: [wounded] })} />);
    const map = placeMap();
    expect(within(map).getByRole("button", { name: /«Гоблін 1», хіти 7 з 10/ })).toBeTruthy();
    tap(within(map).getByRole("button", { name: /«Гоблін 1»/ }));

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
    tap(within(placeMap()).getByRole("button", { name: /«Гоблін 1»/ }));
    const hitPoints = within(screen.getByRole("dialog", { name: "Гоблін 1" })).getByRole("region", { name: "Хіти" });
    fireEvent.change(within(hitPoints).getByLabelText("Кількість хітів"), { target: { value: "4" } });
    fireEvent.click(within(hitPoints).getByRole("button", { name: "Шкода" }));
    expect(await within(hitPoints).findByText("7 / 10")).toBeTruthy();
    cleanup();

    render(<GameRoomMap view={gmView({ id: 9, creatures: [goblin(83, 1, { x: 0.5, y: 0.5 })] })} />);
    tap(within(placeMap()).getByRole("button", { name: /«Гоблін 1»/ }));
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
    const token = within(placeMap()).getByRole("button", { name: /Ворог «Гоблін 1», повалений/ });
    expect(token.getAttribute("aria-label")).not.toMatch(/хіти/);
    fireEvent.click(token);
    const statblock = screen.getByRole("dialog", { name: "Гоблін 1" });
    expect(within(statblock).getByText("Повалений")).toBeTruthy();
    expect(within(statblock).queryByRole("region", { name: "Хіти" })).toBeNull();
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
    tap(within(placeMap()).getByRole("button", { name: /«Гоблін 1»/ }));
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
    tap(within(placeMap()).getByRole("button", { name: /«Гоблін 1»/ }));
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
    tap(within(placeMap()).getByRole("button", { name: /«Гоблін 1»/ }));
    expect(within(screen.getByRole("dialog", { name: "Гоблін 1" })).queryByRole("button", { name: "Обрати ціллю" })).toBeNull();
  });

  it("гравець міняє стани лише свого героя дотиком, а чужого героя не чіпає", () => {
    render(<GameRoomMap view={buildView({ members: [member(1, "GM", null), member(2, "PLAYER", "Арвен", { x: 0.2, y: 0.2 }), member(3, "PLAYER", "Торин", { x: 0.5, y: 0.5 })] })} />);
    const map = placeMap();
    expect(within(map).queryByRole("button", { name: /Токен «Торин»/ })).toBeNull();

    tap(within(map).getByRole("button", { name: /Токен «Арвен»/ }));
    const dialog = screen.getByRole("dialog", { name: "Арвен: стани" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Невидимий" }));
    expect(mocks.changeHeroConditionsAction).toHaveBeenCalledWith(7, 2, { kind: "toggle", condition: "invisible", isActive: true });
  });

  it("майстер відкриває стани будь-якого героя, а позначки героя видно всім", () => {
    const withMark = { ...member(3, "PLAYER", "Торин", { x: 0.5, y: 0.5 }), conditions: { conditions: ["frightened"], exhaustionLevel: 0 } } as GameSessionMemberView;
    render(<GameRoomMap view={gmView({ members: [member(1, "GM", null), withMark] })} />);
    const map = placeMap();
    expect(within(map).getByText("Стани: Наляканий")).toBeTruthy();
    tap(within(map).getByRole("button", { name: /Токен «Торин»/ }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Торин: стани" })).getByRole("button", { name: "Наляканий" }));
    expect(mocks.changeHeroConditionsAction).toHaveBeenCalledWith(7, 3, { kind: "toggle", condition: "frightened", isActive: false });
  });

  it("майстер відкриває лист героя гравця з токена в бічній панелі, не покидаючи стіл", () => {
    render(<GameRoomMap view={gmView({ members: [member(1, "GM", null), member(3, "PLAYER", "Торин", { x: 0.5, y: 0.5 })] })} />);
    tap(within(placeMap()).getByRole("button", { name: /Токен «Торин»/ }));
    const dialog = screen.getByRole("dialog", { name: "Торин: стани" });
    expect(within(dialog).queryByRole("link", { name: "Відкрити лист персонажа" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Відкрити лист персонажа" }));
    expect(screen.queryByRole("dialog", { name: "Торин: стани" })).toBeNull();
    expect(useRoomTabStore.getState().tab).toBe("hero");
  });

  it("власний герой відкриває лист у вкладці кімнати, без переходу зі столу", () => {
    render(<GameRoomMap view={buildView({ members: [member(1, "GM", null), member(2, "PLAYER", "Арвен", { x: 0.2, y: 0.2 })] })} />);
    tap(within(placeMap()).getByRole("button", { name: /Токен «Арвен»/ }));
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
    expect(within(dialog).getByText("Обведіть квадрат 3 × 3 клітинки")).toBeTruthy();
    expect(within(dialog).getByRole("group", { name: "Клітинок у квадраті" }).textContent).toContain("3 × 3");

    fireEvent.pointerDown(viewport, { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(viewport, { clientX: 55, clientY: 55, pointerId: 1 });
    fireEvent.pointerUp(viewport, { clientX: 55, clientY: 55, pointerId: 1 });

    expect(within(dialog).getByText(/Сітку підігнано/)).toBeTruthy();
    expect((within(dialog).getByRole("spinbutton", { name: "Клітинок по ширині" }) as HTMLInputElement).value).toBe("26.67");
    expect(within(dialog).getByRole("switch").getAttribute("aria-checked")).toBe("false");
  });

  it("натиск на токен виходить із сітки, а під лінійкою токени стоять, доки не натиснеш «Готово»", () => {
    const { dialog, board } = openFullscreen(gmView({ grid, creatures: [goblin(71, 1, { x: 0.25, y: 0.25 })] }));
    const blockedLayers = () => board.querySelectorAll(String.raw`.\[\&\>\*\]\:\!pointer-events-none`).length;
    const toolButton = (name: string) => within(dialog).getByRole("button", { name });
    fireEvent.click(toolButton("Сітка"));
    expect(within(dialog).getByRole("status").textContent).toContain("Сітка");
    expect(blockedLayers()).toBe(0);
    fireEvent.pointerDown(within(board).getByRole("button", { name: /«Гоблін 1»/, hidden: true }), { button: 0, pointerId: 1 });
    expect(toolButton("Сітка").getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(toolButton("Лінійка"));
    expect(within(dialog).getByRole("status").textContent).toContain("Лінійка: токени не рухаються");
    expect(blockedLayers()).toBe(2);
    fireEvent.click(toolButton("Готово"));
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
});
