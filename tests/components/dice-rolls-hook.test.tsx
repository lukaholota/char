// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

vi.hoisted(() => {
  const items = new Map<string, string>();
  const storage = { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key) };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true, writable: true });
});
vi.mock("@/lib/monitoring/game-analytics", () => ({ captureGameEvent: vi.fn() }));

const service = vi.hoisted(() => ({
  initialized: true,
  statusListeners: new Set<() => void>(),
  onComplete: null as null | ((result: { notation: string; total: number; rolls: Array<{ sides: number; value: number }> }) => void),
  roll: vi.fn(async () => {}),
  rollMany: vi.fn(async () => {}),
  removeByRollId: vi.fn(async () => {}),
  clear: vi.fn(),
}));

vi.mock("@/lib/components/dice/diceService", () => ({
  diceService: {
    isInitialized: () => service.initialized,
    subscribeStatus: (listener: () => void) => {
      service.statusListeners.add(listener);
      return () => service.statusListeners.delete(listener);
    },
    onRollComplete: (callback: typeof service.onComplete) => {
      service.onComplete = callback;
    },
    roll: service.roll,
    rollMany: service.rollMany,
    removeByRollId: service.removeByRollId,
    clear: service.clear,
  },
}));

import { buildAbilityRollContext, buildSpellRollContext, buildWeaponRollContext } from "@/lib/components/dice/roll-contexts";
import { useDiceRolls } from "@/lib/components/dice/useDiceRolls";
import { resetLiveSession, useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import type { GameSessionView } from "@/server/db/game-sessions";

const settle = (values: number[], sides = 20) =>
  act(() => service.onComplete?.({ notation: "", total: values.reduce((a, b) => a + b, 0), rolls: values.map((value) => ({ sides, value })) }));

beforeEach(() => {
  service.initialized = true;
  service.roll.mockClear();
  service.rollMany.mockClear();
  service.clear.mockClear();
});
afterEach(cleanup);

describe("кидки панелі", () => {
  it("тап по числу кидає одразу: контекст з autoRollKey летить без другого тапу і лише раз", async () => {
    const context = buildAbilityRollContext("Сила", 3, 5, "save");
    const { result, rerender } = renderHook(({ ctx }) => useDiceRolls(true, ctx, true), { initialProps: { ctx: context } });
    expect(service.roll).toHaveBeenCalledWith(1, 20, { append: false });
    expect(result.current.activeActionKey).toBe("save");

    await settle([14]);
    expect(result.current.outcome).toMatchObject({ actionKey: "save", total: 19, baseValue: 14 });

    rerender({ ctx: context });
    expect(service.roll).toHaveBeenCalledTimes(1);
  });

  it("«Зцілення» без кубиків: результат одразу, кубики не летять і старі зі столу зникають", () => {
    const plan = { attack: false, save: null, rollsLater: false, pieces: null, rolls: [{ key: "spell-0", label: "Лікування", count: 0, sides: 0, bonus: 70 }] };
    const heal = buildSpellRollContext({ spellName: "Зцілення", plan, attackBonus: 5, saveDC: 15 });
    const { result } = renderHook(() => useDiceRolls(true, heal, true));
    expect(result.current).toMatchObject({ activeActionKey: "spell-0", isRolling: false, outcome: { total: 70, dieValues: [] } });
    expect(service.roll).not.toHaveBeenCalled();
    expect(service.rollMany).not.toHaveBeenCalled();
    expect(service.clear).toHaveBeenCalled();
  });

  it("новий контекст скидає попередній результат і кидає своє", async () => {
    const first = buildAbilityRollContext("Сила", 3, 5);
    const { result, rerender } = renderHook(({ ctx }) => useDiceRolls(true, ctx, true), { initialProps: { ctx: first } });
    await settle([10]);
    expect(result.current.outcome?.total).toBe(13);

    rerender({ ctx: buildWeaponRollContext({ weaponName: "Меч", attackBonus: 6, damageBonus: 4, damageDice: "1к8" }) });
    expect(result.current.outcome).toBeNull();
    expect(service.roll).toHaveBeenLastCalledWith(1, 20, { append: false });
    expect(result.current.activeActionKey).toBe("attack");
  });

  it("перекид з перевагою кидає два к20 і бере більший", async () => {
    const context = buildAbilityRollContext("Сила", 3, 5);
    const { result } = renderHook(() => useDiceRolls(true, context, true));
    await settle([7]);
    act(() => result.current.rollAction(context.actions[0], "ADVANTAGE"));
    expect(service.roll).toHaveBeenLastCalledWith(2, 20, { append: false });
    expect(result.current.isRolling).toBe(true);
    await settle([4, 17]);
    expect(result.current.isRolling).toBe(false);
    expect(result.current.outcome).toMatchObject({ d20Mode: "ADVANTAGE", baseValue: 17, total: 20 });
  });

  it("кидок чекає, поки кубики завантажаться, і летить сам, щойно готові", () => {
    service.initialized = false;
    const context = buildAbilityRollContext("Сила", 3, 5);
    renderHook(() => useDiceRolls(true, context, true));
    expect(service.roll).not.toHaveBeenCalled();
    service.initialized = true;
    act(() => {
      for (const listener of service.statusListeners) listener();
    });
    expect(service.roll).toHaveBeenCalledTimes(1);
  });

  it("кидок чекає, поки нижній лист сяде на місце, бо resize під час кидка його вбиває", () => {
    const context = buildAbilityRollContext("Сила", 3, 5);
    const { rerender } = renderHook(({ settled }) => useDiceRolls(true, context, settled), { initialProps: { settled: false } });
    expect(service.roll).not.toHaveBeenCalled();
    rerender({ settled: true });
    expect(service.roll).toHaveBeenCalledTimes(1);
  });

  it("вільні кубики: додавання дописує до кидка, сума й групи рахуються з результату", async () => {
    const { result } = renderHook(() => useDiceRolls(true, null, true));
    act(() => result.current.addFreeDie(6));
    expect(service.roll).toHaveBeenLastCalledWith(1, 6, { append: true });
    await settle([3], 6);
    act(() => result.current.addFreeDie(20));
    await act(() => service.onComplete?.({ notation: "", total: 12, rolls: [{ sides: 6, value: 3 }, { sides: 20, value: 9 }] }));
    expect(result.current.pool).toHaveLength(2);
    act(() => result.current.rerollPool());
    expect(service.rollMany).toHaveBeenLastCalledWith(["1d6", "1d20"]);
  });
});

describe("кидок лише майстру", () => {
  const chooseTarget = (visibility: "PUBLIC" | "SECRET") => useGameSessionStore.setState({ visibilityBySession: { 1: visibility } });
  const isHidden = () => useDiceUIStore.getState().areResultsHidden;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
    useGameSessionStore.setState({ active: { id: 1, name: "Кімната" }, visibilityBySession: {} });
    resetLiveSession(1);
    useGameSessionLiveStore.setState({ view: { id: 1, myUserId: 7, myRole: "PLAYER", members: [], creatures: [] } as unknown as GameSessionView });
  });
  afterEach(() => {
    useGameSessionStore.setState({ active: null, visibilityBySession: {} });
    useDiceUIStore.getState().close();
    resetLiveSession(null);
    vi.unstubAllGlobals();
  });

  it("лишається прихованим, коли гравець потім перемикає кидки на «Усім»; відкриває стіл лише відкритий перекид", async () => {
    const { result } = renderHook(() => useDiceRolls(true, null, true));
    chooseTarget("SECRET");
    act(() => result.current.addFreeDie(20));
    await settle([17]);
    chooseTarget("PUBLIC");
    expect(isHidden()).toBe(true);

    act(() => result.current.addFreeDie(20));
    expect(isHidden()).toBe(true);

    act(() => result.current.rerollPool());
    expect(isHidden()).toBe(false);
  });

  it("не ховає відкритий кидок, коли гравець потім обирає «Лише майстру»", async () => {
    const { result } = renderHook(() => useDiceRolls(true, null, true));
    chooseTarget("PUBLIC");
    act(() => result.current.addFreeDie(20));
    await settle([17]);
    chooseTarget("SECRET");
    expect(isHidden()).toBe(false);
  });
});
