import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { AIDEDD_DIR, findRawDir } from "./aidedd-catalogs";
import { MagicItemManifestRow } from "./build-magic-items-manifest";
import { ParsedMagicItem } from "./magic-item-schema";
import { parseMagicItem2014 } from "./parse-magic-item-2014";
import { indexExistingByMatchKey, readExistingMagicItems, toMatchKey } from "./existing-magic-items";
import { normalize, readRatifiedSpellNames } from "./known-terms";

const MANIFEST_PATH = join(AIDEDD_DIR, "magic-items-manifest.json");
const BRIEFING_DIR = join(AIDEDD_DIR, "briefings");

type SpellReference = { slug: string; ratifiedName: string };
type ItemReference = { slug: string; catalogueName: string };

type BriefingEntry = {
  slug: string;
  nameEng: string;
  magicItemId: number;
  isNewToCatalog: boolean;
  typeLineEng: string;
  itemType: string;
  rarity: string;
  rarityVariantsEng: string[];
  requiresAttunement: boolean;
  attunementConditionEng: string;
  isCursed: boolean;
  isConsumable: boolean;
  descriptionEng: string;
  tables: ParsedMagicItem["tables"];
  currentName: string;
  currentShortDescription: string;
  linkedSpells: SpellReference[];
  linkedItems: ItemReference[];
};

function scanBatch(): void {
  const rows = readManifest();
  const batch = pickBatch(rows);
  const entries = batch.rows.map((row) => buildEntry(row));

  mkdirSync(BRIEFING_DIR, { recursive: true });
  const path = join(BRIEFING_DIR, `magic-items-2014-batch-${String(batch.number).padStart(2, "0")}.json`);
  writeFileSync(path, `${JSON.stringify({ batch: batch.number, entries }, null, 2)}\n`, "utf-8");

  console.log(`✅ партія ${batch.number}: ${entries.length} предметів → ${path}`);
  console.log(`   нових для каталогу: ${entries.filter((entry) => entry.isNewToCatalog).length}`);
  console.log(`   із затвердженими назвами заклинань: ${entries.filter((entry) => entry.linkedSpells.length > 0).length}`);
}

function pickBatch(rows: MagicItemManifestRow[]): { number: number; rows: MagicItemManifestRow[] } {
  const requested = readBatchArgument();
  const pending = rows.filter((row) => row.status === "pending" && row.batch !== 0);
  const number = requested ?? Math.min(...pending.map((row) => row.batch));

  if (!Number.isFinite(number)) {
    throw new Error("Усі партії магічних предметів уже розібрані — черга порожня.");
  }

  const picked = rows.filter((row) => row.batch === number);
  if (picked.length === 0) throw new Error(`Партії ${number} немає в маніфесті.`);
  return { number, rows: picked };
}

function buildEntry(row: MagicItemManifestRow): BriefingEntry {
  const item = readParsedItem(row.slug);
  const existing = indexExistingByMatchKey(readExistingMagicItems());
  const current = existing.get(toMatchKey(item.nameEng));
  const html = readPageHtml(row.slug);

  return {
    slug: item.slug,
    nameEng: item.nameEng,
    magicItemId: row.magicItemId,
    isNewToCatalog: row.isNewToCatalog,
    typeLineEng: item.typeLineEng,
    itemType: item.itemType,
    rarity: item.rarity,
    rarityVariantsEng: item.rarityVariantsEng,
    requiresAttunement: item.requiresAttunement,
    attunementConditionEng: item.attunementConditionEng,
    isCursed: item.isCursed,
    isConsumable: item.isConsumable,
    descriptionEng: item.descriptionEng,
    tables: item.tables,
    currentName: current?.name ?? "",
    currentShortDescription: current?.shortDescription ?? "",
    linkedSpells: readLinkedSpells(html),
    linkedItems: readLinkedItems(html, item.slug),
  };
}

/// Spell names are never re-translated: `dictionary.json → SPELLS` already holds 501 ratified
/// «Українська [English]» strings, and re-translating them is exactly how 51 of the current 248
/// records ended up with an English `shortDescription`.
function readLinkedSpells(html: string): SpellReference[] {
  const ratified = readRatifiedSpellNames();
  const slugs = [...new Set(readLinkedSlugs(html, "sorts.php"))];

  return slugs.map((slug) => ({ slug, ratifiedName: ratified.get(normalize(slug)) ?? "" }));
}

function readLinkedItems(html: string, ownSlug: string): ItemReference[] {
  const existing = readExistingMagicItems();
  const byKey = new Map(existing.map((item) => [toMatchKey(item.engName), item.name]));
  const slugs = [...new Set(readLinkedSlugs(readDescriptionHtml(html), "om.php"))].filter(
    (slug) => slug !== ownSlug
  );

  return slugs.map((slug) => ({ slug, catalogueName: byKey.get(toMatchKey(slug)) ?? "" }));
}

function readLinkedSlugs(html: string, page: string): string[] {
  const pattern = new RegExp(`${page.replace(".", "\\.")}\\?vo=([a-z0-9-]+)`, "g");
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

function readDescriptionHtml(html: string): string {
  const match = /<div class='description'>([\s\S]*?)<\/div>/i.exec(html);
  return match ? match[1] : "";
}

function readParsedItem(slug: string): ParsedMagicItem {
  return parseMagicItem2014(readPageHtml(slug), slug);
}

function readPageHtml(slug: string): string {
  const path = join(findRawDir("magic-items-2014"), `${slug}.html`);
  if (!existsSync(path)) {
    throw new Error(
      `Немає кешованої сторінки ${path} — запусти npx tsx scripts/aidedd/fetch-pages.ts ` +
        `--catalog=magic-items-2014 --only=${slug}`
    );
  }
  return readFileSync(path, "utf-8");
}

function readManifest(): MagicItemManifestRow[] {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`Немає ${MANIFEST_PATH} — спершу npx tsx scripts/aidedd/build-magic-items-manifest.ts`);
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as MagicItemManifestRow[];
}

function readBatchArgument(): number | null {
  const argument = process.argv.find((value) => value.startsWith("--batch="));
  if (!argument) return null;

  const number = Number(argument.slice("--batch=".length));
  if (!Number.isInteger(number) || number <= 0) throw new Error(`Некоректний --batch: ${argument}`);
  return number;
}

scanBatch();
