import importedArticles from "./generated/rules-2024.json";
import { RULE_ARTICLES_2024, RuleArticle, RuleCategoryKey } from "./rulesData";

export type ImportedRuleArticle = RuleArticle & {
  sourceFile: "playing-the-game" | "rules-glossary";
  srdCommit: string;
  isTranslated: boolean;
};

export const SRD_2024_ATTRIBUTION = {
  text: "Правила 2024 перекладено з System Reference Document 5.2.1 (Wizards of the Coast), ліцензія CC BY 4.0.",
  licenseName: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/legalcode",
  sourceName: "SRD 5.2.1",
  sourceUrl: "https://www.dndbeyond.com/srd",
};

const IMPORTED_RULE_ARTICLES = importedArticles as unknown as ImportedRuleArticle[];

export function getAllRuleArticles2024(): RuleArticle[] {
  return [...RULE_ARTICLES_2024, ...IMPORTED_RULE_ARTICLES];
}

export function getImportedRuleArticles2024(): ImportedRuleArticle[] {
  return IMPORTED_RULE_ARTICLES;
}

export function getRuleArticles2024ByCategory(category: RuleCategoryKey): RuleArticle[] {
  return getAllRuleArticles2024()
    .filter((article) => article.category === category)
    .sort(compareByHandwrittenFirst);
}

export function getRuleArticle2024BySlug(category: RuleCategoryKey, slug: string): RuleArticle | undefined {
  return getRuleArticles2024ByCategory(category).find(
    (article) => article.slug === slug || article.id === slug
  );
}

export function getRuleArticleSummaries2024(): RuleArticle[] {
  return getAllRuleArticles2024().map((article) => ({ ...article, subsections: [] }));
}

function compareByHandwrittenFirst(left: RuleArticle, right: RuleArticle): number {
  const bySource = rankSource(left) - rankSource(right);
  return bySource !== 0 ? bySource : left.order - right.order;
}

function rankSource(article: RuleArticle): number {
  return "sourceFile" in article ? 1 : 0;
}
