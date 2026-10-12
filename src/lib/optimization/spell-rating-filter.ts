import { describeRating } from "./article-view";
import { RECOMMENDED_MIN_SCORE, isSpellRatingScore } from "./spell-rating-lookup";

export const RATING_FILTER_PARAM = "rate";

const RATING_SCORES_BEST_FIRST = [4, 3, 2, 1] as const;
const RECOMMENDED_SCORES = RATING_SCORES_BEST_FIRST.filter((score) => score >= RECOMMENDED_MIN_SCORE).map(String).reverse();

export function listRatingFilterFacets() {
  return RATING_SCORES_BEST_FIRST.map((score) => ({ value: String(score), label: describeRating({ score, context: "" }).label }));
}

export function isRecommendedSelection(selectedScores: ReadonlySet<string>): boolean {
  return selectedScores.size === RECOMMENDED_SCORES.length && RECOMMENDED_SCORES.every((score) => selectedScores.has(score));
}

export function toggleRecommendedParam(params: URLSearchParams, selectedScores: ReadonlySet<string>) {
  if (isRecommendedSelection(selectedScores)) params.delete(RATING_FILTER_PARAM);
  else params.set(RATING_FILTER_PARAM, RECOMMENDED_SCORES.join(","));
}

export function matchesRatingSelection(selectedScores: ReadonlySet<string>, bestScore: number | null): boolean {
  if (selectedScores.size === 0) return true;
  return isSpellRatingScore(bestScore) && selectedScores.has(String(bestScore));
}
