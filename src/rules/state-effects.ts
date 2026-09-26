import type { AbilityKey, DamageTypeKey } from "./types";
import type { D20Mode } from "./dice-roll";

/// Що дає стан поза числами листа: нагадування, яке лист показує текстом.
export type StateMark =
  | { kind: "NO_SPELLCASTING" }
  | { kind: "FRENZY_ATTACK" }
  | { kind: "FRENZY_EXHAUSTION" }
  | { kind: "FRENZY_DAMAGE"; dice: number }
  | { kind: "GIANTS_MIGHT_DAMAGE"; die: "d6" | "d8" | "d10" }
  | { kind: "BLADESONG_ARMOR_LIMIT"; allowsLightArmor: boolean }
  | { kind: "HASTE_EXTRA_ACTION" }
  | { kind: "HASTE_LETHARGY" }
  | { kind: "EXHAUSTION_DEATH" }
  | { kind: "RESILIENT_HIDE_NONMAGICAL" }
  | { kind: "BLOODLUST" };

export type RollScope =
  | "ABILITY_CHECK"
  | "STR_CHECK"
  | "ACROBATICS_CHECK"
  | "ATTACK"
  | "SAVE"
  | "STR_SAVE"
  | "DEX_SAVE"
  | "CONCENTRATION_SAVE";

/// `sourceKey` — англійська назва риси або ключ бафа; лист перекладає його на назву джерела.
export type RollModifier = { mode: "ADVANTAGE" | "DISADVANTAGE"; scope: RollScope; sourceKey: string };

export type BonusDieScope = "ATTACK" | "SAVE" | "WEAPON_DAMAGE";

export type BonusDie = { scope: BonusDieScope; sides: number; sign: 1 | -1; sourceKey: string };

export type StateSize = "LARGE" | "LARGE_OR_HUGE" | "ONE_LARGER" | "ONE_SMALLER";

/// Удар без зброї, яким стан робить його справжньою зброєю: Хижі удари гібридної форми лікантропа.
export type UnarmedStrikeEffect = { damageDice: string; abilityOption: AbilityKey; attackBonus: number };

export type StateEffects = {
  skillAbilityOptions: Partial<Record<string, AbilityKey>>;
  weaponAbilityOption: AbilityKey | null;
  strengthAttackDamageBonus: number;
  meleeDamageBonus: number;
  unarmedStrike: UnarmedStrikeEffect | null;
  armorClassBonus: number;
  unarmoredArmorClassBase: number | null;
  armorClassFloor: number | null;
  speedBonus: number;
  speedMultiplier: number;
  isSpeedZero: boolean;
  d20Penalty: number;
  isMaxHpHalved: boolean;
  concentrationSaveBonus: number;
  size: StateSize | null;
  damageResistances: DamageTypeKey[];
  rollModifiers: RollModifier[];
  bonusDice: BonusDie[];
  marks: StateMark[];
};

/// Частина ефектів із назвою свого джерела — шторка станів показує підсумок кожного окремо.
export type StatePart = { sourceKey: string; part: Partial<StateEffects> };

export type D20Roll =
  | { kind: "check"; ability: AbilityKey; skill?: string }
  | { kind: "save"; ability: AbilityKey; isConcentration?: boolean }
  | { kind: "attack" };

export type D20RollState = { mode: D20Mode; advantageSources: string[]; disadvantageSources: string[] };

export function mergeStateEffects(parts: Partial<StateEffects>[]): StateEffects | null {
  if (parts.length === 0) return null;

  return {
    skillAbilityOptions: Object.assign({}, ...parts.map((part) => part.skillAbilityOptions ?? {})),
    weaponAbilityOption: parts.find((part) => part.weaponAbilityOption)?.weaponAbilityOption ?? null,
    strengthAttackDamageBonus: sumParts(parts, (part) => part.strengthAttackDamageBonus),
    meleeDamageBonus: sumParts(parts, (part) => part.meleeDamageBonus),
    unarmedStrike: parts.find((part) => part.unarmedStrike)?.unarmedStrike ?? null,
    armorClassBonus: sumParts(parts, (part) => part.armorClassBonus),
    unarmoredArmorClassBase: findHighest(parts.map((part) => part.unarmoredArmorClassBase)),
    armorClassFloor: findHighest(parts.map((part) => part.armorClassFloor)),
    speedBonus: sumParts(parts, (part) => part.speedBonus),
    speedMultiplier: parts.reduce((product, part) => product * (part.speedMultiplier ?? 1), 1),
    isSpeedZero: parts.some((part) => part.isSpeedZero),
    d20Penalty: sumParts(parts, (part) => part.d20Penalty),
    isMaxHpHalved: parts.some((part) => part.isMaxHpHalved),
    concentrationSaveBonus: sumParts(parts, (part) => part.concentrationSaveBonus),
    size: findSize(parts),
    damageResistances: [...new Set(parts.flatMap((part) => part.damageResistances ?? []))],
    rollModifiers: dedupeBy(parts.flatMap((part) => part.rollModifiers ?? []), (modifier) => `${modifier.mode}:${modifier.scope}:${modifier.sourceKey}`),
    bonusDice: dedupeBy(parts.flatMap((part) => part.bonusDice ?? []), (die) => `${die.scope}:${die.sourceKey}`),
    marks: dedupeBy(parts.flatMap((part) => part.marks ?? []), (mark) => mark.kind),
  };
}

/// Перевага й перешкода взаємно гасяться, скільки б джерел кожної не було.
export function findD20RollState(effects: StateEffects | null, roll: D20Roll): D20RollState {
  const matching = (effects?.rollModifiers ?? []).filter((modifier) => matchesRoll(modifier.scope, roll));
  const advantageSources = uniqueSources(matching, "ADVANTAGE");
  const disadvantageSources = uniqueSources(matching, "DISADVANTAGE");
  return { mode: pickMode(advantageSources.length > 0, disadvantageSources.length > 0), advantageSources, disadvantageSources };
}

export function listBonusDice(effects: StateEffects | null, scope: BonusDieScope): BonusDie[] {
  return (effects?.bonusDice ?? []).filter((die) => die.scope === scope);
}

function matchesRoll(scope: RollScope, roll: D20Roll): boolean {
  switch (scope) {
    case "ABILITY_CHECK":
      return roll.kind === "check";
    case "STR_CHECK":
      return roll.kind === "check" && roll.ability === "STR";
    case "ACROBATICS_CHECK":
      return roll.kind === "check" && roll.skill === "ACROBATICS";
    case "ATTACK":
      return roll.kind === "attack";
    case "SAVE":
      return roll.kind === "save";
    case "STR_SAVE":
      return roll.kind === "save" && roll.ability === "STR";
    case "DEX_SAVE":
      return roll.kind === "save" && roll.ability === "DEX";
    case "CONCENTRATION_SAVE":
      return roll.kind === "save" && Boolean(roll.isConcentration);
  }
}

function pickMode(hasAdvantage: boolean, hasDisadvantage: boolean): D20Mode {
  if (hasAdvantage === hasDisadvantage) return "NORMAL";
  return hasAdvantage ? "ADVANTAGE" : "DISADVANTAGE";
}

function uniqueSources(modifiers: RollModifier[], mode: RollModifier["mode"]): string[] {
  return [...new Set(modifiers.filter((modifier) => modifier.mode === mode).map((modifier) => modifier.sourceKey))];
}

function sumParts(parts: Partial<StateEffects>[], read: (part: Partial<StateEffects>) => number | undefined): number {
  return parts.reduce((total, part) => total + (read(part) ?? 0), 0);
}

function findHighest(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter((value): value is number => typeof value === "number");
  return numbers.length > 0 ? Math.max(...numbers) : null;
}

const SIZE_PRIORITY: readonly StateSize[] = ["LARGE_OR_HUGE", "LARGE", "ONE_LARGER", "ONE_SMALLER"];

function findSize(parts: Partial<StateEffects>[]): StateSize | null {
  const sizes = new Set(parts.map((part) => part.size).filter(Boolean));
  return SIZE_PRIORITY.find((size) => sizes.has(size)) ?? null;
}

function dedupeBy<T>(items: T[], readKey: (item: T) => string): T[] {
  const byKey = new Map<string, T>();
  for (const item of items) if (!byKey.has(readKey(item))) byKey.set(readKey(item), item);
  return [...byKey.values()];
}
