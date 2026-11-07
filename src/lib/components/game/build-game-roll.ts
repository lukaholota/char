import type { DiceRollAction, DiceRollContext } from "@/lib/stores/diceUIStore";
import { GAME_ROLL_LIMITS, type GameRoll } from "@/rules/game-roll";
import { findGameRollKind, type GameRollKind } from "@/rules/game-roll-target";
import { findCreatureRollKind, isHealingAction, type HeroRollKind } from "@/rules/game-roll-hero-target";
import { findSpellSaveDamage, type SpellSaveDamage } from "@/rules/creature-save";
import type { RollTargets } from "@/rules/map-target-picks";
import type { SaveSpellRef } from "@/rules/game-roll-saves";
import type { D20Mode } from "@/rules/dice-roll";
import { describeTargetSave, type DiceRollOutcome } from "@/lib/components/dice/roll-contexts";

/// save — шкода з ряткидком (заклинання з листа чи дія статблоку): кімната кидає ряткидки цілей (зони або обраної) замість повної шкоди.
export type PublishedSave = { spell: SaveSpellRef; dc: number } | { spell: null; effect: SpellSaveDamage; dc: number };
export type GameRollPublication = { label: string; roll: GameRoll; isFromSheet: boolean; kind: HeroRollKind | null; save?: PublishedSave; areaTargets?: RollTargets };

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
  const saveText = isD20 || !context.targetSave ? null : describeTargetSave(context.targetSave);
  const labelParts = context.isCreatureRoll ? [context.title, context.subtitle, action.label, saveText] : [context.title, action.label, saveText];
  const kind = findActionRollKind(context, action);
  const save = kind === "damage" ? findPublishedSave(context.targetSave) : undefined;
  return { label: clip(labelParts.filter(Boolean).join(" · "), GAME_ROLL_LIMITS.label), roll, isFromSheet: !context.isCreatureRoll, kind, ...(save ? { save } : {}), ...(save && context.areaTargets ? { areaTargets: context.areaTargets } : {}) };
}

export function findActionRollKind(context: Pick<DiceRollContext, "isCreatureRoll">, action: DiceRollAction): HeroRollKind | null {
  if (context.isCreatureRoll) return findCreatureRollKind(action);
  return findGameRollKind(action) ?? (isHealingAction(action) ? "heal" : null);
}

/// Лікування й ряткидки ворога ціллю не беруть: лоток не має показувати ворога, у якого вони нібито підуть.
export function canRollTakeTarget(context: Pick<DiceRollContext, "isCreatureRoll" | "actions">): boolean {
  return context.actions.some((action) => isEnemyRollKind(findActionRollKind(context, action)));
}

function isEnemyRollKind(kind: HeroRollKind | null): kind is GameRollKind {
  return kind === "attack" || kind === "damage";
}

function findPublishedSave(targetSave: DiceRollContext["targetSave"]): PublishedSave | undefined {
  if (!targetSave) return undefined;
  if (targetSave.spell) return findSpellSaveDamage(targetSave.spell) ? { spell: targetSave.spell, dc: targetSave.dc } : undefined;
  return targetSave.effect ? { spell: null, effect: targetSave.effect, dc: targetSave.dc } : undefined;
}

export function buildFreeGameRoll(dice: ReadonlyArray<{ sides: number; value: number }>): GameRollPublication | null {
  const groups = groupBySides(dice);
  if (!groups.length) return null;
  const total = dice.reduce((sum, die) => sum + die.value, 0);
  const label = groups.map((group) => `${group.values.length}к${group.sides}`).join(" + ");
  return { label: clip(label, GAME_ROLL_LIMITS.label), roll: { d20Mode: null, modeSources: [], groups, extra: [], bonus: 0, total, check: null }, isFromSheet: false, kind: null };
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
