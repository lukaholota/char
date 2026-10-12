import type { ArticleDocument, ContentBlock, EntityBinding, TranslationRevision } from "./types";

function buildFeatureChildren(block: Extract<ContentBlock, { type: "list" }>, index: number) {
  const depth = block.depths?.[index] ?? 0;
  let end = index + 1;
  while (end < block.items.length && (block.depths?.[end] ?? 0) > depth) end++;
  if (end === index + 1) return undefined;
  return { ...block, blockId: `${block.blockId}-feature-${index}`,
    items: block.items.slice(index + 1, end),
    depths: block.depths?.slice(index + 1, end).map((childDepth) => childDepth - depth - 1),
    itemKinds: block.itemKinds?.slice(index + 1, end) };
}

export function findBoundFeatureContent(revision: TranslationRevision, binding: EntityBinding) {
  const section = revision.sections.find((entry) => entry.sectionId === binding.sectionId);
  for (const block of section?.blocks ?? []) {
    if (block.type !== "list") continue;
    const index = block.items.findIndex((_, index) => binding.optionId === `${section!.sectionId}-${block.blockId}-item-${index}`);
    if (index >= 0) return { content: block.items[index], blockId: block.blockId, childrenBlock: buildFeatureChildren(block, index) };
  }
}

export function findBoundFeatureRating(document: ArticleDocument, binding: EntityBinding) {
  return document.ratings.find((rating) => binding.ratingIds.includes(rating.ratingId) && rating.optionId === binding.optionId && rating.sectionId === binding.sectionId && rating.translationRevisionId === document.translations.at(-1)?.translationRevisionId);
}
