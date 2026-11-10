// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { GameRoll } from "@/rules/game-roll";
import type { GameRollEventView } from "@/server/db/game-roll-events";
import type { GameSessionView } from "@/server/db/game-sessions";

vi.hoisted(() => {
  const items = new Map<string, string>();
  const storage = { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key) };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true, writable: true });
});
vi.mock("@/lib/actions/game-sessions", () => ({ undoRollDamageAction: vi.fn(), undoSaveDamageAction: vi.fn() }));
vi.mock("@/lib/monitoring/game-analytics", () => ({ captureGameEvent: vi.fn() }));
vi.mock("@/lib/components/game/play-roll-chime", () => ({ playRollChime: vi.fn() }));

import { GameRollEntry } from "@/components/games/GameRollEntry";
import { GameRollTargetBar } from "@/components/games/GameRollTargetBar";
import { useRoomTabStore } from "@/components/games/room-tabs";
import { readOutbox } from "@/lib/components/game/game-roll-outbox";
import { captureGameRollTarget, publishGameRoll } from "@/lib/components/game/game-roll-publisher";
import { addGameEvents, resetLiveSession, useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { useHeroDamageRequests, useHeroDamageStore, type HeroDamageRequest } from "@/lib/components/game/hero-damage";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";

const damageRoll: GameRoll = { d20Mode: null, modeSources: [], groups: [{ sides: 8, values: [6] }], extra: [], bonus: 0, total: 6, check: null };
const attackRoll: GameRoll = { d20Mode: "NORMAL", modeSources: [], groups: [{ sides: 20, values: [11] }], extra: [], bonus: 4, total: 15, check: null };
const member = (userId: number, role: "GM" | "PLAYER", persId: number | null, persName: string | null) => ({ heroId: userId, heroSlot: 0, userId, name: `Гравець ${userId}`, role, persId, persName, avatarUrl: null });

function enterRoom({ myRole, myPersId }: { myRole: "GM" | "PLAYER"; myPersId: number | null }) {
  useGameSessionStore.setState({ active: { id: 1, name: "Кімната" }, visibilityBySession: {}, targetCreatureBySession: {}, targetHeroBySession: {} });
  resetLiveSession(1);
  const myUserId = myRole === "GM" ? 1 : 7;
  const members = [member(1, "GM", null, null), member(7, "PLAYER", 5, "Пивослав"), member(8, "PLAYER", 6, "Ельза")];
  useGameSessionLiveStore.setState({ view: { id: 1, name: "Кімната", myUserId, myRole, myPersId, myPersIds: myPersId === null ? [] : [myPersId], members, creatures: [], combat: null } as unknown as GameSessionView });
}

const heroEvent = (roll: GameRoll, heroTarget: GameRollEventView["heroTarget"]): GameRollEventView => ({
  seq: 4, authorUserId: 1, authorName: "Майстер", persName: null, avatarUrl: null, source: "FREE", visibility: "PUBLIC", label: "Гоблін · Скімітар", roll, total: roll.total,
  rolledAt: "2026-11-07T10:00:00.000Z", createdAt: "2026-11-07T10:00:00.000Z", target: null, saves: null, heroTarget,
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
  useHeroDamageStore.setState({ requests: [] });
  useRoomTabStore.setState({ tab: "map", sideTab: null, isSideFolded: false });
});
afterEach(() => {
  cleanup();
  resetLiveSession(null);
  vi.unstubAllGlobals();
});

describe("майстер цілиться в героя", () => {
  it("обраний герой їде в кидок зі статблоку; повторний тап знімає ціль", () => {
    enterRoom({ myRole: "GM", myPersId: null });
    render(<GameRollTargetBar isSheetRoll isCreatureRoll />);
    fireEvent.click(screen.getByRole("button", { name: "Пивослав" }));
    expect(screen.getByRole("button", { name: "Пивослав" }).getAttribute("aria-pressed")).toBe("true");
    publishGameRoll(captureGameRollTarget("free")!, { label: "Гоблін · Шкода", roll: damageRoll, isFromSheet: false, kind: "damage" });
    expect(readOutbox(window.localStorage).at(-1)!.draft.heroTarget).toEqual({ persId: 5, kind: "damage" });
    publishGameRoll(captureGameRollTarget("free")!, { label: "1к6", roll: damageRoll, isFromSheet: false, kind: null });
    expect(readOutbox(window.localStorage).at(-1)!.draft.heroTarget).toBeUndefined();
    fireEvent.click(screen.getByRole("button", { name: "Пивослав" }));
    expect(captureGameRollTarget("free")!.heroPersId).toBeNull();
  });

  it("гравець вибору героя не бачить і героя в кидок не кладе", () => {
    enterRoom({ myRole: "PLAYER", myPersId: 5 });
    useGameSessionStore.getState().setHeroTarget(1, 6);
    render(<GameRollTargetBar isSheetRoll isCreatureRoll />);
    expect(screen.queryByRole("button", { name: "Ельза" })).toBeNull();
    expect(captureGameRollTarget("free")!.heroPersId).toBeNull();
  });
});

describe("удар по герою в журналі", () => {
  it("гравець героя знімає шкоду з листа одним тапом і переходить на лист", () => {
    enterRoom({ myRole: "PLAYER", myPersId: 5 });
    render(<ol><GameRollEntry event={heroEvent(damageRoll, { persId: 5, name: "Пивослав", kind: "damage", damage: 6, isHit: null, armorClass: null })} isMine={false} isNew={false} /></ol>);
    expect(screen.getByText("→ Пивослав")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Зняти 6 хітів з листа" }));
    expect(useHeroDamageStore.getState().requests).toEqual([{ persId: 5, amount: 6, operationId: "game-hit-1-4" }]);
    expect(useRoomTabStore.getState().tab).toBe("hero");
    expect((screen.getByRole("button", { name: "Знято 6 з листа" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("інші бачать удар без кнопки; атака підказує власникові порівняти з КЗ", () => {
    enterRoom({ myRole: "PLAYER", myPersId: 6 });
    const { unmount } = render(<ol><GameRollEntry event={heroEvent(damageRoll, { persId: 5, name: "Пивослав", kind: "damage", damage: 6, isHit: null, armorClass: null })} isMine={false} isNew={false} /></ol>);
    expect(screen.getByText("· −6")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Зняти/ })).toBeNull();
    unmount();
    enterRoom({ myRole: "PLAYER", myPersId: 5 });
    render(<ol><GameRollEntry event={heroEvent(attackRoll, { persId: 5, name: "Пивослав", kind: "attack", damage: null, isHit: null, armorClass: null })} isMine={false} isNew={false} /></ol>);
    expect(screen.getByText("Влучає, якщо ваш КЗ 15 або менше")).toBeTruthy();
  });

  it("кімната порівнює атаку з КЗ героя: усі бачать влучання чи промах, КЗ — лише майстер", () => {
    enterRoom({ myRole: "PLAYER", myPersId: 5 });
    const { unmount } = render(<ol><GameRollEntry event={heroEvent(attackRoll, { persId: 5, name: "Пивослав", kind: "attack", damage: null, isHit: true, armorClass: null })} isMine={false} isNew={false} /></ol>);
    expect(screen.getByText("влучання")).toBeTruthy();
    expect(screen.queryByText(/КЗ/)).toBeNull();
    unmount();
    enterRoom({ myRole: "GM", myPersId: null });
    render(<ol><GameRollEntry event={heroEvent(attackRoll, { persId: 5, name: "Пивослав", kind: "attack", damage: null, isHit: false, armorClass: 16 })} isMine isNew={false} /></ol>);
    expect(screen.getByText("промах")).toBeTruthy();
    expect(screen.getByText("КЗ 16")).toBeTruthy();
  });
});

describe("кімната сама знімає хіти з листа", () => {
  const appliedHit = (seq: number) => ({ ...heroEvent(damageRoll, { persId: 5, name: "Пивослав", kind: "damage", damage: 6, isHit: null, armorClass: null, isAppliedToSheet: true }), seq });

  it("власник бачить, що хіти вже знято, без кнопки", () => {
    enterRoom({ myRole: "PLAYER", myPersId: 5 });
    render(<ol><GameRollEntry event={appliedHit(40)} isMine={false} isNew={false} /></ol>);
    expect(screen.getByText("Знято 6 хітів з вашого листа")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Зняти/ })).toBeNull();
  });

  it("новий удар по моєму герою просить лист оновитися рівно раз; старі події й чужі герої — ні", () => {
    enterRoom({ myRole: "PLAYER", myPersId: 5 });
    useHeroDamageStore.setState({ requests: [] });
    addGameEvents(1, [appliedHit(41)]);
    useGameSessionLiveStore.setState({ liveFromSeq: 41 });
    addGameEvents(1, [appliedHit(41), { ...appliedHit(43), heroTarget: { ...appliedHit(43).heroTarget!, persId: 6 } }]);
    addGameEvents(1, [appliedHit(42)]);
    addGameEvents(1, [appliedHit(42)]);
    expect(useHeroDamageStore.getState().requests).toEqual([{ persId: 5, amount: 6, operationId: "game-hit-1-42", isAppliedOnServer: true, isHealing: false }]);
  });
});

describe("лист героя бере удар", () => {
  function Sheet({ persId, isEnabled, takeDamage }: { persId: number; isEnabled: boolean; takeDamage: (request: HeroDamageRequest) => void }) {
    useHeroDamageRequests(persId, isEnabled, takeDamage);
    return null;
  }

  it("знімає кожен запит свого героя рівно раз, чужий і лист лише для читання не чіпає", () => {
    const takeDamage = vi.fn();
    useHeroDamageStore.setState({ requests: [{ persId: 5, amount: 6, operationId: "game-hit-1-4" }, { persId: 9, amount: 2, operationId: "game-hit-1-5" }] });
    const { rerender } = render(<Sheet persId={5} isEnabled={false} takeDamage={takeDamage} />);
    expect(takeDamage).not.toHaveBeenCalled();
    rerender(<Sheet persId={5} isEnabled takeDamage={takeDamage} />);
    rerender(<Sheet persId={5} isEnabled takeDamage={vi.fn()} />);
    expect(takeDamage).toHaveBeenCalledTimes(1);
    expect(takeDamage).toHaveBeenCalledWith({ persId: 5, amount: 6, operationId: "game-hit-1-4" });
    expect(useHeroDamageStore.getState().requests).toEqual([{ persId: 9, amount: 2, operationId: "game-hit-1-5" }]);
  });
});
