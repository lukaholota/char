import { toEntitySlug } from "@/lib/slug-utils";
import type { AnalysisRating, ArticleDocument, ContentBlock, InlineNode, TranslationRevision } from "./types";

export type SpellRatingScore = 1 | 2 | 3 | 4;
export type KnownSpell = { engName: string; level: number };

export type SpellRatingCommentSource = { nodes: InlineNode[]; sectionId: string };
export type SpellRatingAlternative = { score: SpellRatingScore; condition: string };

export type ExtractedSpellRatings = {
  scores: Record<string, SpellRatingScore>;
  comments: Record<string, SpellRatingCommentSource>;
  alternatives: Record<string, SpellRatingAlternative>;
  unresolvedNames: string[];
};

type ScoredRating = AnalysisRating & { score: SpellRatingScore };
export type EntryText = { head: string; bodyNodes: InlineNode[] };
type RatingEntry = { rating: ScoredRating; text: EntryText };
type ResolvedEntry = RatingEntry & { slug: string };

const ENTRY_HEAD_WITH_SOURCE = /^.{0,120}?\)\s*:\s*/;
const ENTRY_HEAD_WITHOUT_SOURCE = /^[^:()]{0,80}\]\s*:\s*/;
const ENGLISH_NAME_MARKER = /\[([^\]]+)\]|\{\{([^{}|]+)\}\}/g;
const OPTION_NAMES_THAT_ARE_NOT_SPELLS = new Set(["dismissal"]);

export function extractSpellRatings(document: ArticleDocument, spells: readonly KnownSpell[]): ExtractedSpellRatings {
  const revision = document.translations.at(-1)!;
  const levelBySlug = new Map(spells.map((spell) => [toEntitySlug(spell.engName), spell.level]));
  const entries = document.ratings
    .filter((rating): rating is ScoredRating => rating.translationRevisionId === revision.translationRevisionId && rating.score !== undefined)
    .map((rating): RatingEntry => ({ rating, text: findEntryText(revision, rating) }));
  const { resolved, unresolvedNames } = resolveEntriesToSpells(entries, levelBySlug);

  const scores: ExtractedSpellRatings["scores"] = {};
  const comments: ExtractedSpellRatings["comments"] = {};
  const alternatives: ExtractedSpellRatings["alternatives"] = {};
  for (const [slug, candidates] of groupBySlug(resolved)) {
    const chosen = chooseEntryForSpellLevel(candidates, levelBySlug.get(slug)!);
    scores[slug] = chosen.rating.score;
    if (chosen.text.bodyNodes.length > 0) comments[slug] = { nodes: chosen.text.bodyNodes, sectionId: chosen.rating.sectionId };
    if (chosen.rating.alternative) alternatives[slug] = { score: chosen.rating.alternative.score, condition: chosen.rating.alternative.condition };
  }
  return { scores: sortBySlug(scores), comments: sortBySlug(comments), alternatives: sortBySlug(alternatives), unresolvedNames };
}

function resolveEntriesToSpells(entries: RatingEntry[], levelBySlug: ReadonlyMap<string, number>) {
  const resolved: ResolvedEntry[] = [];
  const unresolvedNames: string[] = [];
  for (const entry of entries) {
    const slug = findKnownSpellSlug(entry, levelBySlug);
    if (slug) resolved.push({ ...entry, slug });
    else if (!isOptionOfAnotherSpell(entry)) unresolvedNames.push(entry.rating.context);
  }
  return { resolved, unresolvedNames };
}

function findKnownSpellSlug(entry: RatingEntry, levelBySlug: ReadonlyMap<string, number>): string | null {
  const names = [...listEnglishNames(entry.rating.context).reverse(), ...listEnglishNames(entry.text.head)];
  return names.map(toEntitySlug).find((slug) => levelBySlug.has(slug)) ?? null;
}

function isOptionOfAnotherSpell(entry: RatingEntry): boolean {
  return listEnglishNames(entry.text.head).some((name) => OPTION_NAMES_THAT_ARE_NOT_SPELLS.has(name.toLowerCase()));
}

function listEnglishNames(text: string): string[] {
  return [...text.matchAll(ENGLISH_NAME_MARKER)].map((match) => (match[1] ?? match[2]).trim());
}

function groupBySlug(entries: ResolvedEntry[]): Map<string, ResolvedEntry[]> {
  const groups = new Map<string, ResolvedEntry[]>();
  for (const entry of entries) groups.set(entry.slug, [...(groups.get(entry.slug) ?? []), entry]);
  return groups;
}

function chooseEntryForSpellLevel(candidates: ResolvedEntry[], spellLevel: number): ResolvedEntry {
  return candidates.find((entry) => findSectionSpellLevel(entry.rating.sectionId) === spellLevel) ?? candidates[0];
}

function findSectionSpellLevel(sectionId: string): number | null {
  if (sectionId === "section-cantrips") return 0;
  const match = /^section-spells-(\d)$/.exec(sectionId);
  return match ? Number(match[1]) : null;
}

export function findEntryText(revision: TranslationRevision, rating: AnalysisRating): EntryText {
  const nodes = findListItemNodes(revision, rating);
  if (nodes) return splitEntryNodes(nodes);
  return { head: "", bodyNodes: buildPlainNodes(rating.explanation ?? "") };
}

function findListItemNodes(revision: TranslationRevision, rating: AnalysisRating): InlineNode[] | null {
  const itemIndex = /-item-(\d+)$/.exec(rating.optionId ?? "")?.[1];
  if (itemIndex === undefined) return null;
  const block = findBlock(revision, rating);
  return block?.type === "list" ? (block.items[Number(itemIndex)] ?? null) : null;
}

function findBlock(revision: TranslationRevision, rating: AnalysisRating): ContentBlock | undefined {
  const section = revision.sections.find((entry) => entry.sectionId === rating.sectionId);
  return section?.blocks.find((block) => block.blockId === rating.targetBlockId);
}

export function splitEntryNodes(nodes: InlineNode[]): EntryText {
  const colonIndex = nodes.findIndex((node, index) => index > 0 && node.type === "text" && /^\s*:/.test(node.text));
  if (colonIndex < 0) return splitEntryText(joinNodes(nodes));
  const [colonNode, ...rest] = nodes.slice(colonIndex);
  const firstBodyNodes = buildPlainNodes(colonNode.text.replace(/^\s*:\s*/, ""), colonNode);
  return { head: joinNodes(nodes.slice(0, colonIndex)), bodyNodes: [...firstBodyNodes, ...rest] };
}

function splitEntryText(text: string): EntryText {
  const head = ENTRY_HEAD_WITH_SOURCE.exec(text)?.[0] ?? ENTRY_HEAD_WITHOUT_SOURCE.exec(text)?.[0] ?? "";
  return { head, bodyNodes: buildPlainNodes(text.slice(head.length)) };
}

function buildPlainNodes(text: string, template: InlineNode = { type: "text", text }): InlineNode[] {
  return text.length > 0 ? [{ ...template, text }] : [];
}

function joinNodes(nodes: InlineNode[]): string {
  return nodes.map((node) => node.text).join("");
}

function sortBySlug<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)));
}
