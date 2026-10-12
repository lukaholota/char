import { spellRatingCatalog } from "./spell-rating-catalog";
import { createSpellRatingFinder, findBestSpellRating } from "./spell-rating-lookup";

export function buildSpellScoreFinder(classKey: string, subclassKey: string | null): (spellEngName: string) => number | undefined {
  const findMatches = createSpellRatingFinder(spellRatingCatalog, [{ className: classKey, subclassName: subclassKey }]);
  return (spellEngName) => findBestSpellRating(findMatches(spellEngName))?.score;
}
