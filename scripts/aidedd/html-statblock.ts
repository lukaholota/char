import { StatblockEntry } from "./creature-schema";
import { collapseSpaces } from "./statblock-fields";

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  ccedil: "ç",
  deg: "°",
  times: "×",
  raquo: "»",
  laquo: "«",
  emsp: " ",
  ensp: " ",
};

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (whole, name) => NAMED_ENTITIES[name.toLowerCase()] ?? whole);
}

export function stripHtmlToText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>/g, "");
  return collapseSpaces(decodeHtmlEntities(withBreaks));
}

export function findFieldValue(html: string, label: string): string {
  const pattern = new RegExp(
    `<strong[^>]*>\\s*${escapeForRegExp(label)}\\s*</strong>([\\s\\S]*?)(?=<(?:br|strong|div|h2|p|/div)\\b)`,
    "i"
  );
  const match = pattern.exec(html);
  return match ? stripHtmlToText(match[1]).replace(/^[:\s]+/, "") : "";
}

export function findParagraphEntries(html: string): StatblockEntry[] {
  const entries: StatblockEntry[] = [];

  for (const match of html.matchAll(/<p>([\s\S]*?)<\/p>/gi)) {
    const inner = match[1];
    const named = /^\s*<strong>\s*<em>([\s\S]*?)<\/em>\s*<\/strong>\s*\.?\s*([\s\S]*)$/i.exec(inner);

    if (named) {
      entries.push({
        name: stripHtmlToText(named[1]).replace(/\.$/, ""),
        text: stripHtmlToText(named[2]).replace(/^\.\s*/, ""),
      });
      continue;
    }

    const text = stripHtmlToText(inner);
    if (text !== "") entries.push({ name: "", text });
  }

  return entries;
}

export function findPictureUrl(html: string, baseUrl: string): string {
  const match = /<div class='picture'>[\s\S]*?<img[^>]*src='([^']+)'/i.exec(html);
  if (!match) return "";

  const src = decodeHtmlEntities(match[1]);
  return src.startsWith("http") ? src : `${baseUrl}${src.replace(/^\.?\//, "")}`;
}

export function findHeadingText(html: string): string {
  const match = /<h1>([\s\S]*?)<\/h1>/i.exec(html);
  return match ? stripHtmlToText(match[1]) : "";
}

export function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
