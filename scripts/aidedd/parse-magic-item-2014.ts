import {
  MAGIC_ITEM_KINDS,
  MAGIC_ITEM_RARITIES,
  MagicItemKind,
  MagicItemRarity,
  MagicItemTable,
  ParsedMagicItem,
  RARITY_ORDER,
} from "./magic-item-schema";
import { decodeHtmlEntities, stripHtmlToText } from "./html-statblock";

/// Non-OGL items carry this instead of the real text: aidedd prints a one-line summary and says so.
/// Such an item must never be translated as if it were the rules text — see KR14.2.
const SUMMARY_MARKER = /Description not available/i;

const CURSE_MARKER = /\bcursed?\b/i;
const CONSUMABLE_MARKERS = [
  /\bthis (?:potion|liquid|oil|dust|scroll|ointment)\b/i,
  /\bdisappears\b/i,
  /\bceases to be magical\b/i,
  /\bno longer magical\b/i,
  /\bcrumbles into\b/i,
  /\bsingle use\b/i,
];

export function parseMagicItem2014(html: string, slug: string): ParsedMagicItem {
  const page = cutArticle(html);
  const typeLineEng = readDivText(page, "type");
  const typeLine = splitMagicItemTypeLine(typeLineEng);
  const descriptionHtml = readDivHtml(page, "description");
  const tables = readTables(descriptionHtml);
  const descriptionEng = renderDescription(descriptionHtml);

  return {
    slug,
    nameEng: readHeading(page),
    ruleset: "RULES_2014",
    typeLineEng,
    itemType: typeLine.itemType,
    itemSubtypeEng: typeLine.itemSubtypeEng,
    rarity: typeLine.rarity,
    rarityVariantsEng: typeLine.rarityVariantsEng,
    rarityVariesEng: typeLine.rarityVariesEng,
    bundlesMultipleVariants: typeLine.rarityVariantsEng.length > 1 || typeLine.rarityVariesEng,
    requiresAttunement: typeLine.requiresAttunement,
    attunementConditionEng: typeLine.attunementConditionEng,
    isCursed: CURSE_MARKER.test(descriptionEng),
    isConsumable: CONSUMABLE_MARKERS.some((marker) => marker.test(descriptionEng)),
    isSummaryOnly: SUMMARY_MARKER.test(page),
    descriptionEng,
    tables,
    source: readDivText(page, "source"),
  };
}

export type MagicItemTypeLine = {
  itemType: MagicItemKind | "";
  itemSubtypeEng: string;
  rarity: MagicItemRarity | "";
  rarityVariantsEng: MagicItemRarity[];
  rarityVariesEng: boolean;
  requiresAttunement: boolean;
  attunementConditionEng: string;
};

/// "Wondrous item (tattoo), uncommon (+1) rare (+2) very rare (+3) (requires attunement by a cleric)"
/// splits into kind, parenthesised subtype, one or more rarities, and the attunement tail.
export function splitMagicItemTypeLine(line: string): MagicItemTypeLine {
  const collapsed = collapseInline(line);
  const attunement = splitAttunement(collapsed);
  const head = /^([A-Za-z][A-Za-z ]*?)\s*(?:\(([^)]*)\))?\s*(?:,\s*(.*))?$/.exec(attunement.rest);

  const kind = head ? head[1].trim().toLowerCase() : "";
  const rarityPart = head?.[3] ?? "";
  const rarityVariantsEng = readRarities(rarityPart);

  return {
    itemType: MAGIC_ITEM_KINDS[kind] ?? "",
    itemSubtypeEng: (head?.[2] ?? "").trim(),
    rarity: rarityVariantsEng[0] ?? "",
    rarityVariantsEng,
    rarityVariesEng: /\bvaries\b/i.test(rarityPart),
    requiresAttunement: attunement.requiresAttunement,
    attunementConditionEng: attunement.condition,
  };
}

function splitAttunement(line: string): {
  rest: string;
  requiresAttunement: boolean;
  condition: string;
} {
  const marker = line.toLowerCase().lastIndexOf("(requires attunement");
  if (marker < 0) return { rest: line.replace(/,\s*$/, ""), requiresAttunement: false, condition: "" };

  const tail = line.slice(marker).replace(/^\(/, "").replace(/\)\s*$/, "");
  const condition = tail.replace(/^requires attunement\s*/i, "").trim();

  return {
    rest: line.slice(0, marker).replace(/[,\s]*$/, ""),
    requiresAttunement: true,
    condition,
  };
}

/// Rarities are listed lowest first on the page; the order is preserved so the record builder can
/// pin the +1 / +2 / +3 variants of a bundle to the rarity the page gives each of them.
function readRarities(part: string): MagicItemRarity[] {
  const lower = part.toLowerCase();
  const found: Array<{ rarity: MagicItemRarity; at: number }> = [];

  for (const [word, rarity] of MAGIC_ITEM_RARITIES) {
    for (const match of lower.matchAll(new RegExp(`\\b${word}\\b`, "g"))) {
      if (found.some((entry) => overlaps(entry, match.index, word.length))) continue;
      found.push({ rarity, at: match.index });
    }
  }

  const ordered = found.sort((left, right) => left.at - right.at).map((entry) => entry.rarity);
  return [...new Set(ordered)].sort(
    (left, right) => RARITY_ORDER.indexOf(left) - RARITY_ORDER.indexOf(right)
  );
}

/// "very rare" also matches the bare "rare" pattern; the longer word is registered first, so a
/// later hit that sits inside an already-claimed span is dropped instead of duplicating the rarity.
function overlaps(entry: { rarity: MagicItemRarity; at: number }, at: number, length: number): boolean {
  const claimed = findRarityWordLength(entry.rarity);
  return at >= entry.at && at + length <= entry.at + claimed;
}

function findRarityWordLength(rarity: MagicItemRarity): number {
  const entry = MAGIC_ITEM_RARITIES.find(([, value]) => value === rarity);
  return entry ? entry[0].length : 0;
}

/// The page opens with navigation and closes with a breadcrumb list; only `div.col1` is the item.
function cutArticle(html: string): string {
  const start = html.indexOf("<div class='col1'>");
  if (start < 0) return html;
  const end = html.indexOf("<ol itemscope", start);
  return end > start ? html.slice(start, end) : html.slice(start);
}

function readHeading(html: string): string {
  const match = /<h1>([\s\S]*?)<\/h1>/i.exec(html);
  return match ? stripHtmlToText(match[1]) : "";
}

function readDivText(html: string, className: string): string {
  return collapseInline(stripHtmlToText(readDivHtml(html, className)));
}

function readDivHtml(html: string, className: string): string {
  const pattern = new RegExp(`<div class='${className}'>([\\s\\S]*?)</div>`, "i");
  const match = pattern.exec(html);
  return match ? match[1] : "";
}

function readTables(html: string): MagicItemTable[] {
  return [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)].map((match) => readTable(match[1]));
}

function readTable(inner: string): MagicItemTable {
  const rows = [...inner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
    [...row[1].matchAll(/<(t[hd])[^>]*>([\s\S]*?)<\/\1>/gi)].map((cell) => stripHtmlToText(cell[2]))
  );

  const hasHeader = /<th[\s>]/i.test(inner);
  return {
    headers: hasHeader ? (rows[0] ?? []) : [],
    rows: hasHeader ? rows.slice(1) : rows,
  };
}

/// The description renders through `FormattedDescription` (react-markdown + GFM), so tables become
/// pipe tables and everything else stays plain text with real line breaks.
function renderDescription(html: string): string {
  const withTables = html.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (table) =>
    `\n\n${renderTableAsMarkdown(readTable(table.replace(/^<table[^>]*>|<\/table>$/gi, "")))}\n\n`
  );

  const withBreaks = withTables
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<[^>]*>/g, "");

  return decodeHtmlEntities(withBreaks)
    .split("\n")
    .map((line) => collapseInline(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderTableAsMarkdown(table: MagicItemTable): string {
  const width = Math.max(table.headers.length, ...table.rows.map((row) => row.length), 1);
  const headers = padRow(table.headers, width);
  const divider = Array.from({ length: width }, () => "---");

  return [headers, divider, ...table.rows.map((row) => padRow(row, width))]
    .map((row) => `| ${row.join(" | ")} |`)
    .join("\n");
}

function padRow(row: string[], width: number): string[] {
  return Array.from({ length: width }, (_, index) => row[index] ?? "");
}

function collapseInline(value: string): string {
  return value.replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();
}
