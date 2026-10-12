import { stripGlossaryMarkers } from "@/lib/refs/glossary-marker";
import type { AnalysisRating, ArticleDocument, ContentBlock, InlineNode, OptimizationRuleset, TranslationRevision } from "./types";

const DRAFT_ARTICLES_PATHS = { RULES_2014: "/rules/optimization", RULES_2024: "/2024/rules/optimization" } as const;
const RULES_PATHS = { RULES_2014: "/rules", RULES_2024: "/2024/rules" } as const;

export function findDraftArticlesPath(ruleset: OptimizationRuleset): string {
  return DRAFT_ARTICLES_PATHS[ruleset];
}

export function findRulesPath(ruleset: OptimizationRuleset): string {
  return RULES_PATHS[ruleset];
}

type ListBlock = Extract<ContentBlock, { type: "list" }>;

export type OutlineSection = {
  sectionId: string;
  parentSectionId?: string;
  heading: string;
  depth: number;
  sourceAnchor?: string;
  blocks: ContentBlock[];
};

export function buildArticleOutline(sections: TranslationRevision["sections"]): OutlineSection[] {
  const parentIds = new Set(sections.flatMap((section) => (section.parentSectionId ? [section.parentSectionId] : [])));
  const depths = new Map<string, number>();
  return sections.flatMap((section) => {
    const depth = section.parentSectionId ? (depths.get(section.parentSectionId) ?? 0) + 1 : 0;
    depths.set(section.sectionId, depth);
    if (!section.blocks.length && !parentIds.has(section.sectionId)) return [];
    return [{ sectionId: section.sectionId, parentSectionId: section.parentSectionId, heading: section.heading, depth, sourceAnchor: section.sourceAnchor, blocks: section.blocks }];
  });
}

type RevisionSection = TranslationRevision["sections"][number];

export function findSectionSubtree(sections: readonly RevisionSection[], sectionId: string): readonly RevisionSection[] {
  if (!sections.some((section) => section.sectionId === sectionId)) return sections;
  const includedIds = new Set<string>();
  return sections.filter((section) => {
    const isIncluded = section.sectionId === sectionId || (section.parentSectionId !== undefined && includedIds.has(section.parentSectionId));
    if (isIncluded) includedIds.add(section.sectionId);
    return isIncluded;
  });
}

export type OutlineNode = OutlineSection & { children: OutlineNode[] };

export function buildOutlineTree(outline: readonly OutlineSection[]): OutlineNode[] {
  const nodeById = new Map<string, OutlineNode>();
  const roots: OutlineNode[] = [];
  for (const section of outline) {
    const node: OutlineNode = { ...section, children: [] };
    nodeById.set(section.sectionId, node);
    const parent = section.parentSectionId ? nodeById.get(section.parentSectionId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  return roots;
}

export type SectionTocEntry = {
  id: string;
  title: string;
  href: string;
  samePage: true;
  subsections: { id: string; title: string; href: string; samePage: true }[];
};

export function buildSectionTocEntries(tree: readonly OutlineNode[]): SectionTocEntry[] {
  return tree.map((node) => ({
    id: node.sectionId, title: node.heading, href: `#${node.sectionId}`, samePage: true,
    subsections: listDescendants(node).map((child) => ({ id: child.sectionId, title: child.heading, href: `#${child.sectionId}`, samePage: true as const })),
  }));
}

function listDescendants(node: OutlineNode): OutlineNode[] {
  return node.children.flatMap((child) => [child, ...listDescendants(child)]);
}

export function findHeadingLevel(depth: number): 2 | 3 | 4 | 5 | 6 {
  return Math.min(depth + 2, 6) as 2 | 3 | 4 | 5 | 6;
}

export type ListNode = { itemIndex: number; content: InlineNode[]; ordered: boolean; children: ListNode[] };

export function buildListTree(block: ListBlock): ListNode[] {
  const roots: ListNode[] = [];
  const path: ListNode[] = [];
  block.items.forEach((content, itemIndex) => {
    const depth = block.depths?.[itemIndex] ?? 0;
    const ordered = block.itemKinds ? block.itemKinds[itemIndex] === "ordered" : block.ordered;
    const node: ListNode = { itemIndex, content, ordered, children: [] };
    path.length = depth;
    (depth === 0 ? roots : path[depth - 1].children).push(node);
    path[depth] = node;
  });
  return roots;
}

export function groupListNodesByKind(nodes: readonly ListNode[]): { ordered: boolean; nodes: ListNode[] }[] {
  const groups: { ordered: boolean; nodes: ListNode[] }[] = [];
  for (const node of nodes) {
    const last = groups[groups.length - 1];
    if (last?.ordered === node.ordered) last.nodes.push(node);
    else groups.push({ ordered: node.ordered, nodes: [node] });
  }
  return groups;
}

export type RatingIndex = ReadonlyMap<string, AnalysisRating>;

export function isHeadingRating(rating: Pick<AnalysisRating, "sectionId" | "optionId">): boolean {
  return rating.optionId === rating.sectionId;
}

export function findHeadingRating(ratings: readonly AnalysisRating[], sectionId: string): AnalysisRating | undefined {
  return ratings.find((rating) => rating.sectionId === sectionId && isHeadingRating(rating));
}

export function buildRatingIndex(ratings: readonly AnalysisRating[], blocks: readonly ContentBlock[]): RatingIndex {
  const blockById = new Map(blocks.map((block) => [block.blockId, block]));
  return new Map(
    ratings
      .filter((rating) => !isHeadingRating(rating))
      .map((rating) => [buildIndexKey(rating, blockById.get(rating.targetBlockId)), rating])
  );
}

function buildIndexKey(rating: AnalysisRating, block: ContentBlock | undefined): string {
  const header = block?.type === "table" ? readRatingHeader(rating) : undefined;
  if (header !== undefined) return `${rating.targetBlockId}#header-${header}`;
  const cell = block?.type === "table" ? readRatingCell(rating) : undefined;
  if (cell) return buildCellRatingKey(rating.targetBlockId, cell.rowIndex, cell.cellIndex);
  return buildRatingKey(rating.targetBlockId, findRatingItemIndex(rating, block));
}

export function readRatingHeader(rating: Pick<AnalysisRating, "optionId">): number | undefined {
  const match = /-header-(\d+)$/.exec(rating.optionId ?? "");
  return match ? Number(match[1]) : undefined;
}

export function findHeaderRating(index: RatingIndex, blockId: string, cellIndex: number): AnalysisRating | undefined {
  return index.get(`${blockId}#header-${cellIndex}`);
}

export function readRatingCell(rating: Pick<AnalysisRating, "optionId">): { rowIndex: number; cellIndex: number } | undefined {
  const match = /-row-(\d+)-(\d+)$/.exec(rating.optionId ?? "");
  return match ? { rowIndex: Number(match[1]), cellIndex: Number(match[2]) } : undefined;
}

export function findCellRating(index: RatingIndex, blockId: string, rowIndex: number, cellIndex: number): AnalysisRating | undefined {
  return index.get(buildCellRatingKey(blockId, rowIndex, cellIndex));
}

function buildCellRatingKey(blockId: string, rowIndex: number, cellIndex: number): string {
  return `${blockId}#cell-${rowIndex}-${cellIndex}`;
}

export function findRatingItemIndex(rating: Pick<AnalysisRating, "optionId" | "context">, block: ContentBlock | undefined): number | undefined {
  if (block?.type !== "list") return undefined;
  const indexFromOption = readRatingItemIndex(rating);
  if (indexFromOption !== undefined) return indexFromOption;
  const matches = block.items.flatMap((item, itemIndex) => (startsWithName(readPlainText(item), rating.context) ? [itemIndex] : []));
  return matches.length === 1 ? matches[0] : undefined;
}

function startsWithName(text: string, name: string): boolean {
  return text.startsWith(name) && !/[\p{L}\p{N}]/u.test(text.charAt(name.length));
}

function readPlainText(nodes: readonly InlineNode[]): string {
  return stripGlossaryMarkers(nodes.map((node) => node.text).join(""));
}

export function findRating(index: RatingIndex, blockId: string, itemIndex?: number): AnalysisRating | undefined {
  return index.get(buildRatingKey(blockId, itemIndex));
}

export function readRatingItemIndex(rating: Pick<AnalysisRating, "optionId">): number | undefined {
  const match = /-item-(\d+)$/.exec(rating.optionId ?? "");
  return match ? Number(match[1]) : undefined;
}

function buildRatingKey(blockId: string, itemIndex: number | undefined): string {
  return `${blockId}#${itemIndex ?? "block"}`;
}

export type RatingTone = "red" | "orange" | "green" | "blue" | "none";
export type RatingDescription = { tone: RatingTone; score?: 1 | 2 | 3 | 4; label: string; hint?: string; summary: string };

const RATING_LEVELS = {
  1: { tone: "red", label: "Погано", hint: "Погані, марні або вкрай ситуативні варіанти. Майже ніколи не корисні." },
  2: { tone: "orange", label: "Прийнятно", hint: "Прийнятні варіанти або корисні лише за рідкісних обставин. Іноді стають у пригоді." },
  3: { tone: "green", label: "Добре", hint: "Хороші варіанти. Часто корисні." },
  4: { tone: "blue", label: "Чудово", hint: "Чудові варіанти, нерідко необхідні для роботи персонажа. Дуже часто корисні." },
} as const;

export function describeRating(rating: Pick<AnalysisRating, "score" | "context">): RatingDescription {
  const subject = rating.context ? `Оцінка «${rating.context}»` : "Оцінка";
  if (rating.score === undefined) {
    return { tone: "none", label: "Без оцінки", summary: `${subject}: автор її не поставив` };
  }
  const level = RATING_LEVELS[rating.score];
  return {
    tone: level.tone,
    score: rating.score,
    label: level.label,
    hint: level.hint,
    summary: `${subject}: ${rating.score} з 4, ${level.label.toLowerCase()}`,
  };
}

export type DraftSummary = {
  articleId: string;
  slug: string;
  ruleset: ArticleDocument["article"]["ruleset"];
  titleUk: string;
  titleEn: string;
  topics: string[];
  revisionStatus: TranslationRevision["status"];
  sectionCount: number;
  ratingCount: number;
  imageSrc?: string | null;
};

export function findDraftRevision(document: ArticleDocument): TranslationRevision {
  return document.translations[document.translations.length - 1];
}

export function summarizeDraft(document: ArticleDocument): DraftSummary {
  const revision = findDraftRevision(document);
  const { article } = document;
  return {
    articleId: article.articleId,
    slug: article.slug,
    ruleset: article.ruleset,
    titleUk: article.titleUk,
    titleEn: article.titleEn,
    topics: article.topics,
    revisionStatus: revision.status,
    sectionCount: buildArticleOutline(revision.sections).length,
    ratingCount: document.ratings.filter((rating) => rating.translationRevisionId === revision.translationRevisionId).length,
  };
}

export function buildDraftArticleHref(ruleset: OptimizationRuleset, slug: string, sectionId?: string): string {
  return `${findDraftArticlesPath(ruleset)}/${slug}${sectionId ? `#${sectionId}` : ""}`;
}

export type DraftGroup = { title: string; summaries: DraftSummary[] };

export function groupDraftSummaries(summaries: readonly DraftSummary[]): DraftGroup[] {
  const byTitle = new Map<string, DraftSummary[]>();
  for (const summary of summaries) {
    const title = capitalizeFirstLetter(summary.topics[0] ?? "Інше");
    byTitle.set(title, [...(byTitle.get(title) ?? []), summary]);
  }
  return [...byTitle.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "uk"))
    .map(([title, entries]) => ({ title, summaries: [...entries].sort((left, right) => left.titleUk.localeCompare(right.titleUk, "uk")) }));
}

function capitalizeFirstLetter(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export type LinkTarget = { slug: string; ruleset: OptimizationRuleset; sectionIdByAnchor: Readonly<Record<string, string>> };
export type LinkTargets = ReadonlyMap<string, LinkTarget>;
export type ResolvedLink = { href: string; isExternal: boolean; isSamePage?: boolean };

export function buildLinkTargets(drafts: readonly { sourceUrl: string; slug: string; ruleset: OptimizationRuleset; sections: TranslationRevision["sections"] }[]): LinkTargets {
  return new Map(drafts.map((draft) => [normalizeSourceUrl(draft.sourceUrl).key, {
    slug: draft.slug,
    ruleset: draft.ruleset,
    sectionIdByAnchor: Object.fromEntries(buildArticleOutline(draft.sections).flatMap((section) => (section.sourceAnchor ? [[section.sourceAnchor, section.sectionId]] : []))),
  }]));
}

export function pickLinkedTargets(targets: LinkTargets, hrefs: readonly string[]): [string, LinkTarget][] {
  const linkedKeys = new Set(hrefs.map((href) => normalizeSourceUrl(href).key));
  return [...targets].filter(([key]) => linkedKeys.has(key));
}

export function resolveArticleLink(href: string, targets: LinkTargets): ResolvedLink {
  const { key, anchor } = normalizeSourceUrl(href);
  const target = targets.get(key);
  if (!target) return { href, isExternal: /^https?:/i.test(href) };
  return { href: buildDraftArticleHref(target.ruleset, target.slug, anchor ? findSectionIdForAnchor(target.sectionIdByAnchor, anchor) : undefined), isExternal: false };
}

function findSectionIdForAnchor(sectionIdByAnchor: Readonly<Record<string, string>>, anchor: string): string | undefined {
  if (sectionIdByAnchor[anchor]) return sectionIdByAnchor[anchor];
  const endings = Object.keys(sectionIdByAnchor).filter((candidate) => anchor.endsWith(`-${candidate}`));
  return endings.length === 1 ? sectionIdByAnchor[endings[0]] : undefined;
}

function normalizeSourceUrl(href: string): { key: string; anchor?: string } {
  try {
    const url = new URL(href);
    const path = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
    return { key: `${url.origin}${path}`, anchor: url.hash.slice(1) || undefined };
  } catch {
    return { key: href };
  }
}
