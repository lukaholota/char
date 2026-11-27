"use client";

import { useEffect, useRef } from "react";
import { useDiceUIStore, type DiceRollAction, type DiceRollContext } from "@/lib/stores/diceUIStore";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import { findActionRollKind } from "@/lib/components/game/build-game-roll";
import { useRollVerdictStore, waitForRollVerdict } from "@/lib/components/game/roll-verdict";
import type { GameRollEventView } from "@/server/db/game-roll-events";
import type { DiceRollOutcome } from "./roll-contexts";

const SHOW_ATTACK_MS = 900;
const CLOSE_TRAY_MS = 2500;
const CRITICAL_KEY_SUFFIX = "-critical";

export function findDamageAction(context: DiceRollContext): DiceRollAction | null {
  return context.actions.find((action) => !action.targetSave && findActionRollKind(context, action) === "damage") ?? null;
}

export function isAttackWithDamage(context: DiceRollContext): boolean {
  return context.actions.some((action) => findActionRollKind(context, action) === "attack") && findDamageAction(context) !== null;
}

/// Атака, яку можна кинути без лотка; ланцюжок цілей лишає лоток.
export function isAutoRolledAttack(context: DiceRollContext): boolean {
  const action = context.actions.find((candidate) => candidate.key === context.autoRollKey);
  return !context.next && action !== undefined && findActionRollKind(context, action) === "attack";
}

/// Критичне влучання подвоює кожен кубик шкоди, а не пласкі бонуси.
export function buildCriticalDamageAction(action: DiceRollAction): DiceRollAction {
  const extraDice = action.extraDice ?? [];
  return {
    ...action,
    key: `${action.key}${CRITICAL_KEY_SUFFIX}`,
    count: action.count * 2,
    ...(action.secondDice ? { secondDice: { ...action.secondDice, count: action.secondDice.count * 2 } } : {}),
    extraDice: [...extraDice, ...extraDice.filter((die) => die.sign > 0)],
  };
}

/// Шкода після атаки: null — не кидати (натуральна 1), інакше звичайна чи критична дія.
export function pickDamageAfterAttack(context: DiceRollContext, attack: DiceRollOutcome): DiceRollAction | null {
  const damage = findDamageAction(context);
  if (!damage || !attack.d20Mode || attack.baseValue === 1) return null;
  return attack.baseValue === 20 ? buildCriticalDamageAction(damage) : damage;
}

export function isMissVerdict(event: Pick<GameRollEventView, "target" | "heroTarget">): boolean {
  const target = event.target ?? event.heroTarget;
  return target?.kind === "attack" && target.isHit === false;
}

type PanelRoll = { context: DiceRollContext; activeAction: DiceRollAction; outcome: DiceRollOutcome | null; isRolling: boolean };

/// Після влучання в кімнаті шкода кидається сама; промах, натуральна 1 чи мовчання кімнати — ні.
export function useAutoDamageAfterAttack({ context, activeAction, outcome, isRolling }: PanelRoll, rollDamage: (action: DiceRollAction) => void, isAuto: boolean) {
  const rollDamageRef = useRef(rollDamage);
  rollDamageRef.current = rollDamage;
  const handledRef = useRef<DiceRollOutcome | null>(null);

  useEffect(() => {
    if (!isAuto || isRolling || !outcome || handledRef.current === outcome || !useGameSessionStore.getState().active) return;
    if (findActionRollKind(context, activeAction) !== "attack") return;
    handledRef.current = outcome;
    const damage = pickDamageAfterAttack(context, outcome);
    if (!damage) return;
    let isCancelled = false;
    void Promise.all([waitForAttackHit(useRollVerdictStore.getState().key), wait(SHOW_ATTACK_MS)]).then(([isHit]) => {
      if (isHit && !isCancelled) rollDamageRef.current(damage);
    });
    return () => {
      isCancelled = true;
    };
  }, [isAuto, context, activeAction, outcome, isRolling]);
}

/// Кидок без цілі вердикту не чекає; без відповіді кімнати шкода не йде, щоб не влучити по тому, хто ухилився.
async function waitForAttackHit(verdictKey: string | null): Promise<boolean> {
  if (verdictKey === null) return true;
  const event = await waitForRollVerdict(verdictKey);
  return event !== null && !isMissVerdict(event);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/// Лоток зникає після шкоди в кімнаті — результат уже в журналі; дотик до лотка лишає його відкритим.
export function useCloseTrayAfterDamage({ context, activeAction, outcome, isRolling }: PanelRoll) {
  useEffect(() => {
    if (isRolling || !outcome || context.next || !useGameSessionStore.getState().active) return;
    if (findActionRollKind(context, activeAction) !== "damage") return;
    return closeTrayUnlessTouched();
  }, [context, activeAction, outcome, isRolling]);
}

function closeTrayUnlessTouched(): () => void {
  const keepOpen = (event: PointerEvent) => {
    if (event.target instanceof Element && event.target.closest("[data-dice-tray]")) stop();
  };
  const timer = setTimeout(() => {
    stop();
    useDiceUIStore.getState().close();
  }, CLOSE_TRAY_MS);
  const stop = () => {
    clearTimeout(timer);
    document.removeEventListener("pointerdown", keepOpen, true);
  };
  document.addEventListener("pointerdown", keepOpen, true);
  return stop;
}
