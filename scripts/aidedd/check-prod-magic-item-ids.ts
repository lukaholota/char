/**
 * Передпольотна перевірка перед `seed:magic-items:prod`. Нічого не пише.
 *
 * Сід шукає рядок за `engName` і створює новий із явним `magicItemId`. Якщо в базі той самий
 * предмет стоїть під іншим id, ніж у корпусі, вставка вдариться в первинний ключ і транзакція
 * впаде на середині. Дешевше дізнатися про це до прогону.
 *
 *   npx tsx scripts/aidedd/check-prod-magic-item-ids.ts --target prod
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { readMagicItemBaseline } from "../../prisma/seed/magicItemBaseline";
import { applyBatchesToBaseline, readMagicItemBatches } from "../../prisma/seed/magicItemBatches";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "../lib/seed-target";

const SCRIPT = "npx tsx scripts/aidedd/check-prod-magic-item-ids.ts";

async function checkMagicItemIds(): Promise<void> {
  const target = readSeedTargetName(process.argv, SCRIPT);
  const connectionString = resolveSeedConnectionString(target);
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    console.log(`🔎 Звірка id у "${readDatabaseName(connectionString)}" (--target ${target})\n`);

    const corpus = buildCorpusIndex();
    const inDatabase = await prisma.magicItem.findMany({ select: { magicItemId: true, engName: true } });

    reportOutcome(findIdMismatches(corpus, inDatabase), findIdCollisions(corpus, inDatabase), {
      corpus: corpus.size,
      inDatabase: inDatabase.length,
    });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

type DatabaseRow = { magicItemId: number; engName: string };

function buildCorpusIndex(): Map<string, number> {
  const { items } = applyBatchesToBaseline(readMagicItemBaseline(), readMagicItemBatches());
  return new Map(items.map((item) => [item.engName, item.magicItemId ?? 0]));
}

/// Предмет є в базі, але під іншим id: сід не перенумеровує, тому цей рядок лишиться зі старою
/// адресою, а якщо корпусний id зайнятий кимось іншим — вставка ще й впаде.
function findIdMismatches(corpus: Map<string, number>, inDatabase: DatabaseRow[]): string[] {
  return inDatabase
    .filter((row) => corpus.has(row.engName) && corpus.get(row.engName) !== row.magicItemId)
    .map((row) => `${row.engName}: у базі ${row.magicItemId}, у корпусі ${corpus.get(row.engName)}`);
}

/// Id з корпусу вже зайнятий у базі іншим предметом — саме на цьому впаде INSERT.
function findIdCollisions(corpus: Map<string, number>, inDatabase: DatabaseRow[]): string[] {
  const takenIds = new Map(inDatabase.map((row) => [row.magicItemId, row.engName]));

  return [...corpus.entries()]
    .filter(([engName, id]) => takenIds.has(id) && takenIds.get(id) !== engName)
    .map(([engName, id]) => `id ${id} зайнятий предметом «${takenIds.get(id)}», корпус хоче туди «${engName}»`);
}

function reportOutcome(mismatches: string[], collisions: string[], counts: { corpus: number; inDatabase: number }): void {
  console.log(`Корпус: ${counts.corpus} предметів. У базі: ${counts.inDatabase}.`);
  console.log(`Сід додасть: ${counts.corpus - counts.inDatabase}, оновить: ${counts.inDatabase}.\n`);

  for (const line of mismatches) console.log(`  ⚠️ ${line}`);
  for (const line of collisions) console.log(`  ⛔ ${line}`);

  if (mismatches.length === 0 && collisions.length === 0) {
    console.log("✅ Жодної розбіжності id. Сід можна запускати.");
    return;
  }

  console.log(`\n❌ ${mismatches.length + collisions.length} розбіжностей. Сід НЕ запускати.`);
  process.exitCode = 1;
}

checkMagicItemIds();
