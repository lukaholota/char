import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { AIDEDD_DIR, findRawDir } from "./aidedd-catalogs";
import { ParsedMagicItem, RARITY_ORDER } from "./magic-item-schema";
import { parseMagicItem2014 } from "./parse-magic-item-2014";
import { ExistingMagicItem, indexExistingByMatchKey, readExistingMagicItems, toMatchKey } from "./existing-magic-items";
import { readTranslatedSlugs } from "./read-magic-item-batches";

const MANIFEST_PATH = join(AIDEDD_DIR, "magic-items-manifest.json");
const BATCH_SIZE = 30;

/// Existing catalogue ids run 1…1224 and the 2024 pool is addressed as 20000 + index, so imports
/// that have no catalogue row of their own start here. `magicItemId` is a public URL — a matched
/// item always keeps the id it already has (KR14.2 §6).
const FIRST_IMPORT_ID = 1301;

/// `deferred` is not a stage of the import: aidedd prints "Description not available (not OGL)"
/// for 191 of the 473 pages and gives a one-line summary instead of the rules text. Those pages
/// carry nothing to translate, so they never enter a batch — inventing text for them is the one
/// failure mode this pipeline exists to avoid.
export type MagicItemImportStatus = "pending" | "translated" | "verified" | "deferred";

export type MagicItemManifestRow = {
  nameEng: string;
  slug: string;
  status: MagicItemImportStatus;
  magicItemId: number;
  batch: number;
  isNewToCatalog: boolean;
  isSummaryOnly: boolean;
  coversExistingEngNames: string[];
  note: string;
};

function buildMagicItemsManifest(): void {
  const previous = readPreviousRows();
  const items = readParsedItems();
  const existing = readExistingMagicItems();
  const rows = buildRows(items, existing, previous);

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(rows, null, 2)}\n`, "utf-8");
  printSummary(rows);
}

function buildRows(
  items: ParsedMagicItem[],
  existing: ExistingMagicItem[],
  previous: Map<string, MagicItemManifestRow>
): MagicItemManifestRow[] {
  const byMatchKey = indexExistingByMatchKey(existing);
  const coverage = mapExistingToPages(items, existing);
  const translated = readTranslatedSlugs();

  let nextId = findNextImportId(previous);
  let nextBatchPosition = 0;

  return items.map((item) => {
    const kept = previous.get(item.slug);
    const matched = byMatchKey.get(toMatchKey(item.nameEng));
    const magicItemId = matched?.magicItemId ?? kept?.magicItemId ?? nextId;
    if (magicItemId === nextId) nextId += 1;

    let batch = 0;
    if (!item.isSummaryOnly) {
      batch = kept?.batch && kept.batch !== 0 ? kept.batch : Math.floor(nextBatchPosition / BATCH_SIZE) + 1;
      if (!(kept?.batch && kept.batch !== 0)) nextBatchPosition += 1;
    }

    return {
      nameEng: item.nameEng,
      slug: item.slug,
      status: findStatus(item, translated.has(item.slug), kept),
      magicItemId,
      batch,
      isNewToCatalog: matched === undefined,
      isSummaryOnly: item.isSummaryOnly,
      coversExistingEngNames: coverage.get(item.slug) ?? [],
      note: describeRow(item, matched, coverage.get(item.slug) ?? []),
    };
  });
}

function findStatus(
  item: ParsedMagicItem,
  isTranslated: boolean,
  kept: MagicItemManifestRow | undefined
): MagicItemImportStatus {
  if (item.isSummaryOnly) return "deferred";
  if (kept?.status === "verified") return "verified";
  return isTranslated ? "translated" : "pending";
}

function describeRow(
  item: ParsedMagicItem,
  matched: ExistingMagicItem | undefined,
  covers: string[]
): string {
  const notes: string[] = [];
  if (item.isSummaryOnly) notes.push("тільки резюме (не OGL) — повного тексту правил на сторінці немає");
  if (item.rarity === "") notes.push(`рідкість не зчитується: «${item.typeLineEng}»`);
  if (item.itemType === "") notes.push(`тип не зчитується: «${item.typeLineEng}»`);
  if (covers.length > 0) notes.push(`бандл: наш каталог тримає ${covers.length} записів на цю сторінку`);
  if (matched === undefined && covers.length === 0) notes.push("нового предмета в каталозі немає");
  return notes.join("; ");
}

/// Our catalogue splits several aidedd pages into per-variant rows (14 ioun stones, 6 giant-strength
/// belts, 9 figurines…). Token containment finds them without a hand-written list: a page claims a
/// catalogue row when every word of the page name appears in the row name.
function mapExistingToPages(
  items: ParsedMagicItem[],
  existing: ExistingMagicItem[]
): Map<string, string[]> {
  const matchedKeys = new Set(items.map((item) => toMatchKey(item.nameEng)));
  const pages = items
    .map((item) => ({ slug: item.slug, tokens: readTokens(item.nameEng) }))
    .sort((left, right) => right.tokens.length - left.tokens.length);

  const coverage = new Map<string, string[]>();

  for (const item of existing) {
    if (matchedKeys.has(toMatchKey(item.engName))) continue;
    const tokens = new Set(readTokens(item.engName));
    const page = pages.find((candidate) => candidate.tokens.every((token) => tokens.has(token)));
    if (!page) continue;
    coverage.set(page.slug, [...(coverage.get(page.slug) ?? []), item.engName]);
  }

  return coverage;
}

const IGNORED_TOKENS = new Set(["of", "the", "a", "an", "and", "or"]);

function readTokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token !== "" && !IGNORED_TOKENS.has(token));
}

function readParsedItems(): ParsedMagicItem[] {
  const dir = findRawDir("magic-items-2014");
  if (!existsSync(dir)) throw new Error(`Немає ${dir}. Спершу fetch-pages.ts --catalog=magic-items-2014`);

  const items = readdirSync(dir)
    .filter((file) => file.endsWith(".html"))
    .map((file) => parseMagicItem2014(readFileSync(join(dir, file), "utf-8"), file.replace(/\.html$/, "")));

  return items.sort((left, right) => {
    const byRarity = findRarityRank(left) - findRarityRank(right);
    return byRarity !== 0 ? byRarity : left.slug.localeCompare(right.slug);
  });
}

/// Items whose page says "rarity varies" are the bundles our catalogue splits per variant, and the
/// split policy is still the owner's open question — they sort to the end so the early batches are
/// not blocked on it.
function findRarityRank(item: ParsedMagicItem): number {
  return item.rarity === "" ? RARITY_ORDER.length : RARITY_ORDER.indexOf(item.rarity);
}

function readPreviousRows(): Map<string, MagicItemManifestRow> {
  if (!existsSync(MANIFEST_PATH)) return new Map();
  const rows = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as MagicItemManifestRow[];
  return new Map(rows.map((row) => [row.slug, row]));
}

function findNextImportId(previous: Map<string, MagicItemManifestRow>): number {
  const assigned = [...previous.values()]
    .filter((row) => row.isNewToCatalog)
    .map((row) => row.magicItemId);
  return assigned.length === 0 ? FIRST_IMPORT_ID : Math.max(...assigned, FIRST_IMPORT_ID - 1) + 1;
}

function printSummary(rows: MagicItemManifestRow[]): void {
  const counts = new Map<MagicItemImportStatus, number>();
  for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);

  const batches = Math.max(...rows.map((row) => row.batch));
  const bundled = rows.filter((row) => row.coversExistingEngNames.length > 0);
  const queued = rows.filter((row) => row.batch !== 0).length;

  console.log(`✅ ${MANIFEST_PATH}`);
  console.log(`   ${rows.length} рядків, у черзі ${queued}, ${batches} партій по ${BATCH_SIZE}`);
  console.log(`   статуси: ${[...counts].map(([status, count]) => `${status} ${count}`).join(", ")}`);
  console.log(`   нових для каталогу: ${rows.filter((row) => row.isNewToCatalog).length}`);
  console.log(`   тільки резюме (не OGL): ${rows.filter((row) => row.isSummaryOnly).length}`);
  console.log(
    `   бандлів: ${bundled.length} сторінок покривають ` +
      `${bundled.reduce((sum, row) => sum + row.coversExistingEngNames.length, 0)} наших записів`
  );
}

buildMagicItemsManifest();
