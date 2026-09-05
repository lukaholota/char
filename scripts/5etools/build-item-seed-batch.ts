import { writeFileSync } from "fs";
import { join } from "path";
import { MIRROR_REVISION } from "./mirror";
import { buildItemSeedRows, readItemBatchRows, readItemCorpus } from "./item-batches";

/// Партія перекладу 5etools → сід-партія, яку читає `prisma/seed/magicItemSeed.ts`.
///
///   npx tsx scripts/5etools/build-item-seed-batch.ts --batch=11
///
/// Вхід — робоча зона перекладу (`data/5etools/translations/**`), вихід — контракт, з якого
/// будується база. Межа та сама, що в O14: робоча зона переписується щоразу, контракт має
/// пережити рік. Руками контракт не редагують — правлять переклад і пересобирають.
const OUTPUT_DIR = join(process.cwd(), "prisma/seed/magic-items");

function buildBatch(): void {
  const batch = Number(readFlag("batch") || "0");
  if (!Number.isInteger(batch) || batch <= 0) throw new Error("Партію треба назвати: --batch=11");

  const rows = readItemBatchRows(batch);
  const items = buildItemSeedRows(batch, readItemCorpus());
  const blocked = rows.filter((row) => row.status !== "ready");

  const path = join(OUTPUT_DIR, `batch-${String(batch).padStart(2, "0")}.json`);
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        batch: String(batch).padStart(2, "0"),
        source: `5etools ${MIRROR_REVISION.slice(0, 7)} — magic items 2014`,
        items,
      },
      null,
      2
    )}\n`,
    "utf-8"
  );

  console.log(`✅ партія ${batch}: ${items.length} предметів → ${path}`);
  console.log(`   нових для каталогу: ${items.filter((item) => item.isNewToCatalog).length}`);
  for (const row of blocked) console.log(`   ⛔ відкладено: ${row.nameEng} — ${row.blocker}`);
}

function readFlag(name: string): string {
  const found = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : "";
}

try {
  buildBatch();
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
