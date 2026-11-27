// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

vi.hoisted(() => {
  const items = new Map<string, string>();
  const storage = { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key) };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true, writable: true });
});

import { buildWeaponRollContext, type DiceRollOutcome } from "@/lib/components/dice/roll-contexts";
import { buildCriticalDamageAction, pickDamageAfterAttack, useAutoDamageAfterAttack, useCloseTrayAfterDamage } from "@/lib/components/dice/useAutoDamage";
import { clearRollVerdict, settleRollVerdict, watchRollVerdict } from "@/lib/components/game/roll-verdict";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import type { GameRollEventView } from "@/server/db/game-roll-events";

const sword = buildWeaponRollContext({ weaponName: "Меч", attackBonus: 5, damageBonus: 3, damageDice: "1к8+1к6", damageExtraDice: [{ sides: 4, sign: -1, label: "Слабкість" }] });
const [attackAction, damageAction] = sword.actions;
const attackOutcome = (baseValue: number): DiceRollOutcome => ({ actionKey: "attack", label: "Атака", bonus: 5, d20Mode: "NORMAL", mainDiceCount: 1, extraDice: [], dieValues: [baseValue], extraValues: [], baseValue, total: baseValue + 5 });
const damageOutcome: DiceRollOutcome = { actionKey: "damage", label: "Шкода", bonus: 3, d20Mode: null, mainDiceCount: 1, extraDice: [], dieValues: [6], extraValues: [], baseValue: 6, total: 9 };
const verdict = (isHit: boolean | null) => ({ target: { name: "Гоблін", kind: "attack", isHit } }) as unknown as GameRollEventView;

describe("шкода після атаки", () => {
  it("на натуральній 20 подвоює кубики шкоди, але не бонус і не штрафні кубики", () => {
    const critical = buildCriticalDamageAction(damageAction);
    expect(critical).toMatchObject({ label: "Шкода", count: 2, sides: 8, bonus: 3 });
    expect(critical.key).not.toBe(damageAction.key);
    expect(critical.extraDice?.map((die) => `${die.sign}к${die.sides}`)).toEqual(["1к6", "-1к4", "1к6"]);
  });

  it("натуральна 1 шкоди не кидає, звичайне влучання кидає саму дію шкоди", () => {
    expect(pickDamageAfterAttack(sword, attackOutcome(1))).toBeNull();
    expect(pickDamageAfterAttack(sword, attackOutcome(12))).toBe(damageAction);
    expect(pickDamageAfterAttack(sword, attackOutcome(20))?.count).toBe(2);
  });
});

describe("лоток у кімнаті", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameSessionStore.setState({ active: { id: 1, name: "Кімната" }, isDamageAutoRolled: true });
    clearRollVerdict();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useGameSessionStore.setState({ active: null });
  });

  const renderAttack = (baseValue: number) => {
    const rollDamage = vi.fn();
    renderHook(() => useAutoDamageAfterAttack({ context: sword, activeAction: attackAction, outcome: attackOutcome(baseValue), isRolling: false }, rollDamage));
    return rollDamage;
  };

  it("кидає шкоду, щойно кімната підтвердила влучання", async () => {
    watchRollVerdict("hit");
    const rollDamage = renderAttack(14);
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(rollDamage).not.toHaveBeenCalled();
    settleRollVerdict("hit", verdict(true));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(rollDamage).toHaveBeenCalledWith(damageAction);
  });

  it("промах, мовчання кімнати чи вимкнений перемикач шкоди не кидають", async () => {
    watchRollVerdict("miss");
    const onMiss = renderAttack(14);
    settleRollVerdict("miss", verdict(false));
    watchRollVerdict("silent");
    const onSilence = renderAttack(15);
    await act(() => vi.advanceTimersByTimeAsync(5000));
    useGameSessionStore.setState({ isDamageAutoRolled: false });
    clearRollVerdict();
    const whenOff = renderAttack(16);
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect([onMiss, onSilence, whenOff].map((roll) => roll.mock.calls.length)).toEqual([0, 0, 0]);
  });

  it("без цілі кидає шкоду після паузи, щоб гравець побачив атаку", async () => {
    const rollDamage = renderAttack(9);
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(rollDamage).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(rollDamage).toHaveBeenCalledTimes(1);
  });

  it("закриває лоток після шкоди, але не тоді, коли гравець торкнувся лотка", async () => {
    const close = vi.fn();
    useDiceUIStore.setState({ close });
    const tray = document.createElement("section");
    tray.setAttribute("data-dice-tray", "");
    document.body.append(tray);
    const { rerender } = renderHook(({ outcome }) => useCloseTrayAfterDamage({ context: sword, activeAction: damageAction, outcome, isRolling: false }), { initialProps: { outcome: damageOutcome } });
    await act(() => vi.advanceTimersByTimeAsync(2600));
    expect(close).toHaveBeenCalledTimes(1);
    rerender({ outcome: { ...damageOutcome, total: 10 } });
    tray.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(close).toHaveBeenCalledTimes(1);
    tray.remove();
  });
});
