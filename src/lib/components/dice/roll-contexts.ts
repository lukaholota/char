import type { DiceRollAction, DiceRollContext, ExtraDie, RollStateView } from "@/lib/stores/diceUIStore";
import type { SaveSpellRef } from "@/rules/game-roll-saves";
import { parseDiceNotation, pickD20Value, type D20Mode } from "@/rules/dice-roll";
import type { CreatureSaveAction } from "@/rules/creature-area-action";
import type { CreatureRoll } from "@/rules/creature-rolls";
import { AREA_SHAPE_LABELS } from "@/rules/game-areas";
import type { SpellRollPlan } from "@/rules/spell-dice";
import type { AbilityKey } from "@/rules/types";

export type AbilityRollKind = "check" | "save";

export type { RollStateView };

export function buildD20Action(key: string, label: string, bonus: number, state?: RollStateView): DiceRollAction {
  return { key, label, count: 1, sides: 20, bonus, isD20: true, ...describeState(state) };
}

function describeState(state: RollStateView | undefined): Partial<DiceRollAction> {
  if (!state) return {};
  return { mode: state.mode, modeSources: state.sources, extraDice: state.extraDice };
}

export function buildAbilityRollContext(
  abilityName: string,
  checkBonus: number,
  saveBonus: number,
  autoRollKey: AbilityRollKind = "check",
  onEdit?: () => void,
  states?: { check?: RollStateView; save?: RollStateView },
): DiceRollContext {
  return {
    title: abilityName,
    actions: [buildD20Action("check", "Перевірка", checkBonus, states?.check), buildD20Action("save", "Ряткидок", saveBonus, states?.save)],
    autoRollKey,
    onEdit,
  };
}

export function buildSkillRollContext(skillName: string, abilityName: string, bonus: number, onEdit?: () => void, state?: RollStateView): DiceRollContext {
  return { title: skillName, subtitle: abilityName, actions: [buildD20Action("check", "Перевірка", bonus, state)], autoRollKey: "check", onEdit };
}

export function buildInitiativeRollContext(bonus: number, onEdit?: () => void, state?: RollStateView): DiceRollContext {
  return { title: "Ініціатива", actions: [buildD20Action("initiative", "Ініціатива", bonus, state)], autoRollKey: "initiative", onEdit };
}

export function buildSpellAttackRollContext(bonus: number, sourceLabel?: string, onEdit?: () => void, state?: RollStateView): DiceRollContext {
  return {
    title: "Атака заклинанням",
    subtitle: sourceLabel || undefined,
    actions: [buildD20Action("spell-attack", "Атака", bonus, state)],
    autoRollKey: "spell-attack",
    onEdit,
  };
}

export function buildWeaponRollContext(input: {
  weaponName: string;
  attackBonus: number;
  damageBonus: number;
  damageDice: string;
  attackState?: RollStateView;
  damageExtraDice?: ExtraDie[];
}): DiceRollContext {
  const damage = parseDiceNotation(input.damageDice);
  return {
    title: input.weaponName,
    subtitle: `Шкода ${damage.count}к${damage.sides}`,
    actions: [
      buildD20Action("attack", "Атака", input.attackBonus, input.attackState),
      { key: "damage", label: "Шкода", count: damage.count, sides: damage.sides, bonus: input.damageBonus, isD20: false, extraDice: input.damageExtraDice },
    ],
    autoRollKey: "attack",
  };
}

const ABILITY_GENITIVE: Record<AbilityKey, string> = { STR: "Сили", DEX: "Спритності", CON: "Статури", INT: "Інтелекту", WIS: "Мудрості", CHA: "Харизми" };

/// Шкода, що приходить пізніше (Мітка мисливця, зони), не кидається сама: панель чекає натискання.
export function buildSpellRollContext(input: {
  spellName: string;
  plan: SpellRollPlan;
  slotLabel?: string;
  attackBonus: number;
  saveDC: number;
  attackState?: RollStateView;
  spell?: SaveSpellRef;
}): DiceRollContext {
  const { plan } = input;
  const actions = [
    ...(plan.attack ? [buildD20Action("spell-attack", "Атака", input.attackBonus, input.attackState)] : []),
    ...plan.rolls.map((roll): DiceRollAction => ({ key: roll.key, label: roll.label, count: roll.count, sides: roll.sides, bonus: roll.bonus, isD20: false })),
  ];
  const pieces = plan.pieces ? `${plan.pieces.label}: ${plan.pieces.count}` : null;
  const targetPicks = plan.pieces ? { count: plan.pieces.count, isSummed: false } : plan.darts ? { count: plan.darts, isSummed: true } : null;
  return {
    title: input.spellName,
    subtitle: [input.slotLabel, pieces].filter(Boolean).join(" · ") || undefined,
    actions,
    autoRollKey: plan.rollsLater ? undefined : actions[0]?.key,
    targetSave: plan.save ? { abilityName: ABILITY_GENITIVE[plan.save], dc: input.saveDC, ...(input.spell ? { spell: input.spell } : {}) } : undefined,
    ...(targetPicks && targetPicks.count > 1 ? { targetPicks } : {}),
  };
}

export function describeTargetSave(save: NonNullable<DiceRollContext["targetSave"]>): string {
  return `ряткидок ${save.abilityName} СК ${save.dc}`;
}

const MAX_CREATURE_ACTIONS = 4;

/// Абзац з купою кубиків (опис чаротворення) не влазить у ряд кнопок — тоді в панелі лише натиснутий.
/// Дія з ряткидком несе його в кидок: шкода кидає ряткидки обраної цілі, а з областю (подих) — усіх, хто в зоні.
export function buildCreatureActionRollContext(input: { creatureName: string; actionName: string; rolls: CreatureRoll[]; index: number; save?: CreatureSaveAction }): DiceRollContext {
  const indexes = input.rolls.length <= MAX_CREATURE_ACTIONS ? input.rolls.map((_, index) => index) : [input.index];
  const { save } = input;
  const area = input.rolls[input.index]?.kind === "damage" ? save?.area : undefined;
  return {
    title: input.creatureName,
    subtitle: input.actionName || undefined,
    actions: indexes.map((index) => buildCreatureAction(`roll-${index}`, input.rolls[index])),
    autoRollKey: `roll-${input.index}`,
    isCreatureRoll: true,
    ...(save ? { targetSave: { abilityName: ABILITY_GENITIVE[save.ability], dc: save.dc, effect: { ability: save.ability, damageType: save.damageType, isHalfOnSave: save.isHalfOnSave } } } : {}),
    ...(area ? { targetArea: { label: input.actionName || AREA_SHAPE_LABELS[area.shape], shape: area.shape, sizeFeet: area.sizeFeet } } : {}),
  };
}

function buildCreatureAction(key: string, roll: CreatureRoll): DiceRollAction {
  if (roll.kind === "attack") return buildD20Action(key, "Атака", roll.bonus);
  if (roll.kind === "recharge") return { key, label: roll.from < 6 ? `Перезарядка ${roll.from}–6` : "Перезарядка 6", count: 1, sides: 6, bonus: 0, isD20: false };
  return { key, label: "Шкода", count: roll.count, sides: roll.sides, bonus: roll.bonus, isD20: false };
}

export function buildCreatureD20RollContext(creatureName: string, subtitle: string | undefined, actions: DiceRollAction[]): DiceRollContext {
  return { title: creatureName, subtitle, actions, autoRollKey: actions[0]?.key, isCreatureRoll: true };
}

export type PendingRollMeta = {
  actionKey: string;
  label: string;
  bonus: number;
  d20Mode: D20Mode | null;
  mainDiceCount: number;
  extraDice: ExtraDie[];
};

export type ExtraDieOutcome = ExtraDie & { value: number };

export type DiceRollOutcome = PendingRollMeta & {
  dieValues: number[];
  extraValues: ExtraDieOutcome[];
  baseValue: number;
  total: number;
};

/// Кубики приходять у порядку нотацій: спершу основні, тоді додаткові стану.
export function buildRollOutcome(meta: PendingRollMeta, values: number[]): DiceRollOutcome {
  const dieValues = values.slice(0, meta.mainDiceCount);
  const extraValues = meta.extraDice.map((die, index) => ({ ...die, value: values[meta.mainDiceCount + index] ?? 0 }));
  const baseValue = meta.d20Mode ? pickD20Value(dieValues, meta.d20Mode) : dieValues.reduce((sum, value) => sum + value, 0);
  const extraTotal = extraValues.reduce((sum, die) => sum + die.sign * die.value, 0);
  const rawTotal = baseValue + extraTotal + meta.bonus;
  const total = !meta.d20Mode && extraTotal < 0 ? Math.max(1, rawTotal) : rawTotal;
  return { ...meta, dieValues, extraValues, baseValue, total };
}

export function listRollNotations(action: DiceRollAction, d20Mode: D20Mode): string[] {
  const main = action.isD20 ? `${d20Mode === "NORMAL" ? 1 : 2}d20` : `${action.count}d${action.sides}`;
  return [main, ...(action.extraDice ?? []).map((die) => `1d${die.sides}`)];
}

export function describeActionDice(action: DiceRollAction): string {
  return action.isD20 ? "к20" : `${action.count}к${action.sides}`;
}

export function formatExtraDice(dice: readonly ExtraDie[]): string {
  return dice.map((die) => `${die.sign > 0 ? "+" : "−"}к${die.sides}`).join(" ");
}

/// Для назви кнопки: «+к4 (Благословення)» — звідки кубик, чути й без підказки.
export function describeExtraDiceAloud(dice: readonly ExtraDie[]): string {
  return dice.length ? ` ${formatExtraDice(dice)} (${dice.map((die) => die.label).join(", ")})` : "";
}
