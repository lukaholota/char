import importedArticles from "./generated/rules-2014.json";
import { getBeyondSrdArticlesByRuleset } from "./rulesBeyondSrdData";
import { findCanonicalSlug, findHandwrittenArticles, RuleArticle, RuleCategoryKey } from "./rulesData";
import { ImportedRuleArticle } from "./rulesProvenance";
export { SRD_5_1_ATTRIBUTION } from "./refs/srd-attribution";

const IMPORTED_RULE_ARTICLES = importedArticles as unknown as ImportedRuleArticle[];

export function getAllRuleArticles2014(): RuleArticle[] {
  return [
    ...findHandwrittenArticles("RULES_2014"),
    ...IMPORTED_RULE_ARTICLES,
    ...getBeyondSrdArticlesByRuleset("RULES_2014"),
  ];
}

export function getImportedRuleArticles2014(): ImportedRuleArticle[] {
  return IMPORTED_RULE_ARTICLES;
}

export function getRuleArticles2014ByCategory(category: RuleCategoryKey): RuleArticle[] {
  return getAllRuleArticles2014()
    .filter((article) => article.category === category)
    .sort(compareByHandwrittenFirst);
}

export function getRuleArticle2014BySlug(category: RuleCategoryKey, slug: string): RuleArticle | undefined {
  const canonical = findCanonicalSlug("RULES_2014", slug);
  return getRuleArticles2014ByCategory(category).find(
    (article) => article.slug === canonical || article.id === slug
  );
}

export function getRuleArticleSummaries2014(): RuleArticle[] {
  return getAllRuleArticles2014().map((article) => ({ ...article, subsections: [] }));
}

function compareByHandwrittenFirst(left: RuleArticle, right: RuleArticle): number {
  const bySource = rankSource(left) - rankSource(right);
  return bySource !== 0 ? bySource : left.order - right.order;
}

function rankSource(article: RuleArticle): number {
  return "provenance" in article ? 1 : 0;
}
