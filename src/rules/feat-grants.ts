import { calculateAbilityModifier, isRecord } from "./abilities";
import { raiseAbilityScore } from "./ability-score-ceiling";
import type { AbilityKey, AbilityScores } from "./types";

export const SKILL_KEYS = [
  "ATHLETICS",
  "ACROBATICS",
  "SLEIGHT_OF_HAND",
  "STEALTH",
  "ARCANA",
  "HISTORY",
  "INVESTIGATION",
  "NATURE",
  "RELIGION",
  "ANIMAL_HANDLING",
  "INSIGHT",
  "MEDICINE",
  "PERCEPTION",
  "SURVIVAL",
  "DECEPTION",
  "INTIMIDATION",
  "PERFORMANCE",
  "PERSUASION",
] as const;

export type FeatGrantOption = {
  choiceOptionId: number;
  choiceOption?: {
    optionNameEng?: string | null;
    effectKind?: string | null;
    effectAbility?: string | null;
    effectAmount?: number | null;
    effectSkill?: string | null;
  } | null;
};

export type FeatGrantSource = {
  name: string;
  ruleset: string;
  grantedASI: unknown;
  grantedSkills: unknown;
  featChoiceOptions: readonly FeatGrantOption[];
};

export type AbilityIncrease = { ability: AbilityKey; amount: number };

export type FeatGrants = {
  abilityIncreases: AbilityIncrease[];
  proficientSkills: string[];
  expertiseSkills: string[];
  saveProficiencies: AbilityKey[];
};

type ChosenOption = NonNullable<FeatGrantOption["choiceOption"]>;

export const ABILITY_KEYS: readonly AbilityKey[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

export function collectFeatGrants(feat: FeatGrantSource, chosenOptionIds: readonly number[]): FeatGrants {
  const grants: FeatGrants = { abilityIncreases: [], proficientSkills: [], expertiseSkills: [], saveProficiencies: [] };
  const isResilient = feat.name === "RESILIENT";

  collectGrantedAbilityIncreases(feat.grantedASI, grants);
  for (const choiceOptionId of chosenOptionIds) {
    const option = feat.featChoiceOptions.find((candidate) => Number(candidate.choiceOptionId) === choiceOptionId)?.choiceOption;
    collectChosenOptionGrants(option ?? {}, isResilient, grants);
  }
  collectFixedSkills(feat.grantedSkills, grants);

  return grants;
}

export function applyAbilityIncreases(scores: AbilityScores, increases: readonly AbilityIncrease[], ceiling: number): AbilityScores {
  return increases.reduce(
    (current, { ability, amount }) => ({ ...current, [ability]: raiseAbilityScore(current[ability], amount, ceiling) }),
    { ...scores },
  );
}

const TOUGH_HIT_POINTS_PER_LEVEL = 2;

// Риса, взята поза підвищенням рівня: Статура заднім числом за кожен рівень, Здоровань — теж.
export function findFeatHitPointIncrease(input: { level: number; conBefore: number; conAfter: number; takesTough: boolean }): number {
  const constitutionDelta = calculateAbilityModifier(input.conAfter) - calculateAbilityModifier(input.conBefore);
  const toughBonus = input.takesTough ? TOUGH_HIT_POINTS_PER_LEVEL * input.level : 0;
  return constitutionDelta * input.level + toughBonus;
}

function collectGrantedAbilityIncreases(grantedASI: unknown, grants: FeatGrants): void {
  const record = isRecord(grantedASI) ? grantedASI : null;
  const basic = isRecord(record?.basic) ? record.basic : null;
  const simple = isRecord(basic?.simple) ? basic.simple : null;

  for (const [ability, bonus] of Object.entries(simple ?? record ?? {})) {
    const key = ability.toUpperCase();
    const amount = Number(bonus);
    if (isAbility(key) && Number.isFinite(amount)) grants.abilityIncreases.push({ ability: key, amount });
  }
}

function collectChosenOptionGrants(option: ChosenOption, isResilient: boolean, grants: FeatGrants): void {
  const effectKind = String(option.effectKind ?? "").trim();

  if (effectKind === "ASI") collectAbilityEffect(option, isResilient, grants);
  if (effectKind === "SKILL_PROFICIENCY" || effectKind === "SKILL_EXPERTISE") collectSkillEffect(option, effectKind, grants);
}

function collectAbilityEffect(option: ChosenOption, isResilient: boolean, grants: FeatGrants): void {
  const ability = readAbility(String(option.effectAbility ?? ""));
  if (!ability) return;

  const amount = Number(option.effectAmount ?? 1);
  grants.abilityIncreases.push({ ability, amount: Number.isFinite(amount) ? amount : 1 });
  if (isResilient) grants.saveProficiencies.push(ability);
}

function collectSkillEffect(option: ChosenOption, effectKind: string, grants: FeatGrants): void {
  const skill = String(option.effectSkill ?? "").trim();
  if (!isSkill(skill)) return;
  (effectKind === "SKILL_EXPERTISE" ? grants.expertiseSkills : grants.proficientSkills).push(skill);
}

function collectFixedSkills(grantedSkills: unknown, grants: FeatGrants): void {
  if (!Array.isArray(grantedSkills) || !grantedSkills.every((skill) => typeof skill === "string")) return;
  for (const skill of grantedSkills) if (isSkill(skill)) grants.proficientSkills.push(skill);
}

function readAbility(value: string): AbilityKey | null {
  const upper = value.trim().toUpperCase();
  return isAbility(upper) ? upper : null;
}

function isAbility(value: string): value is AbilityKey {
  return (ABILITY_KEYS as readonly string[]).includes(value);
}

function isSkill(value: string): boolean {
  return (SKILL_KEYS as readonly string[]).includes(value);
}
