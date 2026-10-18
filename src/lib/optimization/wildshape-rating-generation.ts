import { toEntitySlug } from "@/lib/slug-utils";
import { hydrateArticleDocument } from "./hydration-catalog";
import { flattenLinksLeavingPicker } from "./picker-links";
import { buildCommentMarkdown } from "./spell-rating-comment-markdown";
import { extractWildshapeRatings, type KnownCreature, type WildshapeRatingSource } from "./wildshape-rating-extraction";
import type { WildshapeRatingCatalog } from "./wildshape-rating-lookup";
import type { ArticleDocument, ContentBlock, TranslationRevision } from "./types";

export type GeneratedWildshapeRatings = { catalog: WildshapeRatingCatalog; skippedNames: string[]; unresolvedNames: string[] };

type ArticleSection = TranslationRevision["sections"][number];
type ParagraphBlock = Extract<ContentBlock, { type: "paragraph" }>;
type MarkdownByBlockId = ReadonlyMap<string, string>;

const MOVEMENT_NOTE_SECTION = "section-animal-forms";
const MOON_CIRCLE_SUBCLASS = "CIRCLE_OF_THE_MOON";

export async function buildWildshapeRatingCatalog(
  document: ArticleDocument,
  creatures: readonly KnownCreature[],
  sourceUrl: string,
): Promise<GeneratedWildshapeRatings> {
  const extracted = extractWildshapeRatings(document, creatures);
  const revision = document.translations.at(-1)!;
  const ratedSections = listRatedSections(revision.sections, extracted.forms);
  const creatureSlugs = new Set(creatures.map((creature) => toEntitySlug(creature.nameEng)));
  const markdown = await hydrateToMarkdown(document, buildHydrationSections(ratedSections, extracted.forms), creatureSlugs);

  const catalog: WildshapeRatingCatalog = {
    titleUk: document.article.titleUk,
    articleSlug: document.article.slug,
    sourceUrl,
    movementNote: findIntroMarkdown(findSection(revision.sections, MOVEMENT_NOTE_SECTION), markdown).join("\n\n"),
    sections: buildSectionNotes(ratedSections, markdown),
    forms: buildFormRatings(extracted.forms, markdown),
  };
  return { catalog, skippedNames: extracted.skippedNames, unresolvedNames: extracted.unresolvedNames };
}

function listRatedSections(sections: readonly ArticleSection[], forms: Record<string, WildshapeRatingSource>): ArticleSection[] {
  return [...new Set(Object.values(forms).map((form) => form.sectionId))].map((sectionId) => findSection(sections, sectionId));
}

/// Вступні абзаци й коментарі форм гідратуються одним проходом, як коментарі заклинань: блок коментаря носить slug форми замість blockId.
function buildHydrationSections(ratedSections: readonly ArticleSection[], forms: Record<string, WildshapeRatingSource>): ArticleSection[] {
  return ratedSections.map((section) => ({
    ...section,
    blocks: [
      ...findIntroParagraphs(section),
      ...Object.entries(forms)
        .filter(([, form]) => form.sectionId === section.sectionId)
        .map(([slug, form]): ContentBlock => ({ blockId: slug, type: "paragraph", content: form.nodes })),
    ],
  }));
}

async function hydrateToMarkdown(document: ArticleDocument, sections: ArticleSection[], creatureSlugs: ReadonlySet<string>): Promise<MarkdownByBlockId> {
  const movementSection = findSection(document.translations.at(-1)!.sections, MOVEMENT_NOTE_SECTION);
  const allSections = [{ ...movementSection, blocks: findIntroParagraphs(movementSection) }, ...sections];
  const hydrated = await hydrateArticleDocument({ article: document.article, translations: [{ ...document.translations.at(-1)!, sections: allSections }] });
  return new Map(
    hydrated.translations[0].sections.flatMap((section) =>
      section.blocks.flatMap((block) => (block.type === "paragraph" ? [[block.blockId, buildCommentMarkdown(flattenLinksLeavingPicker(block.content, creatureSlugs))] as const] : [])),
    ),
  );
}

function buildSectionNotes(ratedSections: readonly ArticleSection[], markdown: MarkdownByBlockId): WildshapeRatingCatalog["sections"] {
  return Object.fromEntries(ratedSections.map((section) => [section.sectionId, { title: section.heading, notes: findIntroMarkdown(section, markdown) }]));
}

function buildFormRatings(forms: Record<string, WildshapeRatingSource>, markdown: MarkdownByBlockId): WildshapeRatingCatalog["forms"] {
  return Object.fromEntries(Object.entries(forms).map(([slug, form]) => [slug, { score: form.score, ...findMoonScore(form), sectionId: form.sectionId, comment: markdown.get(slug) ?? "" }]));
}

function findMoonScore(form: WildshapeRatingSource): { moonScore?: number } {
  return form.alternative?.subclassKeys?.includes(MOON_CIRCLE_SUBCLASS) ? { moonScore: form.alternative.score } : {};
}

function findSection(sections: readonly ArticleSection[], sectionId: string): ArticleSection {
  const section = sections.find((entry) => entry.sectionId === sectionId);
  if (!section) throw new Error(`У статті немає розділу ${sectionId}`);
  return section;
}

function findIntroParagraphs(section: ArticleSection): ParagraphBlock[] {
  const listIndex = section.blocks.findIndex((block) => block.type === "list");
  const intro = listIndex < 0 ? section.blocks : section.blocks.slice(0, listIndex);
  return intro.filter((block): block is ParagraphBlock => block.type === "paragraph");
}

function findIntroMarkdown(section: ArticleSection, markdown: MarkdownByBlockId): string[] {
  return findIntroParagraphs(section).map((block) => markdown.get(block.blockId) ?? "").filter((text) => text.length > 0);
}
