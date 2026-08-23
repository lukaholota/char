export type CreatureEdition = "RULES_2014" | "RULES_2024";

export type StatblockEntry = {
  name: string;
  text: string;
};

export type AbilityScore = {
  score: number;
  modifier: number;
  save: number;
};

export type AbilityScores = {
  strength: AbilityScore;
  dexterity: AbilityScore;
  constitution: AbilityScore;
  intelligence: AbilityScore;
  wisdom: AbilityScore;
  charisma: AbilityScore;
};

/// One internal shape for both editions. 2014 leaves initiative/gear/xpInLair/habitat empty,
/// 2024 leaves nothing edition-specific behind — see docs/DECISIONS.md Р12.
export type ParsedCreature = {
  slug: string;
  nameEng: string;
  ruleset: CreatureEdition;
  size: string;
  type: string;
  alignment: string;
  ac: string;
  initiative: string;
  hp: string;
  speed: string;
  abilities: AbilityScores;
  savingThrows: string;
  skills: string;
  damageVulnerability: string;
  damageResistance: string;
  damageImmunity: string;
  conditionImmunity: string;
  gear: string;
  senses: string;
  languages: string;
  challenge: string;
  xp: string;
  xpInLair: string;
  proficiencyBonus: string;
  traits: StatblockEntry[];
  actions: StatblockEntry[];
  bonusActions: StatblockEntry[];
  reactions: StatblockEntry[];
  legendaryActions: StatblockEntry[];
  legendaryActionUses: string;
  habitat: string;
  treasure: string;
  description: string;
  source: string;
  imageUrl: string;
};

export const ABILITY_KEYS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

const ALWAYS_REQUIRED = [
  "slug",
  "nameEng",
  "size",
  "type",
  "alignment",
  "ac",
  "hp",
  "speed",
  "senses",
  "languages",
  "challenge",
  "xp",
  "proficiencyBonus",
] as const;

export function findEmptyRequiredFields(creature: ParsedCreature): string[] {
  const empty = ALWAYS_REQUIRED.filter((field) => creature[field].trim() === "");

  const missingAbilities = ABILITY_KEYS.filter(
    (key) => !Number.isFinite(creature.abilities[key].score)
  );

  const hasAnySection =
    creature.traits.length +
      creature.actions.length +
      creature.bonusActions.length +
      creature.reactions.length +
      creature.legendaryActions.length >
    0;

  return [
    ...empty,
    ...missingAbilities.map((key) => `abilities.${key}`),
    ...(hasAnySection ? [] : ["sections"]),
  ];
}

export function buildEmptyAbilityScores(): AbilityScores {
  const blank = (): AbilityScore => ({ score: NaN, modifier: NaN, save: NaN });
  return {
    strength: blank(),
    dexterity: blank(),
    constitution: blank(),
    intelligence: blank(),
    wisdom: blank(),
    charisma: blank(),
  };
}
