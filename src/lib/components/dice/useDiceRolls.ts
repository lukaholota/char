"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useDiceUIStore, type DiceRollAction, type DiceRollContext } from "@/lib/stores/diceUIStore";
import { countD20Dice, type D20Mode } from "@/rules/dice-roll";
import { diceService } from "./diceService";
import { rollAfterHeldTrayResize } from "./dice-tray-layout";
import { buildRollOutcome, listRollNotations, type DiceRollOutcome, type PendingRollMeta } from "./roll-contexts";
import { buildActionGameRoll, buildFreeGameRoll, takeDiceToPublish } from "@/lib/components/game/build-game-roll";
import { announceGameRollStart, captureGameRollTarget, publishGameRoll, settleGameRollStart, type GameRollTarget } from "@/lib/components/game/game-roll-publisher";

export type PoolDie = { sides: number; value: number; rollId?: number | string };

const SETTLE_GUARD_MS = 10000;

type PendingPublication =
  | { kind: "action"; target: GameRollTarget | null; context: DiceRollContext; action: DiceRollAction; d20Mode: D20Mode }
  | { kind: "append" | "reroll"; target: GameRollTarget | null };

export function useDiceRolls(isOpen: boolean, rollContext: DiceRollContext | null, isLayoutSettled: boolean) {
  const isServiceReady = useSyncExternalStore(subscribeToDiceService, readIsDiceServiceReady, readIsDiceServiceReadyOnServer);
  const isReady = isServiceReady && isLayoutSettled;
  const [isRolling, setIsRolling] = useState(false);
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<DiceRollOutcome | null>(null);
  const [pool, setPool] = useState<PoolDie[]>([]);
  const isOpenRef = useRef(isOpen);
  const pendingMetaRef = useRef<PendingRollMeta | null>(null);
  const pendingPublicationRef = useRef<PendingPublication | null>(null);
  const publishedDiceRef = useRef(new Set<string>());
  const rollContextRef = useRef(rollContext);
  rollContextRef.current = rollContext;
  const settleGuardRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const clearSettleGuard = useCallback(() => {
    if (settleGuardRef.current) clearTimeout(settleGuardRef.current);
    settleGuardRef.current = null;
  }, []);

  const startRolling = useCallback(() => {
    setIsRolling(true);
    clearSettleGuard();
    settleGuardRef.current = setTimeout(() => setIsRolling(false), SETTLE_GUARD_MS);
  }, [clearSettleGuard]);

  const reset = useCallback(() => {
    pendingMetaRef.current = null;
    pendingPublicationRef.current = null;
    publishedDiceRef.current.clear();
    clearSettleGuard();
    setIsRolling(false);
    setActiveActionKey(null);
    setOutcome(null);
    setPool([]);
    useDiceUIStore.getState().setResultsHidden(false);
    diceService.clear();
  }, [clearSettleGuard]);

  useEffect(() => {
    diceService.onRollComplete((result) => {
      clearSettleGuard();
      setIsRolling(false);
      if (!isOpenRef.current) return;
      const pending = pendingMetaRef.current;
      pendingMetaRef.current = null;
      setPool(result.rolls);
      const next = pending ? buildRollOutcome(pending, result.rolls.map((roll) => roll.value)) : null;
      setOutcome(next);
      publishCompletedRoll(pendingPublicationRef.current, next, result.rolls, publishedDiceRef.current);
      pendingPublicationRef.current = null;
      const check = rollContextRef.current?.check;
      if (next?.d20Mode && check) check.onResult(next.total >= check.dc);
    });
  }, [clearSettleGuard]);

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  const rollAction = useCallback(
    (action: DiceRollAction, d20Mode: D20Mode) => {
      if (!isReady) return;
      pendingMetaRef.current = {
        actionKey: action.key,
        label: action.label,
        bonus: action.bonus,
        d20Mode: action.isD20 ? d20Mode : null,
        mainDiceCount: action.isD20 ? countD20Dice(d20Mode) : action.count,
        extraDice: action.extraDice ?? [],
      };
      const context = rollContextRef.current;
      holdPublication(pendingPublicationRef, context ? { kind: "action", target: captureGameRollTarget(context.isCreatureRoll ? "free" : "sheet", context.rollTarget), context, action, d20Mode } : null);
      setActiveActionKey(action.key);
      startRolling();
      const notations = listRollNotations(action, d20Mode);
      rollAfterHeldTrayResize(() => {
        if (notations.length > 1) void diceService.rollMany(notations);
        else void diceService.roll(action.isD20 ? countD20Dice(d20Mode) : action.count, action.sides, { append: false });
      });
    },
    [isReady, startRolling],
  );

  useAutoRoll(rollContext, isReady, reset, rollAction);

  const addFreeDie = useCallback(
    (sides: number) => {
      if (!isReady) return;
      pendingMetaRef.current = null;
      holdPublication(pendingPublicationRef, { kind: "append", target: captureGameRollTarget("pool") }, pool.length > 0);
      startRolling();
      rollAfterHeldTrayResize(() => {
        void diceService.roll(1, sides, { append: true });
      });
    },
    [isReady, pool.length, startRolling],
  );

  const removeFreeDie = useCallback((sides: number) => {
    setPool((previous) => {
      const index = previous.findIndex((die) => die.sides === sides);
      if (index === -1) return previous;
      const target = previous[index];
      if (target.rollId !== undefined && target.rollId !== null) void diceService.removeByRollId(target.rollId);
      return previous.filter((_, position) => position !== index);
    });
  }, []);

  const rerollPool = useCallback(() => {
    if (!isReady || !pool.length) return;
    pendingMetaRef.current = null;
    holdPublication(pendingPublicationRef, { kind: "reroll", target: captureGameRollTarget("pool") });
    startRolling();
    const notations = describePoolNotations(pool);
    rollAfterHeldTrayResize(() => {
      void diceService.rollMany(notations);
    });
  }, [isReady, pool, startRolling]);

  const clearPool = useCallback(() => {
    publishedDiceRef.current.clear();
    setPool([]);
    useDiceUIStore.getState().setResultsHidden(false);
    diceService.clear();
  }, []);

  return { isReady, isRolling, activeActionKey, outcome, pool, rollAction, addFreeDie, removeFreeDie, rerollPool, clearPool };
}

function holdPublication(ref: { current: PendingPublication | null }, publication: PendingPublication | null, isAddingToTable = false) {
  ref.current = publication;
  hideResultsOfSecretRoll(publication?.target?.visibility === "SECRET", isAddingToTable);
  if (publication?.target) announceGameRollStart(publication.target);
}

/// Докинутий відкрито кубик не відкриває стіл: сума показала б і секретні кубики під ним.
function hideResultsOfSecretRoll(isSecret: boolean, isAddingToTable: boolean) {
  const { areResultsHidden, setResultsHidden } = useDiceUIStore.getState();
  setResultsHidden(isSecret || (isAddingToTable && areResultsHidden));
}

/// Кожен кубик іде в журнал рівно раз: дія й перекид публікують увесь стіл, докинутий кубик — лише себе.
function publishCompletedRoll(pending: PendingPublication | null, outcome: DiceRollOutcome | null, dice: PoolDie[], publishedDice: Set<string>) {
  const fresh = takeDiceToPublish(dice, publishedDice, pending?.kind === "append");
  if (!pending?.target) return;
  const publication = pending.kind === "action" ? (outcome ? buildActionGameRoll(pending, outcome) : null) : buildFreeGameRoll(fresh);
  if (publication) publishGameRoll(pending.target, publication);
  else settleGameRollStart(pending.target);
}

const subscribeToDiceService = (listener: () => void) => diceService.subscribeStatus(listener);
const readIsDiceServiceReady = () => diceService.isInitialized();
const readIsDiceServiceReadyOnServer = () => false;

function useAutoRoll(
  rollContext: DiceRollContext | null,
  isReady: boolean,
  reset: () => void,
  rollAction: (action: DiceRollAction, d20Mode: D20Mode) => void,
) {
  const seenContextRef = useRef(rollContext);
  const autoRolledContextRef = useRef<DiceRollContext | null>(null);

  useEffect(() => {
    if (seenContextRef.current !== rollContext) {
      seenContextRef.current = rollContext;
      reset();
    }
    if (!rollContext?.autoRollKey || !isReady || autoRolledContextRef.current === rollContext) return;
    const action = rollContext.actions.find((candidate) => candidate.key === rollContext.autoRollKey);
    if (!action) return;
    autoRolledContextRef.current = rollContext;
    rollAction(action, action.mode ?? "NORMAL");
  }, [rollContext, isReady, reset, rollAction]);
}

export function groupPool(pool: PoolDie[]): Array<{ sides: number; values: number[] }> {
  const bySides = new Map<number, number[]>();
  for (const die of pool) {
    const sides = Math.trunc(Number(die.sides));
    if (!Number.isFinite(sides) || sides <= 0) continue;
    bySides.set(sides, [...(bySides.get(sides) ?? []), die.value]);
  }
  return Array.from(bySides.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([sides, values]) => ({ sides, values }));
}

export function describePoolNotations(pool: PoolDie[]): string[] {
  return groupPool(pool).map(({ sides, values }) => `${values.length}d${sides}`);
}

export function sumPool(pool: PoolDie[]): number {
  return pool.reduce((sum, die) => sum + die.value, 0);
}
