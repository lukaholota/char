import { buildDraftArticleHref } from "./article-view";
import type { SpellRatingScore } from "./spell-rating-extraction";
import { isSpellRatingScore } from "./spell-rating-lookup";

export type ChoiceOptionRatingList = {
  titleUk: string;
  articleSlug: string;
  sourceUrl: string;
  options: Record<string, { score: number; sectionId: string; comment: string }>;
};

export type ChoiceOptionRatingCatalog = { classes: Record<string, ChoiceOptionRatingList> };

export type ChoiceOptionRating = {
  score: SpellRatingScore;
  comment: string;
  articleSlug: string;
  articleHref: string;
  sourceUrl: string;
};

export type RatedClass = { name: string; ruleset?: string | null };
export type RatedOption = { optionNameEng: string; ruleset?: string | null };

const RATED_RULESET = "RULES_2014";

export function findChoiceOptionRating(catalog: ChoiceOptionRatingCatalog, ratedClass: RatedClass | null | undefined, option: RatedOption): ChoiceOptionRating | null {
  if (!ratedClass || ratedClass.ruleset !== RATED_RULESET || option.ruleset !== RATED_RULESET) return null;
  const list = Object.hasOwn(catalog.classes, ratedClass.name) ? catalog.classes[ratedClass.name] : null;
  const entry = list && Object.hasOwn(list.options, option.optionNameEng) ? list.options[option.optionNameEng] : null;
  if (!list || !entry || !isSpellRatingScore(entry.score)) return null;
  return {
    score: entry.score,
    comment: entry.comment,
    articleSlug: list.articleSlug,
    articleHref: buildDraftArticleHref(RATED_RULESET, list.articleSlug, entry.sectionId),
    sourceUrl: list.sourceUrl,
  };
}
