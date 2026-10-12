import { buildArticleOutline, buildDraftArticleHref, findDraftRevision } from "./article-view";
import { normalizeSearchText } from "@/lib/search/searchQuery";
import { findAliasVariants } from "@/lib/search/searchAliases";
import type { ArticleDocument, ContentBlock } from "./types";

export type RpgbotSearchArticle = {
  articleId: string;
  title: string;
  titleEn: string;
  href: string;
  topics: string[];
  aliases: string[];
  sections: { sectionId: string; title: string; text: string }[];
};

export type RpgbotSearchArticleNames = Omit<RpgbotSearchArticle, "sections"> & {
  sections: { sectionId: string; title: string }[];
};

export const ENTITY_ALIAS_TYPES = ["class", "subclass", "race", "species", "subrace", "variant", "feat", "background", "spell", "magic-item"];
const SERVICE_SECTION_HEADINGS = new Set(["Як читати оцінки RPGbot", "Зміст"]);
const SERVICE_SECTION_ANCHORS = new Set(["disclaimer", "table-of-contents", "toc"]);

export function buildRpgbotSearchArticles(documents: readonly ArticleDocument[]): RpgbotSearchArticle[] {
  const articles = documents.filter((document) => document.article.ruleset === "RULES_2014")
    .map(buildSearchArticle).sort((left, right) => left.articleId.localeCompare(right.articleId));
  assertUniqueIds(articles.map((article) => article.articleId));
  assertUniqueIds(articles.map((article) => article.href));
  return articles;
}

function buildSearchArticle(document: ArticleDocument): RpgbotSearchArticle {
  const { article } = document;
  const revision = findDraftRevision(document);
  const sections = buildArticleOutline(findDraftRevision(document).sections)
    .filter((section) => !SERVICE_SECTION_HEADINGS.has(section.heading) && !SERVICE_SECTION_ANCHORS.has(section.sourceAnchor ?? "") && section.blocks.length > 0)
    .map((section) => ({ sectionId: section.sectionId, title: section.heading,
      text: collectUniqueWords([...section.blocks.flatMap(collectBlockText), ...document.ratings
        .filter((rating) => rating.translationRevisionId === revision.translationRevisionId && rating.sectionId === section.sectionId)
        .flatMap((rating) => [rating.context, rating.explanation ?? ""])].join(" ")) }));
  assertUniqueIds(sections.map((section) => section.sectionId));
  return { articleId: article.articleId, title: article.titleUk, titleEn: article.titleEn,
    href: buildDraftArticleHref(article.ruleset, article.slug), topics: article.topics,
    aliases: findAliasVariants(article.ruleset, ENTITY_ALIAS_TYPES, [article.titleUk, article.slug, ...findEntityNameKeys(article), ...article.topics]),
    sections };
}

function findEntityNameKeys(article: { slug: string; titleUk: string }): string[] {
  return [article.slug.replace(/-\d{4}$/, ""), article.titleUk.split(" — ")[0]];
}

function collectBlockText(block: ContentBlock): string[] {
  const joinNodes = (nodes: { text: string }[]) => nodes.map((node) => node.text).join("");
  if (block.type === "rating") return [];
  if (block.type === "list") return block.items.map(joinNodes);
  if (block.type === "table") return [...(block.caption ? [block.caption] : []), ...block.headers, ...block.rows.flat()].map(joinNodes);
  return [joinNodes(block.content)];
}

function collectUniqueWords(text: string): string {
  return [...new Set(normalizeSearchText(text).match(/[\p{L}\p{N}']+/gu) ?? [])].join(" ").replaceAll("'", "ʼ");
}

function assertUniqueIds(ids: readonly string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`Duplicate RPGbot search target: ${id}`);
    seen.add(id);
  }
}
