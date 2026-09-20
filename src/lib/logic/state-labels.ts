import type { PersWithRelations } from "@/lib/actions/pers";
import type { AbilityKey } from "@/rules/types";
import type { ExtraDie, RollStateView } from "@/lib/stores/diceUIStore";
import { damageTypeTranslations, featTranslations } from "@/lib/refs/translation";
import { EXHAUSTION_SOURCE_KEY } from "@/rules/exhaustion";
import {
  findD20RollState,
  listBonusDice,
  type BonusDieScope,
  type D20Roll,
  type RollScope,
  type StateEffects,
  type StateMark,
  type StateSize,
} from "@/rules/state-effects";
import { collectActiveFeatures, readStateEffects } from "./bonus-calculator";
import { WAR_CASTER_SOURCE_KEY } from "./active-states";
import { shortenSpellName } from "./spell-name";

export { shortenSpellName };

export type SpellBuffCatalogEntry = { key: string; spellId: number; name: string };

export function findStateSourceLabel(pers: PersWithRelations, sourceKey: string, catalog: readonly SpellBuffCatalogEntry[] = []): string {
  if (sourceKey === EXHAUSTION_SOURCE_KEY) return "Виснаження";
  if (sourceKey === WAR_CASTER_SOURCE_KEY) return featTranslations.WAR_CASTER ?? "War Caster";

  const effectSpell = (pers.effects ?? []).find((row) => row.effectKey === sourceKey)?.spell;
  if (effectSpell) return describeBuffName(sourceKey, effectSpell.name);

  const catalogEntry = catalog.find((entry) => entry.key === sourceKey);
  if (catalogEntry) return describeBuffName(sourceKey, catalogEntry.name);

  return collectActiveFeatures(pers).find((feature) => feature.engName === sourceKey)?.name ?? sourceKey;
}

/// Збільшення/Зменшення — одне заклинання з двома ефектами; чип показує ту половину, що діє.
function describeBuffName(sourceKey: string, spellName: string): string {
  const [enlarge, reduce] = shortenSpellName(spellName).split("/");
  if (sourceKey === "ENLARGE" && enlarge) return enlarge.trim();
  if (sourceKey === "REDUCE" && reduce) return reduce.trim();
  return shortenSpellName(spellName);
}

export function describeRollState(pers: PersWithRelations, roll: D20Roll, diceScope?: BonusDieScope): RollStateView {
  const effects = readStateEffects(pers);
  const state = findD20RollState(effects, roll);
  const label = (sourceKey: string) => findStateSourceLabel(pers, sourceKey);
  return {
    mode: state.mode,
    sources: [...state.advantageSources, ...state.disadvantageSources].map(label),
    extraDice: diceScope ? listExtraDice(effects, diceScope, label) : [],
  };
}

/// Число, яке змінив стан, лист підсвічує, як BG3: зеленим — вище, червоним — нижче.
export function findStateValueTone(pers: PersWithRelations, calculate: (pers: PersWithRelations) => number): string {
  if (!readStateEffects(pers)) return "";
  const withoutStates = calculate({ ...pers, stateEffects: null } as PersWithRelations);
  const withStates = calculate(pers);
  if (withStates === withoutStates) return "";
  return withStates > withoutStates ? "!text-emerald-300" : "!text-rose-300";
}

/// Картка характеристики кидає і перевірку, і ряткидок — обидва зі своїм станом.
export function describeAbilityRollStates(pers: PersWithRelations, ability: AbilityKey): { check: RollStateView; save: RollStateView } {
  return { check: describeRollState(pers, { kind: "check", ability }), save: describeRollState(pers, { kind: "save", ability }, "SAVE") };
}

export function listExtraDice(effects: StateEffects | null, scope: BonusDieScope, label: (sourceKey: string) => string): ExtraDie[] {
  return listBonusDice(effects, scope).map((die) => ({ sides: die.sides, sign: die.sign, label: label(die.sourceKey) }));
}

/// Коротко, що дає стан: «КБ +2 · швидкість ×2 · перевага: ряткидки Спритності».
export function describeStatePart(part: Partial<StateEffects>): string[] {
  return [
    ...describeNumbers(part),
    ...describeRolls(part),
    ...(part.damageResistances?.length ? [`опір: ${part.damageResistances.map(translateDamageType).join(", ")}`] : []),
    ...(part.marks ?? []).map(describeMark),
  ];
}

function describeNumbers(part: Partial<StateEffects>): string[] {
  const lines: string[] = [];
  if (part.armorClassBonus) lines.push(`КБ +${part.armorClassBonus}`);
  if (part.unarmoredArmorClassBase) lines.push(`КБ ${part.unarmoredArmorClassBase} + Спр`);
  if (part.armorClassFloor) lines.push(`КБ щонайменше ${part.armorClassFloor}`);
  if (part.speedBonus) lines.push(`швидкість ${part.speedBonus > 0 ? "+" : "−"}${Math.abs(part.speedBonus)} фт`);
  if (part.speedMultiplier && part.speedMultiplier !== 1) lines.push(part.speedMultiplier > 1 ? "швидкість ×2" : "швидкість ÷2");
  if (part.isSpeedZero) lines.push("швидкість 0");
  if (part.d20Penalty) lines.push(`−${part.d20Penalty} до кидків к20`);
  if (part.isMaxHpHalved) lines.push("макс. хіти ÷2");
  if (part.strengthAttackDamageBonus) lines.push(`+${part.strengthAttackDamageBonus} шкоди атак Силою`);
  if (part.weaponAbilityOption === "INT") lines.push("Інтелект для атак зброєю");
  if (Object.keys(part.skillAbilityOptions ?? {}).length > 0) lines.push("Сила для 5 навичок");
  if (part.concentrationSaveBonus) lines.push(`+${part.concentrationSaveBonus} до ряткидка концентрації`);
  if (part.size) lines.push(SIZE_LABELS[part.size]);
  return lines;
}

function describeRolls(part: Partial<StateEffects>): string[] {
  const byMode = (mode: "ADVANTAGE" | "DISADVANTAGE") =>
    (part.rollModifiers ?? []).filter((modifier) => modifier.mode === mode).map((modifier) => ROLL_SCOPE_LABELS[modifier.scope]);
  const advantages = byMode("ADVANTAGE");
  const disadvantages = byMode("DISADVANTAGE");
  const dice = (part.bonusDice ?? []).map((die) => `${die.sign > 0 ? "+" : "−"}к${die.sides} ${BONUS_DIE_LABELS[die.scope]}`);
  return [
    ...(advantages.length ? [`перевага: ${advantages.join(", ")}`] : []),
    ...(disadvantages.length ? [`перешкода: ${disadvantages.join(", ")}`] : []),
    ...[...new Set(dice)],
  ];
}

const ROLL_SCOPE_LABELS: Record<RollScope, string> = {
  ABILITY_CHECK: "перевірки",
  STR_CHECK: "перевірки Сили",
  ACROBATICS_CHECK: "Акробатика",
  ATTACK: "атаки",
  SAVE: "ряткидки",
  STR_SAVE: "ряткидки Сили",
  DEX_SAVE: "ряткидки Спритності",
  CONCENTRATION_SAVE: "ряткидок концентрації",
};

const BONUS_DIE_LABELS: Record<BonusDieScope, string> = {
  ATTACK: "до атак",
  SAVE: "до ряткидків",
  WEAPON_DAMAGE: "до шкоди зброї",
};

const SIZE_LABELS: Record<StateSize, string> = {
  LARGE: "розмір Великий",
  LARGE_OR_HUGE: "Великий або Величезний, досяжність +5 фт",
  ONE_LARGER: "на розмір більший",
  ONE_SMALLER: "на розмір менший",
};

function describeMark(mark: StateMark): string {
  switch (mark.kind) {
    case "NO_SPELLCASTING":
      return "без заклинань і концентрації";
    case "FRENZY_ATTACK":
      return "атака бонусною дією щоходу";
    case "FRENZY_EXHAUSTION":
      return "після Люті — рівень виснаження";
    case "FRENZY_DAMAGE":
      return `Шаленство: +${mark.dice}к6 з Безрозсудною атакою`;
    case "GIANTS_MIGHT_DAMAGE":
      return `+1к${mark.die.slice(1)} шкоди раз на хід`;
    case "BLADESONG_ARMOR_LIMIT":
      return mark.allowsLightArmor ? "без середніх і важких обладунків і щита" : "без обладунків і щита";
    case "HASTE_EXTRA_ACTION":
      return "додаткова дія";
    case "HASTE_LETHARGY":
      return "після — хід без руху й дій";
    case "EXHAUSTION_DEATH":
      return "6-й рівень — смерть";
  }
}

function translateDamageType(type: string): string {
  return (damageTypeTranslations[type] ?? type).toLowerCase();
}
