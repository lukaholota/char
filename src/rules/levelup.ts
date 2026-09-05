import type { AbilityScores, Ruleset, SpellcastingCharacter } from "./types";
import {
  findAbilityScoreCeiling,
  raiseAbilityScore,
  type AbilityScoreIncreaseSource,
} from "./ability-score-ceiling";
import {
  applySpellSlotMaximumDelta,
  getMaximumPactSpellSlots,
  getMaximumStandardSpellSlots,
  normalizeSpellSlotArray,
} from "./spellcasting";

export type LevelUpState = {
  /** Редакція персонажа — від неї залежить округлення половинних заклиначів у слотах. */
  ruleset: Ruleset;
  level: number;
  scores: AbilityScores;
  maxHp: number;
  currentHp: number;
  currentSpellSlots: unknown;
  currentPactSlots: number;
  spellcasting: SpellcastingCharacter;
  featureIds: readonly number[];
  proficientSkills: readonly string[];
  expertiseSkills: readonly string[];
  additionalSaveProficiencies: readonly string[];
};

export type LevelUpChoices = {
  scores: AbilityScores;
  /** Найщедріше джерело підвищення цього рівня: епічний дар підіймає стелю з 20 до 30. */
  abilityScoreSource?: AbilityScoreIncreaseSource;
  hitDieIncrease: number;
  hasTough: boolean;
  takesTough: boolean;
  /** Хіти за рівень від рис виду — Dwarven Toughness і подібні. */
  traitHitPointsPerLevel?: number;
  spellcastingAfter: SpellcastingCharacter;
  featureIdsToAdd?: readonly number[];
  featureIdsToRemove?: readonly number[];
  proficientSkillsToAdd?: readonly string[];
  expertiseSkillsToAdd?: readonly string[];
  saveProficienciesToAdd?: readonly string[];
};

export type LevelUpContent = {
  standardProgression: Record<number, readonly number[]>;
  pactProgression: Record<number, { slots: number; level: number }>;
};

export function applyLevelUp(before: LevelUpState, choices: LevelUpChoices, content: LevelUpContent): LevelUpState {
  const nextLevel = before.level + 1;
  const scores = limitScoresToCeiling(before.scores, choices.scores, findAbilityScoreCeiling({
    ruleset: before.ruleset,
    source: choices.abilityScoreSource ?? "STANDARD",
  }));
  const conModifierDelta = abilityModifier(scores.CON) - abilityModifier(before.scores.CON);
  const toughBonus = choices.takesTough ? 2 * nextLevel : choices.hasTough ? 2 : 0;
  const traitBonus = Math.max(0, toInteger(choices.traitHitPointsPerLevel ?? 0));
  const hitPointDelta = Math.max(0, toInteger(choices.hitDieIncrease)) + abilityModifier(scores.CON) + toughBonus + traitBonus + conModifierDelta * before.level;
  const beforeStandardMaximum = getMaximumStandardSpellSlots(before.spellcasting, content.standardProgression, before.ruleset);
  const afterStandardMaximum = getMaximumStandardSpellSlots(choices.spellcastingAfter, content.standardProgression, before.ruleset);
  const beforePactMaximum = getMaximumPactSpellSlots(before.spellcasting, content.pactProgression, before.ruleset);
  const afterPactMaximum = getMaximumPactSpellSlots(choices.spellcastingAfter, content.pactProgression, before.ruleset);
  const currentPactSlots = Math.max(0, toInteger(before.currentPactSlots));

  return {
    ruleset: before.ruleset,
    level: nextLevel,
    scores,
    maxHp: before.maxHp + hitPointDelta,
    currentHp: before.currentHp + hitPointDelta,
    currentSpellSlots: applySpellSlotMaximumDelta(normalizeSpellSlotArray(before.currentSpellSlots), beforeStandardMaximum, afterStandardMaximum),
    currentPactSlots: Math.max(0, Math.min(afterPactMaximum, currentPactSlots + afterPactMaximum - beforePactMaximum)),
    spellcasting: choices.spellcastingAfter,
    featureIds: uniqueFiniteIntegers([...before.featureIds, ...(choices.featureIdsToAdd ?? [])])
      .filter((featureId) => !choices.featureIdsToRemove?.includes(featureId)),
    proficientSkills: uniqueStrings([...before.proficientSkills, ...(choices.proficientSkillsToAdd ?? []), ...(choices.expertiseSkillsToAdd ?? [])]),
    expertiseSkills: uniqueStrings([...before.expertiseSkills, ...(choices.expertiseSkillsToAdd ?? [])]),
    additionalSaveProficiencies: uniqueStrings([...before.additionalSaveProficiencies, ...(choices.saveProficienciesToAdd ?? [])]),
  };
}

export function mergeUniqueLines(base: unknown, extras: readonly string[]): string {
  const lines = typeof base === "string" ? base.split(/\r?\n/) : [];
  return Array.from(new Set([...lines, ...extras].map((line) => line.trim()).filter(Boolean))).join("\n");
}

function limitScoresToCeiling(before: AbilityScores, after: AbilityScores, ceiling: number): AbilityScores {
  const abilities = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
  return Object.fromEntries(abilities.map((ability) => {
    const previous = toInteger(before[ability]);
    return [ability, raiseAbilityScore(previous, toInteger(after[ability]) - previous, ceiling)];
  })) as AbilityScores;
}

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function toInteger(value: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

function uniqueFiniteIntegers(values: readonly number[]): number[] {
  return Array.from(new Set(values.filter(Number.isFinite).map(Math.trunc)));
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}
