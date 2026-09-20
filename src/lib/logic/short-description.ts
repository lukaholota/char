import { stripToPlainText } from "@/lib/logic/plain-text";

const MAX_VISIBLE_LENGTH = 240;
const ELLIPSIS = "…";

const MARKUP_TOKEN = /<a\b[^>]*>[\s\S]*?<\/a>|<[^>]+>|\{\{[^}]*\}\}|[^<{]+|[<{]/g;

type Token = { markup: string; visibleLength: number; isText: boolean };

/// Короткий опис — початок повного, урізаний за видимим текстом, а не за символами розмітки:
/// різання по символах лишало в базі `<a href="/2024/rules/` без кінця, і картка показувала
/// сирий тег. Якір чи маркер оригіналу або входить цілим, або не входить зовсім.
export function buildShortDescription(markup: string): string {
  const tokens = splitIntoTokens(markup.trim());
  if (sumVisibleLength(tokens) <= MAX_VISIBLE_LENGTH) return markup.trim();

  const kept = keepTokensWithinLimit(tokens);
  return `${dropUnpairedBold(kept.trimEnd()).replace(/[\s,;:—-]+$/, "")}${ELLIPSIS}`;
}

function splitIntoTokens(markup: string): Token[] {
  return (markup.match(MARKUP_TOKEN) ?? []).map((piece) => {
    const isText = !piece.startsWith("<") && !piece.startsWith("{{");
    return { markup: piece, visibleLength: isText ? piece.length : stripToPlainText(piece).length, isText };
  });
}

function sumVisibleLength(tokens: Token[]) {
  return tokens.reduce((sum, token) => sum + token.visibleLength, 0);
}

function keepTokensWithinLimit(tokens: Token[]) {
  let kept = "";
  let used = 0;
  for (const token of tokens) {
    if (used + token.visibleLength <= MAX_VISIBLE_LENGTH) {
      kept += token.markup;
      used += token.visibleLength;
      continue;
    }
    if (token.isText) kept += cutTextAtWordBoundary(token.markup, MAX_VISIBLE_LENGTH - used);
    break;
  }
  return kept;
}

function cutTextAtWordBoundary(text: string, budget: number) {
  const head = text.slice(0, budget + 1);
  const lastSpace = head.search(/\s\S*$/);
  return lastSpace > 0 ? head.slice(0, lastSpace) : "";
}

function dropUnpairedBold(markup: string) {
  const boldMarkers = markup.match(/\*\*/g)?.length ?? 0;
  if (boldMarkers % 2 === 0) return markup;
  const lastMarker = markup.lastIndexOf("**");
  return markup.slice(0, lastMarker) + markup.slice(lastMarker + 2);
}
