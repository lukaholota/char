/**
 * Текст рис 2014 із сіду → база. Тільки `description` і `shortDescription`; звʼязки рис
 * (`grantsFeature`) не чіпає, на відміну від повного `seedFeats`.
 *
 *   bun run seed:feat-text:test
 *   bun run seed:feat-text:prod
 *
 * Без `--apply` показує, що змінилося б, і нічого не пише.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { syncFeatTextFromSeed, findFeatTextDrift } from "../prisma/seed/featText2014";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const target = readSeedTargetName(process.argv, "bun tsx scripts/seed-2014-feat-text.ts");
const isApplying = process.argv.includes("--apply");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const databaseName = readDatabaseName(connectionString);
  const mode = isApplying ? "запис" : "показ без запису";
  console.log(`📝 Текст рис 2014 → "${databaseName}" (--target ${target}, ${mode})\n`);

  const drift = await findFeatTextDrift(prisma);
  for (const feat of drift) console.log(`   ${feat.name} — ${feat.changedFields.join(", ")}`);

  if (drift.length === 0) {
    console.log("✅ База вже збігається із сідом — писати нема чого.");
    return;
  }

  if (!isApplying) {
    console.log(`\n${drift.length} рис розходяться із сідом. Запис: додайте --apply.`);
    return;
  }

  const applied = await syncFeatTextFromSeed(prisma);
  console.log(`\n✅ Оновлено ${applied.length} рис.`);
}

main()
  .catch((error) => {
    console.error("FATAL:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
