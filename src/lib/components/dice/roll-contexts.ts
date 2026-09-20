import type { DiceRollAction, DiceRollContext, ExtraDie, RollStateView } from "@/lib/stores/diceUIStore";
import { parseDiceNotation, pickD20Value, type D20Mode } from "@/rules/dice-roll";

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
