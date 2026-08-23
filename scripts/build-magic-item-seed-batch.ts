/**
 * Партія перекладу aidedd → сід-партія, яку читає prisma/seed/magicItemSeed.ts.
 *
 *   npx tsx scripts/build-magic-item-seed-batch.ts --batch 01
 *
 * Вхід — робоча зона перекладу (data/aidedd/**), вихід — контракт, з якого будується
 * база (prisma/seed/magic-items/batch-NN.json). Текст береться з розібраних записів
 * data/aidedd/magic-items-2014.json, бо саме вони пройшли рев'ю власника.
 * Пояснення конвеєра — prisma/seed/magic-items/README.md.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { COVERED_BY_EXISTING_ENTRIES, type MagicItemBatchRow } from "../prisma/seed/magicItemBatches";

type ResolvedItem = {
  magicItemId: number;
  name: string;
  engName: string;
  itemType: string;
  rarity: string;
  requiresAttunement: boolean;
  description: string;
  shortDescription?: string;
  isNewToCatalog?: boolean;
};

type TranslationRow = { slug: string };

const RESOLVED_PATH = join(process.cwd(), "data/aidedd/magic-items-2014.json");
const OUTPUT_DIR = join(process.cwd(), "prisma/seed/magic-items");

function readBatchNumber(argv: string[]): string {
  const value = argv[argv.indexOf("--batch") + 1];
  if (!value || !/^\d{2}$/.test(value)) {
    throw new Error("Партію треба назвати явно двома цифрами: --batch 01");
  }
  return value;
}

function buildSlug(engName: string): string {
  return engName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function collectBatchItems(batchNumber: string) {
  const translationPath = join(
    process.cwd(),
    `data/aidedd/translations/magic-items-2014/batch-${batchNumber}.json`,
  );
  const wantedSlugs = new Set(readJson<TranslationRow[]>(translationPath).map((row) => row.slug));
  const resolvedBySlug = new Map(
    readJson<ResolvedItem[]>(RESOLVED_PATH).map((item) => [buildSlug(item.engName), item]),
  );

  const items: MagicItemBatchRow[] = [];
  const skipped: Array<{ slug: string; coveredBy: string[] }> = [];

  for (const slug of wantedSlugs) {
    if (COVERED_BY_EXISTING_ENTRIES[slug]) {
      skipped.push({ slug, coveredBy: COVERED_BY_EXISTING_ENTRIES[slug] });
      continue;
    }

    const resolved = resolvedBySlug.get(slug);
    if (!resolved) throw new Error(`Слуг ${slug} є в перекладі, але не в розібраних записах.`);

    items.push({
      magicItemId: resolved.magicItemId,
      engName: resolved.engName,
      slug,
      name: resolved.name,
      itemType: resolved.itemType,
      rarity: resolved.rarity,
      requiresAttunement: resolved.requiresAttunement,
      shortDescription: resolved.shortDescription ?? "",
      description: resolved.description,
      isNewToCatalog: resolved.isNewToCatalog === true,
    });
  }

  items.sort((left, right) => left.slug.localeCompare(right.slug));
  return { items, skipped };
}

function main() {
  const batchNumber = readBatchNumber(process.argv);
  const { items, skipped } = collectBatchItems(batchNumber);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = join(OUTPUT_DIR, `batch-${batchNumber}.json`);
  writeFileSync(
    outputPath,
    `${JSON.stringify({ batch: batchNumber, source: "aidedd.org — magic items 2014", items }, null, 2)}\n`,
    "utf-8",
  );

  console.log(`✅ Партія ${batchNumber}: ${items.length} предметів → ${outputPath}`);
  console.log(`   нових у каталозі: ${items.filter((item) => item.isNewToCatalog).length}`);
  for (const entry of skipped) {
    console.log(`   пропущено ${entry.slug} — покрито наявними записами: ${entry.coveredBy.join(", ")}`);
  }
}

main();
