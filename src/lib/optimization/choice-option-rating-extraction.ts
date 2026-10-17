import type { SpellRatingScore } from "./spell-rating-extraction";
import type { AnalysisRating, ArticleDocument, InlineNode, TranslationRevision } from "./types";

export type RatedChoiceGroup = { sectionId: string; optionNames: readonly string[] };

export type ChoiceOptionRatingSource = { score: SpellRatingScore; sectionId: string; nodes: InlineNode[] };

export type ExtractedChoiceOptionRatings = { options: Record<string, ChoiceOptionRatingSource>; unratedNames: string[] };

type ScoredRating = AnalysisRating & { score: SpellRatingScore };
type RatedEntry = { head: string; bodyNodes: InlineNode[] };

const ENTRY_HEAD = /^\s*([^:]*\}\})\s*:\s*/;
const ENGLISH_NAME_MARKER = /\{\{(?:[^{}|]+\|)?([^{}|]+)\}\}/g;

export function extractChoiceOptionRatings(document: ArticleDocument, groups: readonly RatedChoiceGroup[]): ExtractedChoiceOptionRatings {
  const revision = document.translations.at(-1)!;
  const options: Record<string, ChoiceOptionRatingSource> = {};

  for (const group of groups) {
    const knownNames = new Set(group.optionNames);
    for (const rating of listScoredRatings(document, revision, group.sectionId)) {
      const entry = splitRatedEntry(findRatedNodes(revision, rating));
      const name = listEnglishNames(entry.head).find((candidate) => knownNames.has(candidate));
      if (name) addOption(options, name, { score: rating.score, sectionId: rating.sectionId, nodes: entry.bodyNodes });
    }
  }
  const unratedNames = groups.flatMap((group) => group.optionNames).filter((name) => !Object.hasOwn(options, name));
  return { options: sortByKey(options), unratedNames };
}

function listScoredRatings(document: ArticleDocument, revision: TranslationRevision, sectionId: string): ScoredRating[] {
  return document.ratings.filter(
    (rating): rating is ScoredRating =>
      rating.translationRevisionId === revision.translationRevisionId && rating.sectionId === sectionId && rating.score !== undefined,
  );
}

/// Прокляття в гайді — окремі абзаци, а обряди й мутагени — пункти списку.
function findRatedNodes(revision: TranslationRevision, rating: AnalysisRating): InlineNode[] {
  const section = revision.sections.find((entry) => entry.sectionId === rating.sectionId);
  const block = section?.blocks.find((entry) => entry.blockId === rating.targetBlockId);
  if (block?.type === "paragraph") return block.content;
  const itemIndex = /-item-(\d+)$/.exec(rating.optionId ?? "")?.[1];
  return block?.type === "list" && itemIndex !== undefined ? (block.items[Number(itemIndex)] ?? []) : [];
}

function splitRatedEntry(nodes: InlineNode[]): RatedEntry {
  const [first, ...rest] = nodes;
  const head = first?.type === "text" ? ENTRY_HEAD.exec(first.text) : null;
  if (!first || !head) return { head: "", bodyNodes: nodes };
  const firstBody = first.text.slice(head[0].length);
  return { head: head[1], bodyNodes: [...(firstBody ? [{ ...first, text: firstBody }] : []), ...rest] };
}

function listEnglishNames(text: string): string[] {
  return [...text.matchAll(ENGLISH_NAME_MARKER)].map((match) => match[1].trim());
}

function addOption(options: Record<string, ChoiceOptionRatingSource>, name: string, source: ChoiceOptionRatingSource) {
  if (Object.hasOwn(options, name)) throw new Error(`Дві оцінки одного варіанта: ${name}`);
  options[name] = source;
}

function sortByKey<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)));
}
