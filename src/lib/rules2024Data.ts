import importedArticles from "./generated/rules-2024.json";
import {
  ConditionData,
  findCanonicalSlug,
  findHandwrittenArticles,
  getAllConditions,
  RuleArticle,
  RuleCategoryKey,
} from "./rulesData";
import { ImportedRuleArticle } from "./rulesProvenance";
import { getBeyondSrdArticlesByRuleset } from "./rulesBeyondSrdData";
export { SRD_2024_ATTRIBUTION } from "./refs/srd-attribution";

const IMPORTED_RULE_ARTICLES = importedArticles as unknown as ImportedRuleArticle[];

export function getAllRuleArticles2024(): RuleArticle[] {
  return [
    ...findHandwrittenArticles("RULES_2024"),
    ...IMPORTED_RULE_ARTICLES,
    ...getBeyondSrdArticlesByRuleset("RULES_2024"),
  ];
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
  const canonical = findCanonicalSlug("RULES_2024", slug);
  return getRuleArticles2024ByCategory(category).find(
    (article) => article.slug === canonical || article.id === slug
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
  return "provenance" in article ? 1 : 0;
}

/// Стани 2024 живуть у SRD-корпусі, а не в CONDITIONS_DATA: там лежать стани 2014 і
/// Закривавлений, якого у 2014 немає. Оглядова стаття «Стан» — не стан, тому й не тут.
export function getConditions2024(): ConditionData[] {
  const fromSrd = IMPORTED_RULE_ARTICLES.filter(
    (article) => article.category === "conditions" && article.slug !== "condition"
  ).map(buildConditionFromArticle);

  return [...fromSrd, ...getAllConditions("RULES_2024")];
}

function buildConditionFromArticle(article: ImportedRuleArticle): ConditionData {
  const body = article.subsections.map((subsection) => subsection.content).join("\n\n");
  const paragraphs = body.split("\n\n").map((paragraph) => paragraph.trim()).filter(Boolean);

  return {
    id: article.slug,
    name: article.title,
    engName: article.engTitle,
    ruleset: "RULES_2024",
    description: paragraphs[0] ?? article.summary,
    bulletPoints: paragraphs.slice(1).map(stripEmphasis),
  };
}

function stripEmphasis(paragraph: string): string {
  return paragraph.replace(/^[-*]\s+/, "").replace(/_([^_]+)_/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1");
}
