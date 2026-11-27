"use client";

import { toast } from "sonner";
import { useDiceUIStore, type DiceRollAction, type DiceRollContext } from "@/lib/stores/diceUIStore";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import { rollFallbackDice } from "@/lib/components/dice/dice-fallback";
import { buildPendingRollMeta, buildRollOutcome, isFlatAction, listRollNotations, type DiceRollOutcome } from "@/lib/components/dice/roll-contexts";
import { isAutoRolledAttack, isMissVerdict, pickDamageAfterAttack } from "@/lib/components/dice/useAutoDamage";
import { readRollPreferences } from "@/lib/components/dice/useRollPreferences";
import { buildActionGameRoll } from "./build-game-roll";
import { captureGameRollTarget, publishGameRoll, type GameRollTarget } from "./game-roll-publisher";
import { buildRollVerdict, useRollVerdictStore, waitForRollVerdict } from "./roll-verdict";

const RESULT_TOAST_MS = 6000;
const DAMAGE_OFFER_MS = 20_000;

type QuietRoll = { outcome: DiceRollOutcome; verdictKey: string | null };

let quietRollCount = 0;

/// Гравець вимкнув вікно атаки: атака одразу летить у кімнату, а результат приходить сповіщенням.
export function openRollOrRollQuietly(context: DiceRollContext) {
  const attack = findQuietAttack(context);
  const target = attack && captureRollTarget(context);
  if (attack && target) void rollAttackQuietly(context, attack, target);
  else useDiceUIStore.getState().openRoll(context);
}

function findQuietAttack(context: DiceRollContext): DiceRollAction | null {
  if (!useGameSessionStore.getState().active || readRollPreferences().isAttackTrayShown || !isAutoRolledAttack(context)) return null;
  return context.actions.find((action) => action.key === context.autoRollKey) ?? null;
}

function captureRollTarget(context: DiceRollContext): GameRollTarget | null {
  return captureGameRollTarget(context.isCreatureRoll ? "free" : "sheet", context.rollTarget, context.fromCreatureId);
}

async function rollAttackQuietly(context: DiceRollContext, attack: DiceRollAction, target: GameRollTarget) {
  const toastId = `quiet-roll-${++quietRollCount}`;
  const { outcome, verdictKey } = rollQuietly(context, attack, target);
  if (target.visibility === "SECRET") return rollSecretAttackQuietly(context, outcome, verdictKey, toastId);
  const attackLine = describeAttack(outcome);
  toast(context.title, { id: toastId, description: attackLine, duration: RESULT_TOAST_MS });
  const verdict = verdictKey === null ? null : await waitForRollVerdict(verdictKey);
  const summary = [attackLine, verdict && buildRollVerdict(verdict)?.text].filter(Boolean).join(" · ");
  const damage = pickDamageAfterAttack(context, outcome);
  if (!damage || (verdict !== null && isMissVerdict(verdict))) return void toast(context.title, { id: toastId, description: summary, duration: RESULT_TOAST_MS });
  const isHit = verdictKey === null || verdict !== null;
  if (isHit && readRollPreferences().isDamageAutoRolled) return rollDamageQuietly(context, damage, toastId, attackLine);
  toast(context.title, {
    id: toastId,
    description: summary,
    duration: DAMAGE_OFFER_MS,
    action: { label: outcome.baseValue === 20 ? "Кинути критичну шкоду" : "Кинути шкоду", onClick: () => void rollDamageQuietly(context, damage, toastId, attackLine) },
  });
}

/// Влучання таємного кидка гравцеві не видно, тож шкода йде сама, як у лотку, а вирішує майстер.
async function rollSecretAttackQuietly(context: DiceRollContext, outcome: DiceRollOutcome, verdictKey: string | null, toastId: string) {
  toast(context.title, { id: toastId, description: "Атаку кинуто — результат бачить лише майстер", duration: RESULT_TOAST_MS });
  const damage = pickDamageAfterAttack(context, outcome);
  if (!damage || !readRollPreferences().isDamageAutoRolled) return;
  if (verdictKey !== null && !(await waitForRollVerdict(verdictKey))) return;
  const target = captureRollTarget(context);
  if (!target) return;
  rollQuietly(context, damage, target);
  toast(context.title, { id: toastId, description: "Атаку й шкоду кинуто — результат бачить лише майстер", duration: RESULT_TOAST_MS });
}

async function rollDamageQuietly(context: DiceRollContext, damage: DiceRollAction, toastId: string, attackLine: string) {
  const target = captureRollTarget(context);
  if (!target) return;
  const { outcome, verdictKey } = rollQuietly(context, damage, target);
  const lines = [attackLine, `шкода ${outcome.total}`];
  toast(context.title, { id: toastId, description: lines.join(" · "), duration: RESULT_TOAST_MS });
  const verdict = verdictKey === null ? null : await waitForRollVerdict(verdictKey);
  const verdictText = verdict && buildRollVerdict(verdict)?.text;
  if (verdictText) toast(context.title, { id: toastId, description: [...lines, verdictText].join(" · "), duration: RESULT_TOAST_MS });
}

function rollQuietly(context: DiceRollContext, action: DiceRollAction, target: GameRollTarget): QuietRoll {
  const d20Mode = action.mode ?? "NORMAL";
  const meta = buildPendingRollMeta(action, d20Mode);
  const outcome = isFlatAction(action) ? buildRollOutcome({ ...meta, extraDice: [] }, []) : buildRollOutcome(meta, rollFallbackDice(listRollNotations(action, d20Mode), 0).map((die) => die.value));
  publishGameRoll(target, buildActionGameRoll({ context, action, d20Mode }, outcome));
  return { outcome, verdictKey: useRollVerdictStore.getState().key };
}

function describeAttack(outcome: DiceRollOutcome): string {
  const natural = outcome.baseValue === 20 ? " (натуральна 20)" : outcome.baseValue === 1 ? " (натуральна 1)" : "";
  return `Атака ${outcome.total}${natural}`;
}
