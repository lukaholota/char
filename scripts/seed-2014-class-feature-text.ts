/**
 * Текст класових фіч 2014 із сіду → база. Тільки `description`; звʼязки фіч і рівні видачі не
 * чіпає, на відміну від повного `seedClassFeatures`.
 *
 *   bun run seed:class-feature-text:test
 *   bun run seed:class-feature-text:prod
 *
 * Без `--apply` показує, що змінилося б, і нічого не пише.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  findClassFeatureTextDrift,
  syncClassFeatureTextFromSeed,
} from "../prisma/seed/classFeatureText2014";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const target = readSeedTargetName(process.argv, "bun tsx scripts/seed-2014-class-feature-text.ts");
const isApplying = process.argv.includes("--apply");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const databaseName = readDatabaseName(connectionString);
  const mode = isApplying ? "запис" : "показ без запису";
  console.log(`📝 Текст класових фіч 2014 → "${databaseName}" (--target ${target}, ${mode})\n`);

  const drift = await findClassFeatureTextDrift(prisma);
  for (const feature of drift) console.log(`   ${feature.engName} — опис розходиться`);

  if (drift.length === 0) {
    console.log("✅ База вже збігається із сідом — писати нема чого.");
    return;
  }

  if (!isApplying) {
    console.log(`\n${drift.length} фіч розходяться із сідом. Запис: додайте --apply.`);
    return;
  }

  const applied = await syncClassFeatureTextFromSeed(prisma);
  console.log(`\n✅ Оновлено ${applied.length} фіч.`);
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
