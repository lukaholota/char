import type { DiceRollAction, DiceRollContext } from "@/lib/stores/diceUIStore";
import { GAME_ROLL_LIMITS, type GameRoll } from "@/rules/game-roll";
import type { D20Mode } from "@/rules/dice-roll";
import type { DiceRollOutcome } from "@/lib/components/dice/roll-contexts";

export type GameRollPublication = { label: string; roll: GameRoll; isFromSheet: boolean };

type ActionRequest = { context: DiceRollContext; action: DiceRollAction; d20Mode: D20Mode };

export function buildActionGameRoll({ context, action, d20Mode }: ActionRequest, outcome: DiceRollOutcome): GameRollPublication {
  const isD20 = outcome.d20Mode !== null;
  const roll: GameRoll = {
    d20Mode: outcome.d20Mode,
    modeSources: isD20 && d20Mode !== "NORMAL" && d20Mode === action.mode ? clipList(action.modeSources ?? []) : [],
    groups: [{ sides: action.isD20 ? 20 : action.sides, values: outcome.dieValues }],
    extra: outcome.extraValues.slice(0, GAME_ROLL_LIMITS.extraDice).map((die) => ({ sides: die.sides, sign: die.sign, label: clip(die.label, GAME_ROLL_LIMITS.textItem), value: die.value })),
    bonus: outcome.bonus,
    total: outcome.total,
    check: isD20 && context.check ? { dc: context.check.dc, isSuccess: outcome.total >= context.check.dc } : null,
  };
  return { label: clip(`${context.title} · ${action.label}`, GAME_ROLL_LIMITS.label), roll, isFromSheet: true };
}

export function buildFreeGameRoll(dice: ReadonlyArray<{ sides: number; value: number }>): GameRollPublication | null {
  const groups = groupBySides(dice);
  if (!groups.length) return null;
  const total = dice.reduce((sum, die) => sum + die.value, 0);
  const label = groups.map((group) => `${group.values.length}к${group.sides}`).join(" + ");
  return { label: clip(label, GAME_ROLL_LIMITS.label), roll: { d20Mode: null, modeSources: [], groups, extra: [], bonus: 0, total, check: null }, isFromSheet: false };
}

/// dice-box лічить rollId від нуля після кожного очищення, тож «нові» кубики — ті, яких ще не бачили з останнього очищення.
/// Кубик, докинутий до пулу, публікується сам; новий кидок усього пулу публікує всі кубики заново.
export function takeDiceToPublish<T extends { rollId?: number | string }>(dice: readonly T[], publishedKeys: Set<string>, isAppend: boolean): T[] {
  const fresh = isAppend ? dice.filter((die, index) => !publishedKeys.has(keyOfDie(die, index))) : [...dice];
  if (!isAppend) publishedKeys.clear();
  dice.forEach((die, index) => publishedKeys.add(keyOfDie(die, index)));
  return fresh;
}

function keyOfDie(die: { rollId?: number | string }, index: number): string {
  return die.rollId === undefined || die.rollId === null ? `#${index}` : String(die.rollId);
}

function groupBySides(dice: ReadonlyArray<{ sides: number; value: number }>) {
  const bySides = new Map<number, number[]>();
  for (const die of dice) bySides.set(die.sides, [...(bySides.get(die.sides) ?? []), die.value]);
  return [...bySides.entries()].sort((a, b) => a[0] - b[0]).map(([sides, values]) => ({ sides, values }));
}

function clipList(items: readonly string[]): string[] {
  return items.slice(0, GAME_ROLL_LIMITS.modeSources).map((item) => clip(item, GAME_ROLL_LIMITS.textItem));
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
