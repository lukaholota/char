// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { GameRoll } from "@/rules/game-roll";
import type { GameRollEventView } from "@/server/db/game-roll-events";
import type { GameSessionMemberView, GameSessionView } from "@/server/db/game-sessions";

vi.hoisted(() => {
  const items = new Map<string, string>();
  const storage = { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key) };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true, writable: true });
});
vi.mock("@/lib/monitoring/game-analytics", () => ({ captureGameEvent: vi.fn() }));
vi.mock("@/lib/components/game/play-roll-chime", () => ({ playRollChime: vi.fn() }));
const mocks = vi.hoisted(() => ({ undoRollDamageAction: vi.fn() }));
vi.mock("@/lib/actions/game-sessions", () => ({ undoRollDamageAction: mocks.undoRollDamageAction }));

import { GameRollEntry } from "@/components/games/GameRollEntry";
import { GameRollTargetBar } from "@/components/games/GameRollTargetBar";
import { FreeDicePanel } from "@/lib/components/dice/FreeDicePanel";
import { captureGameRollTarget, publishGameRoll } from "@/lib/components/game/game-roll-publisher";
import { resetLiveSession, useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { useSheetPersStore } from "@/lib/stores/sheetPersStore";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { readRollVisibility, useGameSessionStore } from "@/lib/stores/gameSessionStore";

const roll: GameRoll = { d20Mode: null, modeSources: [], groups: [{ sides: 20, values: [17] }], extra: [], bonus: 0, total: 17, check: null };

function buildMember(role: "GM" | "PLAYER"): GameSessionMemberView {
  return { heroId: 7, heroSlot: 0, isCutout: false, userId: 7, name: "Оксана", role, persId: null, persName: null, avatarUrl: null, isOnline: true, token: null };
}

function buildView(role: "GM" | "PLAYER"): GameSessionView {
  return { id: 1, name: "Кімната", isArchived: false, myUserId: 7, myRole: role, myPersId: null, myPersIds: [], inviteToken: null, mapImageUrl: null, members: [buildMember(role)], creatures: [], creatureNameMode: "ALL" } as GameSessionView;
}

function enterRoom(role: "GM" | "PLAYER") {
  useGameSessionStore.setState({ active: { id: 1, name: "Кімната" }, visibilityBySession: {} });
  resetLiveSession(1);
  useGameSessionLiveStore.setState({ view: buildView(role) });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
});

afterEach(() => {
  cleanup();
  useGameSessionStore.setState({ active: null, visibilityBySession: {} });
  useDiceUIStore.getState().close();
  resetLiveSession(null);
  vi.unstubAllGlobals();
});

describe("secret roll entry", () => {
  const redacted: GameRollEventView = { seq: 3, authorUserId: 7, authorName: "Оксана", persName: null, avatarUrl: null, source: "FREE", visibility: "SECRET", label: "Секретний кидок · 1к20", roll: null, total: null, rolledAt: "2026-11-06T10:00:00.000Z", createdAt: "2026-11-06T10:00:00.000Z", target: null, saves: null };

  it("shows the formula and a question mark instead of dice values", () => {
    render(<ol><GameRollEntry event={redacted} isMine isNew={false} /></ol>);
    expect(screen.getByText("Секретний кидок · 1к20")).toBeTruthy();
    expect(screen.getByLabelText("Результат прихований").textContent).toBe("?");
    expect(screen.getByText("Лише майстру")).toBeTruthy();
    expect(screen.queryByText(/к20:/)).toBeNull();
  });

  it("shows the full roll to the gm", () => {
    render(<ol><GameRollEntry event={{ ...redacted, label: "1к20", roll, total: 17 }} isMine={false} isNew={false} /></ol>);
    expect(screen.getByLabelText("Разом 17").textContent).toBe("17");
  });
});

describe("free dice panel", () => {
  const pool = [{ sides: 20, value: 17 }];
  const panel = (isSecret: boolean) => <FreeDicePanel isReady isRolling={false} isSecret={isSecret} pool={pool} onAdd={vi.fn()} onRemove={vi.fn()} onReroll={vi.fn()} onClear={vi.fn()} />;

  it("hides the sum and the values for a secret roll", () => {
    const { container } = render(panel(true));
    expect(container.textContent).not.toContain("17");
    expect(container.textContent).toContain("?");
    expect(container.textContent).toContain("1к20");
  });

  it("shows them for an open roll", () => {
    const { container } = render(panel(false));
    expect(container.textContent).toContain("17");
  });
});

describe("roll target bar", () => {
  it("lets a player send free and sheet rolls to the gm only and keeps that choice for the room", () => {
    enterRoom("PLAYER");
    useSheetPersStore.setState({ pers: { persId: 5, name: "Тарн" } as never });
    const { unmount } = render(<GameRollTargetBar isSheetRoll={false} />);
    expect(screen.getAllByRole("radio").map((option) => option.textContent)).toEqual(["Усім", "Мені й майстру", "Лише майстру"]);

    fireEvent.click(screen.getByRole("radio", { name: "Лише майстру" }));
    expect(useGameSessionStore.getState().visibilityBySession).toEqual({ 1: "SECRET" });
    expect(captureGameRollTarget("pool")?.visibility).toBe("SECRET");
    expect(captureGameRollTarget("sheet")?.visibility).toBe("SECRET");
    unmount();

    render(<GameRollTargetBar isSheetRoll />);
    expect(screen.getByRole("radio", { name: "Лише майстру" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: "Мені й майстру" }));
    expect(captureGameRollTarget("sheet")?.visibility).toBe("GM");
  });

  it("offers the gm only open or own rolls, and a stored gm-only choice stays visible to the gm", () => {
    enterRoom("GM");
    useGameSessionStore.setState({ visibilityBySession: { 1: "SECRET" } });
    render(<GameRollTargetBar isSheetRoll={false} />);
    expect(screen.getAllByRole("radio").map((option) => option.textContent)).toEqual(["Усім", "Лише мені"]);
    expect(screen.getByRole("radio", { name: "Лише мені" }).getAttribute("aria-checked")).toBe("true");
    expect(captureGameRollTarget("pool")?.visibility).toBe("GM");
  });
});

describe("stored visibility", () => {
  it("treats a stored author-only default as gm-only and never as public", () => {
    useGameSessionStore.setState({ visibilityBySession: { 1: "SELF", 2: "PUBLIC", 3: "GM", 5: "SECRET" } });
    expect([1, 2, 3, 4, 5].map(readRollVisibility)).toEqual(["GM", "PUBLIC", "GM", "PUBLIC", "SECRET"]);
  });
});

describe("pending secret roll", () => {
  it("renders redacted in the author's own journal before the server answers", () => {
    enterRoom("PLAYER");
    publishGameRoll({ sessionId: 1, visibility: "SECRET", persId: null, creatureId: null }, { label: "1к20", roll, isFromSheet: false, kind: null });
    const [pending] = useGameSessionLiveStore.getState().pendingRolls;
    expect(pending.event).toMatchObject({ visibility: "SECRET", label: "Секретний кидок · 1к20", roll: null, total: null });
  });

  it("keeps the full pending roll for a gm", () => {
    enterRoom("GM");
    publishGameRoll({ sessionId: 1, visibility: "SECRET", persId: null, creatureId: null }, { label: "1к20", roll, isFromSheet: false, kind: null });
    expect(useGameSessionLiveStore.getState().pendingRolls[0].event).toMatchObject({ label: "1к20", total: 17 });
  });
});
