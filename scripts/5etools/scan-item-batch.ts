

import { readMagicItemBaseline } from "../../prisma/seed/magicItemBaseline";
import { applyBatchesToBaseline, readMagicItemBatches } from "../../prisma/seed/magicItemBatches";
import { normalize, readRatifiedSpellNames } from "../aidedd/known-terms";
import {
  ItemBatchRow,
  findItemFacts,
  findPinnedVariants,
  readItemBatchRows,
  readItemCorpus,
} from "./item-batches";
import { SourceItemVariant } from "./source-item";

/// Вхід перекладача партії: англійський текст із пінованого корпусу, машинні поля, які
/// перекладач не задає, ратифіковані назви привʼязаних заклинань і — для наявних рядків —
/// текст, що зараз стоїть у каталозі. Читати корпус очима замість цього не можна: у проєкті
/// вже був випадок, коли написане з памʼяті дало 32 розбіжності при звірці.
function scanBatch(): void {
  const batch = Number(readFlag("batch") || "11");
  const rows = readItemBatchRows(batch);
  const corpus = readItemCorpus();
  const catalogue = readCatalogueByEngName();
  const ratified = readRatifiedSpellNames();

  for (const row of rows) {
    printItem(row, findPinnedVariants(row, corpus), catalogue, ratified);
  }

  console.log(`\n${rows.length} предметів у партії ${batch}`);
  console.log(`нових для каталогу: ${rows.filter((row) => row.isNewToCatalog).length}`);
}

function printItem(
  row: ItemBatchRow,
  variants: SourceItemVariant[],
  catalogue: Map<string, { name: string; shortDescription: string }>,
  ratified: Map<string, string>
): void {
  const facts = findItemFacts(row, variants);
  const books = [...new Set(variants.map((variant) => `${variant.source} p.${variant.page ?? "?"}`))];

  console.log(`\n===== ${row.magicItemId} · ${row.nameEng} · ${row.slug} =====`);
  console.log(`${books.join(", ")}${row.isNewToCatalog ? " · НОВИЙ ДЛЯ КАТАЛОГУ" : ""}`);
  console.log(`МАШИННІ ПОЛЯ (перекладач їх не задає): ${facts.itemType}, ${facts.rarity}, налаштування ${facts.requiresAttunement ? "так" : "ні"}`);
  if (row.rarityReason !== "") console.log(`РІДКІСТЬ ЗАДАНО ПЛАНОМ: ${row.rarityReason}`);

  const current = catalogue.get(row.nameEng);
  if (current) {
    console.log(`У КАТАЛОГУ ЗАРАЗ: «${current.name}» · підпис: ${current.shortDescription || "—"}`);
  }

  printSpells(variants, ratified);

  for (const variant of variants) {
    console.log(`\n--- ${variant.nameEng} · ${variant.typeLineEng}`);
    console.log(variant.descriptionEng);
  }
}

/// Назви заклинань ніколи не перекладаються заново: `dictionary.json → SPELLS` тримає
/// 501 ратифікований рядок «Українська [English]». Саме повторний переклад назв дав 51 із
/// 248 записів каталогу з англійським підписом у O14.
function printSpells(variants: SourceItemVariant[], ratified: Map<string, string>): void {
  const names = [...new Set(variants.flatMap((variant) => variant.attachedSpellsEng))];
  if (names.length === 0) return;

  console.log("ЗАКЛИНАННЯ:");
  for (const name of names) {
    console.log(`   ${name} → ${ratified.get(normalize(name)) ?? "⛔ немає ратифікованої назви"}`);
  }
}

function readCatalogueByEngName(): Map<string, { name: string; shortDescription: string }> {
  const { items } = applyBatchesToBaseline(readMagicItemBaseline(), readMagicItemBatches());
  return new Map(
    items.map((item) => [
      item.engName,
      { name: item.name, shortDescription: String(item.shortDescription ?? "") },
    ])
  );
}

function readFlag(name: string): string {
  const found = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : "";
}

try {
  scanBatch();
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
