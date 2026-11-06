// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { MapCreatureView } from "@/rules/game-map-creatures";
import type { GameSessionMemberView, GameSessionView } from "@/server/db/game-sessions";

const mocks = vi.hoisted(() => ({ moveGameTokenAction: vi.fn(), moveMapCreatureAction: vi.fn(), removeMapCreaturesAction: vi.fn(), setMapCreatureSizeAction: vi.fn(), setCreatureNameModeAction: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/actions/game-sessions", () => ({
  moveGameTokenAction: mocks.moveGameTokenAction,
  moveMapCreatureAction: mocks.moveMapCreatureAction,
  removeMapCreaturesAction: mocks.removeMapCreaturesAction,
  setMapCreatureSizeAction: mocks.setMapCreatureSizeAction,
  setCreatureNameModeAction: mocks.setCreatureNameModeAction,
  addMapCreaturesAction: vi.fn(),
  setGameMapAction: vi.fn(),
  clearGameMapAction: vi.fn(),
}));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: () => ({ refresh: mocks.refresh }), useNoAiMode: () => ({ enabled: false }) }));
vi.mock("@/hooks/useCreatureStatblock", () => ({ useCreatureStatblock: () => ({ creature: null, loreGroup: null }) }));
vi.mock("@/lib/monitoring/game-analytics", () => ({ captureGameEvent: vi.fn() }));

import { GameRoomMap } from "@/components/games/GameRoomMap";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.moveGameTokenAction.mockResolvedValue({ ok: true, value: null });
  mocks.moveMapCreatureAction.mockResolvedValue({ ok: true, value: null });
  mocks.removeMapCreaturesAction.mockResolvedValue({ ok: true, value: null });
  mocks.setMapCreatureSizeAction.mockResolvedValue({ ok: true, value: null });
  mocks.setCreatureNameModeAction.mockResolvedValue({ ok: true, value: null });
});
afterEach(cleanup);

const member = (userId: number, role: "GM" | "PLAYER", persName: string | null, token: GameSessionMemberView["token"] = null): GameSessionMemberView => ({
  userId, name: `Гравець ${userId}`, role, persId: persName ? userId * 10 : null, persName, avatarUrl: null, isOnline: true, token,
});

function buildView(overrides: Partial<GameSessionView> = {}): GameSessionView {
  return {
    id: 7, name: "Печера", isArchived: false, myUserId: 2, myRole: "PLAYER", myPersId: 20, inviteToken: null, mapImageUrl: "https://media.test/games/7/map/a.webp",
    members: [member(1, "GM", null), member(2, "PLAYER", "Арвен"), member(3, "PLAYER", "Торин", { x: 0.5, y: 0.5 })],
    creatures: [],
    creatureNameMode: "short",
    ...overrides,
  };
}

const goblin = (id: number, badge: number, token: MapCreatureView["token"] = null): MapCreatureView => ({
  id, creatureKey: "goblin", ruleset: "RULES_2014", label: `Гоблін ${badge}`, statblockName: null, badge, isAlly: false, imageUrl: null, isRoundImage: false, tokenSize: "medium", token,
});
const gmView = (overrides: Partial<GameSessionView> = {}) => buildView({ myUserId: 1, myRole: "GM", myPersId: null, ...overrides });

function drag(token: HTMLElement, from: { clientX: number; clientY: number }, to: { clientX: number; clientY: number }) {
  fireEvent.pointerDown(token, { button: 0, ...from, pointerId: 1 });
  fireEvent.pointerMove(token, { ...to, pointerId: 1 });
  fireEvent.pointerUp(token, { ...to, pointerId: 1 });
}

function tap(token: HTMLElement) {
  fireEvent.pointerDown(token, { button: 0, clientX: 200, clientY: 100, pointerId: 1 });
  fireEvent.pointerUp(token, { clientX: 200, clientY: 100, pointerId: 1 });
}

function placeMap() {
  const map = screen.getByRole("img", { name: "Мапа сцени" }).parentElement!;
  map.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 200, right: 400, bottom: 200, x: 0, y: 0, toJSON: () => null });
  return map;
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

    expect(mocks.moveGameTokenAction).toHaveBeenCalledWith(7, 2, { x: 0.25, y: 0.75 });
    expect(within(map).getByRole("button", { name: /Токен «Арвен»/ })).toBeTruthy();
  });

  it("дотик без руху нічого не надсилає, а витягнутий за межі токен повертається в ряд", () => {
    render(<GameRoomMap view={buildView({ myUserId: 3, myPersId: 30 })} />);
    const map = placeMap();
    const token = within(map).getByRole("button", { name: /Токен «Торин»/ });
    fireEvent.pointerDown(token, { button: 0, clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(token, { clientX: 201, clientY: 100, pointerId: 1 });
    expect(mocks.moveGameTokenAction).not.toHaveBeenCalled();

    fireEvent.pointerDown(token, { button: 0, clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(token, { clientX: 200, clientY: 260, pointerId: 1 });
    fireEvent.pointerUp(token, { clientX: 200, clientY: 260, pointerId: 1 });
    expect(mocks.moveGameTokenAction).toHaveBeenCalledWith(7, 3, null);
    expect(within(map).queryByRole("button")).toBeNull();
  });

  it("під час перетягування підказує, що токен зійде з мапи, а на весь екран мапа відкривається з тими самими токенами", () => {
    render(<GameRoomMap view={buildView({ myUserId: 3, myPersId: 30 })} />);
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

  it("майстер рухає будь-який токен; без мапи гравець нічого не бачить, а майстер бачить, як її додати", () => {
    const { rerender } = render(<GameRoomMap view={buildView({ myUserId: 1, myRole: "GM", myPersId: null })} />);
    expect(screen.getAllByRole("button", { name: /^Токен/ })).toHaveLength(2);

    rerender(<GameRoomMap view={buildView({ mapImageUrl: null })} />);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<GameRoomMap view={buildView({ mapImageUrl: null, myUserId: 1, myRole: "GM", myPersId: null })} />);
    expect(screen.getByRole("button", { name: "Додати мапу сцени" })).toBeTruthy();
  });

  it("на телефоні широку мапу можна повернути горизонтально, і токен падає туди, куди його тягнуть", () => {
    window.matchMedia = ((query: string) => ({ matches: query === "(orientation: portrait)" })) as unknown as typeof window.matchMedia;
    render(<GameRoomMap view={buildView({ myUserId: 3, myPersId: 30 })} />);
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
    const token = within(image.parentElement!).getByRole("button", { name: /Токен «Торин»/ });
    fireEvent.pointerDown(token, { button: 0, clientX: 100, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(token, { clientX: 150, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(token, { clientX: 150, clientY: 100, pointerId: 1 });
    expect(mocks.moveGameTokenAction).toHaveBeenCalledWith(7, 3, { x: 0.25, y: 0.25 });

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
    expect(readAvatarSize(map, /Токен «Торин»/)).toBe("44px");

    fireEvent.change(screen.getByRole("slider", { name: "Розмір токенів" }), { target: { value: "0.6" } });
    expect(readAvatarSize(map, /Токен «Торин»/)).toBe("26px");
    expect(within(map).queryByText("Торин")).toBeNull();
    expect(readAvatarSize(document.body, /Токен «Арвен»/)).toBe("44px");
    expect(screen.getByText("Арвен")).toBeTruthy();

    unmount();
    render(<GameRoomMap view={gmView()} />);
    expect(readAvatarSize(placeMap(), /Токен «Торин»/)).toBe("26px");
    cleanup();
    render(<GameRoomMap view={gmView({ id: 8 })} />);
    expect(readAvatarSize(placeMap(), /Токен «Торин»/)).toBe("44px");
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
    expect([readSize(/«Дракон»/), readSize(/«Гоблін 2»/)]).toEqual(["88px", "44px"]);

    tap(within(map).getByRole("button", { name: /«Гоблін 2»/ }));
    const statblock = screen.getByRole("dialog", { name: "Гоблін 2" });
    fireEvent.click(within(statblock).getByRole("button", { name: "Крихітний" }));
    expect(mocks.setMapCreatureSizeAction).toHaveBeenCalledWith(9, 62, "tiny");
    expect(readSize(/«Гоблін 2»/)).toBe("26px");

    fireEvent.keyDown(statblock, { key: "Escape" });
    fireEvent.click(within(screen.getByRole("group", { name: "Імена істот" })).getByRole("button", { name: "2 рядки" }));
    expect(mocks.setCreatureNameModeAction).toHaveBeenCalledWith(9, "wrap");
    expect(within(map).getByText("Дракон").className).toContain("line-clamp-2");
  });

  it("гравець бачить власне імʼя істоти без статблоку, а майстер — і справжній статблок", () => {
    const shadow = { ...goblin(71, 1, { x: 0.5, y: 0.5 }), label: "Тінь", badge: null };
    render(<GameRoomMap view={buildView({ creatures: [{ ...shadow, creatureKey: null }] })} />);
    fireEvent.click(within(placeMap()).getByRole("button", { name: /«Тінь»/ }));
    expect(within(screen.getByRole("dialog", { name: "Тінь" })).getByText("Майстер приховав статблок цієї істоти.")).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Розмір на мапі" })).toBeNull();
    cleanup();

    render(<GameRoomMap view={gmView({ creatures: [{ ...shadow, statblockName: "Гоблін" }] })} />);
    tap(within(placeMap()).getByRole("button", { name: /«Тінь»/ }));
    expect(within(screen.getByRole("dialog", { name: "Тінь" })).getByText("Гравці бачать це імʼя. Статблок: Гоблін")).toBeTruthy();
  });
});
