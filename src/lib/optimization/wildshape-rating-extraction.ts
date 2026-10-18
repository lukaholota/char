import { toEntitySlug } from "@/lib/slug-utils";
import { isBeast } from "@/rules/wildshape";
import { findEntryText, splitEntryNodes, type EntryText, type SpellRatingScore } from "./spell-rating-extraction";
import type { AnalysisRating, ArticleDocument, InlineNode, TranslationRevision } from "./types";

export type KnownCreature = { nameEng: string; type: string };

export type WildshapeRatingSource = { score: SpellRatingScore; alternative?: AnalysisRating["alternative"]; sectionId: string; nodes: InlineNode[] };

export type ExtractedWildshapeRatings = {
  forms: Record<string, WildshapeRatingSource>;
  skippedNames: string[];
  unresolvedNames: string[];
};

type ScoredRating = AnalysisRating & { score: SpellRatingScore };
type RatingEntry = { rating: ScoredRating; text: EntryText };

const ENGLISH_NAME_MARKER = /\[([^\]]+)\]|\{\{(?:[^{}|]+\|)?([^{}|]+)\}\}/g;
/// Elemental Wild Shape правила проєкту не підтримують, а оцінка 4/4 на завжди недоступній формі вводила б в оману.
const UNSUPPORTED_SECTIONS = new Set(["section-elemental-forms"]);
/// MPMM перейменував Cow на Ox зі тим самим статблоком.
const FORM_ALIASES: Record<string, string> = { Cow: "Ox" };

export function extractWildshapeRatings(document: ArticleDocument, creatures: readonly KnownCreature[]): ExtractedWildshapeRatings {
  const revision = document.translations.at(-1)!;
  const typeBySlug = new Map(creatures.map((creature) => [toEntitySlug(creature.nameEng), creature.type]));
  const result: ExtractedWildshapeRatings = { forms: {}, skippedNames: [], unresolvedNames: [] };

  for (const entry of listScoredEntries(document, revision)) {
    if (UNSUPPORTED_SECTIONS.has(entry.rating.sectionId)) {
      result.skippedNames.push(entry.rating.context);
      continue;
    }
    const names = listEnglishNames(entry.text.head);
    const slug = names.map(toEntitySlug).find((candidate) => typeBySlug.has(candidate));
    if (!slug) result.unresolvedNames.push(names[0] ?? entry.rating.context);
    else if (!isBeast(typeBySlug.get(slug)!)) result.skippedNames.push(entry.rating.context);
    else addForm(result.forms, slug, entry);
  }
  return { ...result, forms: sortByKey(result.forms) };
}

function listScoredEntries(document: ArticleDocument, revision: TranslationRevision): RatingEntry[] {
  return document.ratings
    .filter((rating): rating is ScoredRating => rating.translationRevisionId === revision.translationRevisionId && rating.score !== undefined)
    .map((rating) => ({ rating, text: findFormText(revision, rating) }));
}

/// Частина оцінок указує на вступний абзац розділу, а не на пункт списку (Анкілозавр) — тоді пункт шукається за назвою.
function findFormText(revision: TranslationRevision, rating: AnalysisRating): EntryText {
  const text = findEntryText(revision, rating);
  if (text.head) return text;
  const item = findListItemByContext(revision, rating);
  return item ? splitEntryNodes(item) : text;
}

function findListItemByContext(revision: TranslationRevision, rating: AnalysisRating): InlineNode[] | null {
  const section = revision.sections.find((entry) => entry.sectionId === rating.sectionId);
  const items = section?.blocks.flatMap((block) => (block.type === "list" ? block.items : [])) ?? [];
  return items.find((item) => item[0]?.text.startsWith(rating.context)) ?? null;
}

function listEnglishNames(text: string): string[] {
  return [...text.matchAll(ENGLISH_NAME_MARKER)].map((match) => {
    const name = (match[1] ?? match[2]).trim();
    return FORM_ALIASES[name] ?? name;
  });
}

function addForm(forms: Record<string, WildshapeRatingSource>, slug: string, entry: RatingEntry) {
  if (forms[slug]) throw new Error(`Дві оцінки однієї форми: ${slug} (${entry.rating.ratingId})`);
  const { score, alternative, sectionId } = entry.rating;
  forms[slug] = { score, ...(alternative && { alternative }), sectionId, nodes: entry.text.bodyNodes };
}

function sortByKey<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)));
}
