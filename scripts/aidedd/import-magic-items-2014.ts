import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { AIDEDD_DIR, findRawDir } from "./aidedd-catalogs";
import { MagicItemManifestRow } from "./build-magic-items-manifest";
import { MagicItemRecord, buildMagicItemRecord } from "./build-magic-item-record";
import { indexExistingByMatchKey, readExistingMagicItems, toMatchKey } from "./existing-magic-items";
import { parseMagicItem2014 } from "./parse-magic-item-2014";
import { readTranslationBatches } from "./read-magic-item-batches";

const MANIFEST_PATH = join(AIDEDD_DIR, "magic-items-manifest.json");
const CORPUS_PATH = join(AIDEDD_DIR, "magic-items-2014.json");
const DIFF_PATH = join(AIDEDD_DIR, "magic-items-diff.md");

/// The English page comes from the cache, the Ukrainian text from a batch file and the public id
/// from the manifest — this is the only place the three meet. It decides nothing on its own.
function importMagicItems2014(): void {
  const records = buildRecords();
  writeFileSync(CORPUS_PATH, `${JSON.stringify(records, null, 2)}\n`, "utf-8");
  writeFileSync(DIFF_PATH, renderDiff(records), "utf-8");

  console.log(`✅ ${CORPUS_PATH}: ${records.length} записів`);
  console.log(`✅ ${DIFF_PATH}`);
  console.log(`   нових для каталогу: ${records.filter((record) => record.isNewToCatalog).length}`);
}

export function buildRecords(): MagicItemRecord[] {
  const rows = readManifestRows();
  const existing = indexExistingByMatchKey(readExistingMagicItems());

  return readTranslationBatches()
    .filter((translation) => translation.deferred === undefined)
    .map((translation) => {
      const row = rows.get(translation.slug);
      if (!row) throw new Error(`У маніфесті немає рядка для «${translation.slug}»`);

      const source = parseMagicItem2014(readPageHtml(translation.slug), translation.slug);
      return buildMagicItemRecord(source, translation, row, existing.get(toMatchKey(source.nameEng)));
    });
}

function renderDiff(records: MagicItemRecord[]): string {
  const existing = indexExistingByMatchKey(readExistingMagicItems());

  const lines = [
    "# Що змінює імпорт O14 у наявному каталозі",
    "",
    "> Згенеровано `npx tsx scripts/aidedd/import-magic-items-2014.ts`. Руками не редагувати.",
    "",
    `Перекладених предметів: **${records.length}**. ` +
      `З них нових для каталогу: **${records.filter((record) => record.isNewToCatalog).length}**.`,
    "",
    "`magicItemId` — публічний URL (`/magic-items/NNNN`), тож для збігів він не рухається;",
    "механічні колонки (`bonusToAC`, `bonusToSavingThrows`, `givesSpells`…) переносяться як є.",
    "",
  ];

  for (const record of records) {
    const before = existing.get(toMatchKey(record.engName));
    lines.push(`## ${record.engName} · id ${record.magicItemId}`, "");

    if (!before) {
      lines.push("**Новий запис.**", "", `- назва: ${record.name}`, `- підпис: ${record.shortDescription}`, "");
      continue;
    }

    lines.push(
      ...renderFieldDiff("назва", before.name, record.name),
      ...renderFieldDiff("підпис", before.shortDescription ?? "(порожньо)", record.shortDescription),
      ...renderFieldDiff("тип", before.itemType, record.itemType),
      ...renderFieldDiff("рідкість", before.rarity, record.rarity),
      ...renderFieldDiff(
        "налаштування",
        String(before.requiresAttunement),
        String(record.requiresAttunement)
      ),
      ""
    );
  }

  return `${lines.join("\n")}\n`;
}

function renderFieldDiff(label: string, before: string, after: string): string[] {
  if (before === after) return [];
  return [`- **${label}**`, `  - було: ${before}`, `  - стало: ${after}`];
}

function readManifestRows(): Map<string, MagicItemManifestRow> {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`Немає ${MANIFEST_PATH} — спершу build-magic-items-manifest.ts`);
  }
  const rows = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as MagicItemManifestRow[];
  return new Map(rows.map((row) => [row.slug, row]));
}

function readPageHtml(slug: string): string {
  const path = join(findRawDir("magic-items-2014"), `${slug}.html`);
  if (!existsSync(path)) throw new Error(`Немає кешованої сторінки ${path}`);
  return readFileSync(path, "utf-8");
}

if (process.argv[1]?.endsWith("import-magic-items-2014.ts")) importMagicItems2014();
