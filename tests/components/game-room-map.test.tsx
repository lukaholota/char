// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { GameSessionMemberView, GameSessionView } from "@/server/db/game-sessions";

const mocks = vi.hoisted(() => ({ moveGameTokenAction: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/actions/game-sessions", () => ({ moveGameTokenAction: mocks.moveGameTokenAction, setGameMapAction: vi.fn(), clearGameMapAction: vi.fn() }));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/monitoring/game-analytics", () => ({ captureGameEvent: vi.fn() }));

import { GameRoomMap } from "@/components/games/GameRoomMap";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.moveGameTokenAction.mockResolvedValue({ ok: true, value: null });
});
afterEach(cleanup);

const member = (userId: number, role: "GM" | "PLAYER", persName: string | null, token: GameSessionMemberView["token"] = null): GameSessionMemberView => ({
  userId, name: `Гравець ${userId}`, role, persId: persName ? userId * 10 : null, persName, avatarUrl: null, isOnline: true, token,
});

function buildView(overrides: Partial<GameSessionView> = {}): GameSessionView {
  return {
    id: 7, name: "Печера", isArchived: false, myUserId: 2, myRole: "PLAYER", myPersId: 20, inviteToken: null, mapImageUrl: "https://media.test/games/7/map/a.webp",
    members: [member(1, "GM", null), member(2, "PLAYER", "Арвен"), member(3, "PLAYER", "Торин", { x: 0.5, y: 0.5 })],
    ...overrides,
  };
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
    const gmView = (overrides: Partial<GameSessionView> = {}) => buildView({ myUserId: 1, myRole: "GM", myPersId: null, ...overrides });
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
});
