/**
 * KR31.6 — Темнозір і опори до шкоди на фічах видів обох редакцій. Ганяється поверх сідів видів.
 *
 *   bun run seed:species-senses:test
 *   bun run seed:species-senses:prod
 *
 * Без `--apply` показує, що змінилося б, і нічого не пише.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  findSenseAndResistanceDrift,
  syncSensesAndResistancesFromSeed,
} from "../prisma/seed/speciesSensesAndResistances";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const target = readSeedTargetName(process.argv, "bun tsx scripts/seed-species-senses.ts");
const isApplying = process.argv.includes("--apply");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const databaseName = readDatabaseName(connectionString);
  const mode = isApplying ? "запис" : "показ без запису";
  console.log(`👁️  Темнозір і опори видів → "${databaseName}" (--target ${target}, ${mode})\n`);

  const drift = await findSenseAndResistanceDrift(prisma);
  for (const grant of drift.missingFeatures) {
    console.log(`   немає в базі: ${grant.engName} (${grant.ruleset})`);
  }
  for (const feature of drift.staleFeatures) {
    console.log(`   розходиться: ${feature.engName}`);
  }

  if (drift.missingFeatures.length === 0 && drift.staleFeatures.length === 0) {
    console.log("✅ База вже збігається із сідом — писати нема чого.");
    return;
  }

  if (!isApplying) {
    console.log(`\n${drift.staleFeatures.length} фіч розходяться із сідом. Запис: додайте --apply.`);
    return;
  }

  const applied = await syncSensesAndResistancesFromSeed(prisma);
  console.log(`\n✅ Оновлено фіч: ${applied.staleFeatures.length}.`);
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
