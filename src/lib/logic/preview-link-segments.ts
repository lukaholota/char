import { stripToPlainText } from "@/lib/logic/plain-text";
import { findSpellLinkInHref, type SpellLink } from "@/lib/spell-link";
import { findTermLinkInHref, type TermLink } from "@/lib/term-link";

export type PreviewSegment = { text: string; spellLink?: SpellLink; termLink?: TermLink; href?: string };

const ANCHOR_PATTERN = /<a\s+[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
const PLACEHOLDER_PATTERN = /(\d+)/g;

export function splitIntoLinkSegments(markup: string): PreviewSegment[] {
  const linkAnchors: PreviewSegment[] = [];
  const withPlaceholders = replaceLinkAnchorsWithPlaceholders(markup, linkAnchors);
  const plain = stripToPlainText(withPlaceholders);
  return splitOnPlaceholders(plain, linkAnchors);
}

function replaceLinkAnchorsWithPlaceholders(markup: string, linkAnchors: PreviewSegment[]) {
  return markup.replace(ANCHOR_PATTERN, (anchor, href: string, label: string) => {
    const link = findPreviewLink(href);
    if (!link) return anchor;
    linkAnchors.push({ text: stripToPlainText(label), ...link });
    return `${linkAnchors.length - 1}`;
  });
}

function findPreviewLink(href: string): Pick<PreviewSegment, "spellLink" | "termLink" | "href"> | null {
  const spellLink = findSpellLinkInHref(href);
  if (spellLink) return { spellLink };
  const termLink = findTermLinkInHref(href);
  return termLink ? { termLink, href } : null;
}

function splitOnPlaceholders(plain: string, linkAnchors: PreviewSegment[]) {
  const segments: PreviewSegment[] = [];
  let textStart = 0;
  for (const match of plain.matchAll(PLACEHOLDER_PATTERN)) {
    pushText(segments, plain.slice(textStart, match.index));
    segments.push(linkAnchors[Number(match[1])]);
    textStart = match.index + match[0].length;
  }
  pushText(segments, plain.slice(textStart));
  return segments;
}

function pushText(segments: PreviewSegment[], text: string) {
  if (text) segments.push({ text });
}
