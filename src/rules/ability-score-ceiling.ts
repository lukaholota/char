import type { Ruleset } from "./types";

/**
 * Стеля характеристики одна на весь проєкт. До KR27.9 число 20 стояло літералом у семи місцях —
 * серверна транзакція підвищення, чиста функція переходу, майстер, крок хітів, форма виборів
 * риси, створення й обидві стратегії редакцій, — і жодне з них не знало про епічні дари.
 */

/** «This feat can't increase an ability score above 20» — SRD 2024, feats.md; те саме в PHB 2014. */
export const STANDARD_ABILITY_SCORE_CEILING = 20;

/** «Increase one ability score of your choice by 1, to a maximum of 30» — SRD 2024, feats.md, усі 12 дарів. */
export const EPIC_BOON_ABILITY_SCORE_CEILING = 30;

const EPIC_BOON_FEAT_CATEGORY = "EPIC_BOON";

export type AbilityScoreIncreaseSource = "STANDARD" | "EPIC_BOON";

export function findAbilityScoreCeiling(input: {
  ruleset: Ruleset | null | undefined;
  source: AbilityScoreIncreaseSource;
}): number {
  if (input.ruleset !== "RULES_2024") return STANDARD_ABILITY_SCORE_CEILING;
  return input.source === "EPIC_BOON" ? EPIC_BOON_ABILITY_SCORE_CEILING : STANDARD_ABILITY_SCORE_CEILING;
}

export function findFeatAbilityScoreSource(featCategory: string | null | undefined): AbilityScoreIncreaseSource {
  return featCategory === EPIC_BOON_FEAT_CATEGORY ? "EPIC_BOON" : "STANDARD";
}

/**
 * Підвищення ніколи не знижує показник: персонаж, який дійшов до ХАР 21 епічним даром на 19-му,
 * бере 20-й рівень зі звичайною стелею 20 — і має лишитися з 21.
 */
export function raiseAbilityScore(score: number, increase: number, ceiling: number): number {
  if (!Number.isFinite(score)) return score;
  const raised = Number.isFinite(increase) ? score + increase : score;
  return Math.max(score, Math.min(ceiling, raised));
}
