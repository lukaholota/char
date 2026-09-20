import { isRecord } from "./abilities";
import { ABILITY_KEYS, findFeatHitPointIncrease, type AbilityIncrease } from "./feat-grants";
import type { AbilityKey, AbilityScores } from "./types";

export type SkillUpgrade = { skill: string; previous: "NONE" | "PROFICIENT" };

export type FeatGrantRecord = {
  abilityIncreases: AbilityIncrease[];
  saveProficiencies: AbilityKey[];
  proficientSkills: string[];
  expertiseSkills: SkillUpgrade[];
  featureIds: number[];
  spellIds: number[];
  languageLines: string[];
  proficiencyLines: string[];
};

export type FeatRemovalState = {
  level: number;
  scores: AbilityScores;
  maxHp: number;
  currentHp: number;
  isTough: boolean;
};

const MIN_ABILITY_SCORE = 1;
const MIN_MAX_HP = 1;

export function findActualAbilityIncreases(before: AbilityScores, after: AbilityScores): AbilityIncrease[] {
  return ABILITY_KEYS.flatMap((ability) => (after[ability] > before[ability] ? [{ ability, amount: after[ability] - before[ability] }] : []));
}

export function removeAbilityIncreases(scores: AbilityScores, increases: readonly AbilityIncrease[]): AbilityScores {
  return increases.reduce(
    (current, { ability, amount }) => ({ ...current, [ability]: Math.max(MIN_ABILITY_SCORE, current[ability] - amount) }),
    { ...scores },
  );
}

export function findHitPointsAfterRemoval(state: FeatRemovalState, scoresAfter: AbilityScores): { maxHp: number; currentHp: number } {
  const loss = findFeatHitPointIncrease({ level: state.level, conBefore: scoresAfter.CON, conAfter: state.scores.CON, takesTough: state.isTough });
  const maxHp = Math.max(MIN_MAX_HP, state.maxHp - loss);
  return { maxHp, currentHp: Math.min(maxHp, Math.max(0, state.currentHp - loss)) };
}

export function removeTextLines(text: string, lines: readonly string[]): string {
  const removed = new Set(lines);
  return text.split("\n").filter((line) => !removed.has(line)).join("\n");
}

const RECORD_ITEM_CHECKS: Record<keyof FeatGrantRecord, (item: unknown) => boolean> = {
  abilityIncreases: isAbilityIncrease,
  saveProficiencies: isAbilityKey,
  proficientSkills: isString,
  expertiseSkills: isSkillUpgrade,
  featureIds: Number.isInteger,
  spellIds: Number.isInteger,
  languageLines: isString,
  proficiencyLines: isString,
};

export function readFeatGrantRecord(raw: unknown): FeatGrantRecord | null {
  if (!isRecord(raw)) return null;
  const isValid = Object.entries(RECORD_ITEM_CHECKS).every(([field, isItem]) => {
    const value = raw[field];
    return Array.isArray(value) && value.every(isItem);
  });
  return isValid ? (raw as FeatGrantRecord) : null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isAbilityKey(value: unknown): value is AbilityKey {
  return (ABILITY_KEYS as readonly unknown[]).includes(value);
}

function isAbilityIncrease(value: unknown): boolean {
  return isRecord(value) && isAbilityKey(value.ability) && Number.isInteger(value.amount);
}

function isSkillUpgrade(value: unknown): boolean {
  return isRecord(value) && isString(value.skill) && (value.previous === "NONE" || value.previous === "PROFICIENT");
}
