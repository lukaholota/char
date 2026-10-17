import { stripGlossaryMarkers } from "@/lib/refs/glossary-marker";
import { isRpgbotAbbreviationsHref } from "./rpgbot-source-codes";
import type { AnalysisRating, InlineNode } from "./types";

type LinkNode = Extract<InlineNode, { type: "link" }>;

const FORMATTED_TYPES: readonly InlineNode["type"][] = ["link", "strong", "emphasis", "superscript", "subscript"];
const LEADING_MARKER = /^(»?)(\{\{[^{}]+\}\})/;

export function joinLeadingMarkers(nodes: readonly InlineNode[]): InlineNode[] {
  const joined: InlineNode[] = [];
  for (const node of nodes) {
    const previous = joined[joined.length - 1];
    const match = node.type === "text" && previous && FORMATTED_TYPES.includes(previous.type) ? LEADING_MARKER.exec(node.text) : null;
    if (!match || node.type !== "text") {
      joined.push(node);
      continue;
    }
    joined[joined.length - 1] = { ...previous, text: `${previous.text}${match[2]}` };
    const rest = `${match[1]}${node.text.slice(match[0].length)}`;
    if (rest) joined.push({ type: "text", text: rest });
  }
  return joined;
}

const MAX_LABEL_LENGTH = 90;
const MAX_LABEL_WORDS = 9;

export type RatedLabelSplit = { label: InlineNode[]; rest: InlineNode[] };

export function splitRatedLabel(nodes: readonly InlineNode[]): RatedLabelSplit | undefined {
  const label: InlineNode[] = [];
  for (const [index, node] of nodes.entries()) {
    const colonAt = node.type === "text" ? node.text.search(/:(?:\s|$)/) : -1;
    if (node.type !== "text" || colonAt < 0) {
      label.push(node);
      continue;
    }
    const nameBeforeColon = node.text.slice(0, colonAt);
    if (nameBeforeColon) label.push({ type: "text", text: nameBeforeColon });
    const rest: InlineNode[] = [{ type: "text", text: node.text.slice(colonAt) }, ...nodes.slice(index + 1)];
    return isShortLabel(label) ? { label, rest } : undefined;
  }
  return undefined;
}

function isShortLabel(label: readonly InlineNode[]): boolean {
  const plain = stripGlossaryMarkers(label.map((node) => node.text).join("")).trim();
  return plain.length > 0 && plain.length <= MAX_LABEL_LENGTH && plain.split(/\s+/).length <= MAX_LABEL_WORDS;
}

const LEGEND_SCORES = { Червоний: 1, Помаранчевий: 2, Зелений: 3, Синій: 4 } as const;

export function findLegendRating(nodes: readonly InlineNode[]): Pick<AnalysisRating, "score" | "context"> | undefined {
  const first = nodes[0];
  if (first?.type !== "text") return undefined;
  const legend = Object.entries(LEGEND_SCORES).find(([colorWord]) => first.text.startsWith(`${colorWord}: `));
  return legend ? { score: legend[1], context: "" } : undefined;
}

export type LinkCardView = { title: string; href: string; isExternal: boolean; source: string };

export function findLoneLink(nodes: readonly InlineNode[]): LinkNode | undefined {
  const [only] = nodes;
  return nodes.length === 1 && only.type === "link" && !isRpgbotAbbreviationsHref(only.href) ? only : undefined;
}

export function describeLinkCard(node: LinkNode, link: { href: string; isExternal: boolean }): LinkCardView {
  return { title: stripGlossaryMarkers(node.text), href: link.href, isExternal: link.isExternal, source: describeLinkSource(link) };
}

function describeLinkSource(link: { href: string; isExternal: boolean }): string {
  if (!link.isExternal) return "Український переклад";
  const host = readHostName(link.href);
  return host === "rpgbot.net" ? "RPGbot — оригінал англійською" : host;
}

function readHostName(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

export function isOwnArticleLink(href: string, ownArticlePath: string): boolean {
  return href === ownArticlePath || href.startsWith(`${ownArticlePath}#`);
}

export function findLinkCards(
  items: readonly (readonly InlineNode[])[],
  resolveLink: (href: string) => { href: string; isExternal: boolean },
  ownArticlePath: string,
): LinkCardView[] | undefined {
  const links = items.flatMap((item) => findLoneLink(item) ?? []);
  if (!links.length || links.length !== items.length) return undefined;
  const cards = links.map((link) => describeLinkCard(link, resolveLink(link.href)));
  return cards.some((card) => isOwnArticleLink(card.href, ownArticlePath)) ? undefined : cards;
}

export type JargonTerm = { term: string; expansion: string; explanation: string };

export const JARGON_TERMS: readonly JargonTerm[] = [
  {
    term: "MAD",
    expansion: "Multiple Ability Dependent",
    explanation: "Залежність від багатьох характеристик: щоб клас працював на повну, потрібні одразу кілька високих показників, тож бали доводиться ділити між ними.",
  },
  {
    term: "SAD",
    expansion: "Single Ability Dependent",
    explanation: "Залежність від однієї характеристики: усе головне в класі працює від одного показника, а решту балів можна вкласти куди завгодно.",
  },
];

const JARGON_PATTERN = new RegExp(`\\b(${JARGON_TERMS.map((entry) => entry.term).join("|")})\\b`);

export type JargonSegment = { text: string; jargon?: JargonTerm };

export function splitJargon(text: string): JargonSegment[] {
  return text.split(JARGON_PATTERN).flatMap((part, index): JargonSegment[] => {
    if (part === "") return [];
    if (index % 2 === 0) return [{ text: part }];
    return [{ text: part, jargon: JARGON_TERMS.find((entry) => entry.term === part) }];
  });
}

export type LineBreakPart = { kind: "text"; text: string } | { kind: "line" } | { kind: "paragraph" };

export function splitLineBreaks(text: string): LineBreakPart[] {
  return text
    .split(/(\n+)/)
    .filter(Boolean)
    .map((part): LineBreakPart => {
      if (!part.startsWith("\n")) return { kind: "text", text: part };
      return part.length > 1 ? { kind: "paragraph" } : { kind: "line" };
    });
}
