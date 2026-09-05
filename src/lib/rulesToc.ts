import { RuleArticle, RuleCategory, RuleCategoryKey } from "@/lib/rulesData";

/// Зміст довідника показує дерево всіх розділів, а не лише відкритого, тому йому потрібні назви
/// й якорі чужих статей — але не їхній текст. Проєкція лишає в payload сторінки самі заголовки.
export type TocArticle = {
  slug: string;
  title: string;
  subsections: { id: string; title: string }[];
};

export type RulesTocIndex = Record<string, TocArticle[]>;

export function buildRulesTocIndex(
  categories: RuleCategory[],
  findArticles: (category: RuleCategoryKey) => RuleArticle[],
): RulesTocIndex {
  const index: RulesTocIndex = {};

  for (const category of categories) {
    index[category.key] = findArticles(category.key).map(toTocArticle);
  }

  return index;
}

function toTocArticle(article: RuleArticle): TocArticle {
  return {
    slug: article.slug,
    title: article.title,
    subsections: article.subsections.map((sub) => ({ id: sub.id, title: sub.title })),
  };
}
