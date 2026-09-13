export type AbilityKey = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";

export type AbilityScores = Record<AbilityKey, number>;

export const DAMAGE_TYPE_KEYS = [
  "BLUDGEONING",
  "PIERCING",
  "SLASHING",
  "ACID",
  "COLD",
  "FIRE",
  "LIGHTNING",
  "THUNDER",
  "FORCE",
  "NECROTIC",
  "POISON",
  "PSYCHIC",
  "RADIANT",
] as const;

export type DamageTypeKey = (typeof DAMAGE_TYPE_KEYS)[number];

export type SpellcastingKind = "NONE" | "FULL" | "HALF" | "THIRD" | "PACT";

export type SpellcastingClass = {
  name?: string | null;
  spellcastingType?: SpellcastingKind | null;
  primaryCastingStat?: AbilityKey | null;
};

export type SpellcastingSubclass = {
  spellcastingType?: SpellcastingKind | null;
};

export type SpellcastingClassLevel = {
  classLevel: number;
  characterClass?: SpellcastingClass | null;
  subclass?: SpellcastingSubclass | null;
};

export type SpellcastingCharacter = {
  level: number;
  characterClass?: SpellcastingClass | null;
  subclass?: SpellcastingSubclass | null;
  multiclasses?: SpellcastingClassLevel[];
};

export type ArmorAbilityBonusType = "NONE" | "FULL" | "MAX2";

export type EquippedArmor = {
  baseArmorClass: number;
  characterOverrideBaseArmorClass?: number | null;
  miscArmorClassBonus?: number | null;
  characterAbilityBonuses?: AbilityKey[];
  armorAbilityBonuses?: AbilityKey[];
  characterAbilityBonusType?: ArmorAbilityBonusType | null;
  armorAbilityBonusType?: ArmorAbilityBonusType | null;
};

export type ArmorClassInput = {
  dexterityModifier: number;
  abilityModifiers: Partial<Record<AbilityKey, number>>;
  equippedArmor?: EquippedArmor | null;
  baseArmorClassOverride?: number | null;
  raceStaticArmorClassBonus?: number | null;
  wearsShield: boolean;
  shieldArmorClassBonus: number;
  simpleArmorClassBonus: number;
  featureArmorClassBonus: number;
  magicItemArmorClassBonus: number;
};

export type ClassProgression = {
  subclassLevel?: number | null;
  abilityScoreUpLevels?: number[] | null;
  epicBoonLevel?: number | null;
};

export type BackgroundASIChoice =
  | { mode: "+2/+1"; plusTwo: AbilityKey; plusOne: AbilityKey }
  | { mode: "+1/+1/+1"; abilities: [AbilityKey, AbilityKey, AbilityKey] | AbilityKey[] };

export type Ruleset = "RULES_2014" | "RULES_2024";


