import { describeRating } from "./article-view";
import { isSpellRatingScore } from "./spell-rating-lookup";

export const RATING_FILTER_PARAM = "rate";

const RATING_SCORES_BEST_FIRST = [4, 3, 2, 1] as const;

export function listRatingFilterFacets() {
  return RATING_SCORES_BEST_FIRST.map((score) => ({ value: String(score), label: describeRating({ score, context: "" }).label }));
}

export function matchesRatingSelection(selectedScores: ReadonlySet<string>, bestScore: number | null): boolean {
  if (selectedScores.size === 0) return true;
  return isSpellRatingScore(bestScore) && selectedScores.has(String(bestScore));
}
