import { requireValidCorpus } from "./validation";
import type { AnalysisArticle, ContentBlock, Corpus, EntityBinding, EntityRef, OptimizationIndices } from "./types";

export function articleHref(article: Pick<AnalysisArticle, "ruleset" | "slug">, sectionId?: string): string {
  const prefix = article.ruleset === "RULES_2024" ? "/2024" : "";
  return `${prefix}/optimization/${article.slug}${sectionId ? `#${sectionId}` : ""}`;
}

function blockText(block: ContentBlock): string {
  const join = (content: { text: string }[]) => content.map((node) => node.text).join("");
  if (block.type === "rating") return "";
  if (block.type === "list") return block.items.map(join).join(" ");
  if (block.type === "table") return [...block.headers, ...block.rows.flat()].map(join).join(" ");
  return join(block.content);
}

function compareStableIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function articleSummary(article: AnalysisArticle, corpus: Corpus) {
  const revision = corpus.translations.find((entry) => entry.translationRevisionId === article.publishedRevisionId)!;
  return { articleId: article.articleId, slug: article.slug, ruleset: article.ruleset, titleUk: article.titleUk,
    titleEn: article.titleEn, topics: article.topics, translationRevisionId: revision.translationRevisionId,
    sourceRevisionId: revision.sourceRevisionId, stale: revision.status === "stale", href: articleHref(article),
    sections: revision.sections.map((section) => ({ sectionId: section.sectionId, heading: section.heading })) };
}

function bindingPreview(binding: EntityBinding, corpus: Corpus) {
  const article = corpus.articles.find((entry) => entry.articleId === binding.articleId)!;
  const ratings = binding.ratingIds.map((id) => {
    const rating = corpus.ratings.find((entry) => entry.ratingId === id)!;
    return { ratingId: rating.ratingId, score: rating.score, sourceColor: rating.sourceColor, context: rating.context };
  });
  return { ...binding, translationRevisionId: article.publishedRevisionId!, href: articleHref(article, binding.sectionId), ratings };
}

function sectionSearch(article: AnalysisArticle, corpus: Corpus) {
  const revision = corpus.translations.find((entry) => entry.translationRevisionId === article.publishedRevisionId)!;
  return revision.sections.map((section) => ({ articleId: article.articleId, sectionId: section.sectionId,
    ruleset: article.ruleset, title: section.heading, href: articleHref(article, section.sectionId),
    text: [article.titleUk, article.titleEn, section.heading, ...section.blocks.map(blockText),
      ...corpus.ratings.filter((rating) => rating.translationRevisionId === revision.translationRevisionId && rating.sectionId === section.sectionId)
        .sort((left, right) => compareStableIds(left.ratingId, right.ratingId))
        .map((rating) => [rating.context, rating.explanation].filter(Boolean).join(" "))].filter(Boolean).join(" ") }));
}

export function generateIndices(input: unknown, catalog: readonly EntityRef[] = []): OptimizationIndices {
  const corpus = requireValidCorpus(input, catalog);
  const published = corpus.articles.filter((article) => article.status === "published" && article.ruleset === "RULES_2014")
    .sort((left, right) => compareStableIds(left.articleId, right.articleId));
  const publishedIds = new Set(published.map((article) => article.articleId));
  const bindings = corpus.bindings.filter((binding) => publishedIds.has(binding.articleId)).sort((left, right) => compareStableIds(left.bindingId, right.bindingId));
  return { articles: published.map((article) => articleSummary(article, corpus)),
    bindings: bindings.map((binding) => bindingPreview(binding, corpus)),
    search: published.flatMap((article) => sectionSearch(article, corpus)) };
}
