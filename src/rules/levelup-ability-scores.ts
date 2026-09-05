import {
  findAbilityScoreCeiling,
  findFeatAbilityScoreSource,
  raiseAbilityScore,
} from "./ability-score-ceiling";
import type { AbilityKey, AbilityScores, Ruleset } from "./types";

/**
 * Характеристики після підвищення рівня: спершу класовий ASI зі звичайною стелею, тоді риса зі
 * своєю. Майстер підвищення і крок хітів рахували це двома різними тілами — і розходилися:
 * майстер додавав `grantedASI.CON` і `grantedASI.basic.simple.CON` разом, крок хітів брав
 * тільки одне з двох. Правильне — друге, так само читає риси серверна транзакція.
 *
 * Вибори риси (`effectKind: "ASI"`) сюди не входять: жоден із двох клієнтів їх не рахував і
 * до KR27.9, тому Стійкість (СТА) у попередньому перегляді хітів не видно як і раніше.
 */

const ABILITIES: readonly AbilityKey[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

type LevelUpAbilityScoreFeat = { category?: string | null; grantedASI?: unknown };

type AbilityScoreIncreasePick = { ability?: string | null; value?: string | number | null };

export function findAbilityScoresAfterLevelUp(input: {
  scores: AbilityScores;
  ruleset: Ruleset | null | undefined;
  classIncreases?: unknown;
  feat?: LevelUpAbilityScoreFeat | null;
}): AbilityScores {
  const withClassIncrease = raiseScoresBy(
    input.scores,
    readClassIncreases(input.classIncreases),
    findAbilityScoreCeiling({ ruleset: input.ruleset, source: "STANDARD" }),
  );

  return raiseScoresBy(
    withClassIncrease,
    readFeatIncreases(input.feat?.grantedASI),
    findAbilityScoreCeiling({ ruleset: input.ruleset, source: findFeatAbilityScoreSource(input.feat?.category) }),
  );
}

function raiseScoresBy(scores: AbilityScores, increases: Partial<Record<AbilityKey, number>>, ceiling: number): AbilityScores {
  const raised = { ...scores };
  for (const ability of ABILITIES) {
    const increase = increases[ability];
    if (increase) raised[ability] = raiseAbilityScore(raised[ability], increase, ceiling);
  }
  return raised;
}

function readClassIncreases(picks: unknown): Partial<Record<AbilityKey, number>> {
  if (!Array.isArray(picks)) return {};

  const increases: Partial<Record<AbilityKey, number>> = {};
  for (const pick of picks as AbilityScoreIncreasePick[]) {
    const ability = toAbilityKey(pick?.ability);
    const value = Number(pick?.value);
    if (!ability || !Number.isFinite(value) || value === 0) continue;
    increases[ability] = (increases[ability] ?? 0) + value;
  }
  return increases;
}

function readFeatIncreases(grantedASI: unknown): Partial<Record<AbilityKey, number>> {
  const record = toRecord(grantedASI);
  if (!record) return {};

  const simple = toRecord(toRecord(record.basic)?.simple);
  return readAbilityMap(simple ?? record);
}

function readAbilityMap(source: Record<string, unknown>): Partial<Record<AbilityKey, number>> {
  const increases: Partial<Record<AbilityKey, number>> = {};
  for (const [key, value] of Object.entries(source)) {
    const ability = toAbilityKey(key);
    const increase = Number(value);
    if (!ability || !Number.isFinite(increase)) continue;
    increases[ability] = (increases[ability] ?? 0) + increase;
  }
  return increases;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function toAbilityKey(value: unknown): AbilityKey | null {
  const upper = String(value ?? "").trim().toUpperCase();
  return (ABILITIES as readonly string[]).includes(upper) ? (upper as AbilityKey) : null;
}
