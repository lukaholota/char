import type { AbilityKey, ArmorAbilityBonusType, ArmorClassInput } from "./types";

// `ArmorCategory` після HOMEBREW моделює джерела КЗ, а не обладунок, який «носять».
const ARMOR_CLASS_SOURCES_NOT_ARMOR: readonly string[] = [
  "UNARMORED_DEFENSE_MONK",
  "UNARMORED_DEFENSE_BARBARIAN",
  "NATURAL_ARMOR_TORTLE",
  "NATURAL_ARMOR_13_DEX",
  "NATURAL_ARMOR_12_DEX",
  "NATURAL_ARMOR_12_CON",
  "DRACONIC_RESILIENCE",
];

export function isWornArmor(armorName: string): boolean {
  return !ARMOR_CLASS_SOURCES_NOT_ARMOR.includes(armorName);
}

export type ArmorClassPartKey = "BASE" | "SPECIES" | "SHIELD" | "MANUAL" | "FEATURES" | "STATES" | "MAGIC_ITEMS";

export type ArmorClassPart = { key: ArmorClassPartKey; value: number };

export function calculateArmorClass(input: ArmorClassInput): number {
  return explainArmorClass(input).reduce((total, part) => total + part.value, 0);
}

export function explainArmorClass(input: ArmorClassInput): ArmorClassPart[] {
  return [
    { key: "BASE", value: calculateBaseArmorClass(input) },
    { key: "SPECIES", value: calculateFiniteBonus(input.raceStaticArmorClassBonus) },
    { key: "SHIELD", value: input.wearsShield ? 2 + input.shieldArmorClassBonus : 0 },
    { key: "MANUAL", value: input.simpleArmorClassBonus },
    { key: "FEATURES", value: input.featureArmorClassBonus },
    { key: "STATES", value: input.stateArmorClassBonus ?? 0 },
    { key: "MAGIC_ITEMS", value: input.magicItemArmorClassBonus },
  ];
}

function calculateBaseArmorClass(input: ArmorClassInput): number {
  if (Number.isFinite(input.baseArmorClassOverride)) return Math.trunc(input.baseArmorClassOverride as number);
  if (!input.equippedArmor) return 10 + input.dexterityModifier;

  const armor = input.equippedArmor;
  const bonusType = resolveArmorAbilityBonusType(armor);
  const abilities = resolveArmorAbilities(armor, bonusType);
  const armorBase = armor.characterOverrideBaseArmorClass ?? armor.baseArmorClass;
  return armorBase + calculateArmorAbilityBonus(input.abilityModifiers, bonusType, abilities) + (armor.miscArmorClassBonus ?? 0);
}

function resolveArmorAbilityBonusType(armor: NonNullable<ArmorClassInput["equippedArmor"]>): ArmorAbilityBonusType {
  if (armor.armorAbilityBonusType && armor.characterAbilityBonusType === "FULL" && !armor.characterAbilityBonuses?.length) {
    return armor.armorAbilityBonusType;
  }
  return armor.characterAbilityBonusType ?? armor.armorAbilityBonusType ?? "FULL";
}

function resolveArmorAbilities(armor: NonNullable<ArmorClassInput["equippedArmor"]>, bonusType: ArmorAbilityBonusType): AbilityKey[] {
  if (bonusType === "NONE") return armor.characterAbilityBonuses ?? [];
  return armor.characterAbilityBonuses?.length ? armor.characterAbilityBonuses : armor.armorAbilityBonuses ?? [];
}

function calculateArmorAbilityBonus(
  abilityModifiers: Partial<Record<AbilityKey, number>>,
  bonusType: ArmorAbilityBonusType,
  abilities: AbilityKey[],
): number {
  if (bonusType === "NONE") return 0;
  return [...new Set(abilities)].reduce((sum, ability) => {
    const modifier = abilityModifiers[ability] ?? 0;
    return sum + (bonusType === "MAX2" && ability === "DEX" ? Math.min(modifier, 2) : modifier);
  }, 0);
}

function calculateFiniteBonus(bonus: number | null | undefined): number {
  return typeof bonus === "number" && Number.isFinite(bonus) ? Math.trunc(bonus) : 0;
}
