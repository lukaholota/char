import { hydrateArticleDocument } from "./hydration-catalog";
import { buildCommentMarkdown, type SpellRatingComment } from "./spell-rating-comment-markdown";
import { extractSpellRatings, type KnownSpell, type SpellRatingCommentSource } from "./spell-rating-extraction";
import type { SpellRatingCatalog } from "./spell-rating-lookup";
import type { ArticleDocument, ContentBlock } from "./types";

export type SpellRatingComments = Record<string, Record<string, SpellRatingComment>>;

export type GeneratedSpellRatings = {
  catalog: SpellRatingCatalog;
  comments: SpellRatingComments;
  unresolved: { listKey: string; names: string[] }[];
};

const SPELL_LIST_FILE = /^rpgbot-(.+)-spells-2014\.json$/;

export function findSpellRatingListKey(fileName: string): string | null {
  return SPELL_LIST_FILE.exec(fileName)?.[1] ?? null;
}

export async function buildSpellRatingFiles(
  documentsByListKey: ReadonlyMap<string, ArticleDocument>,
  spells: readonly KnownSpell[],
  sourceUrlBySourceId: ReadonlyMap<string, string>,
): Promise<GeneratedSpellRatings> {
  const result: GeneratedSpellRatings = { catalog: { lists: {} }, comments: {}, unresolved: [] };

  for (const listKey of [...documentsByListKey.keys()].sort()) {
    const document = documentsByListKey.get(listKey)!;
    const extracted = extractSpellRatings(document, spells);
    result.catalog.lists[listKey] = {
      titleUk: document.article.titleUk,
      articleSlug: document.article.slug,
      sourceUrl: findSourceUrl(document, sourceUrlBySourceId),
      scores: extracted.scores,
    };
    result.comments[listKey] = await hydrateComments(document, extracted.comments);
    if (extracted.unresolvedNames.length > 0) result.unresolved.push({ listKey, names: extracted.unresolvedNames });
  }
  return result;
}

async function hydrateComments(document: ArticleDocument, sources: Record<string, SpellRatingCommentSource>): Promise<Record<string, SpellRatingComment>> {
  const slugs = Object.keys(sources);
  const sectionIds = [...new Set(slugs.map((slug) => sources[slug].sectionId))];
  const sections = sectionIds.map((sectionId) => ({
    sectionId,
    heading: sectionId,
    blocks: slugs.filter((slug) => sources[slug].sectionId === sectionId).map((slug): ContentBlock => ({ blockId: slug, type: "paragraph", content: sources[slug].nodes })),
  }));
  const hydrated = await hydrateArticleDocument({ article: document.article, translations: [{ ...document.translations.at(-1)!, sections }] });

  const comments: Record<string, SpellRatingComment> = {};
  for (const section of hydrated.translations[0].sections) {
    for (const block of section.blocks) {
      if (block.type === "paragraph") comments[block.blockId] = { text: buildCommentMarkdown(block.content), sectionId: section.sectionId };
    }
  }
  return comments;
}

function findSourceUrl(document: ArticleDocument, sourceUrlBySourceId: ReadonlyMap<string, string>): string {
  const sourceUrl = sourceUrlBySourceId.get(document.article.sourceId);
  if (!sourceUrl) throw new Error(`No source URL in manifest for ${document.article.articleId}`);
  return sourceUrl;
}
