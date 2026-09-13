/**
 * Риси трьох порожніх записів 2014 — базова людина, Своя раса, варіант людини — і ратифікований
 * «Темнозір» замість «Темного зору». Решти рас не чіпає, на відміну від повного `seedRaces`.
 *
 *   bun run seed:race-traits:test
 *   bun run seed:race-traits:prod
 *
 * Без `--apply` показує, що змінилося б, і нічого не пише.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  countRaceTraitDrift,
  findRaceTraitDrift,
  syncRaceTraitsFromSeed,
} from "../prisma/seed/raceTraits2014";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const target = readSeedTargetName(process.argv, "bun tsx scripts/seed-2014-race-traits.ts");
const isApplying = process.argv.includes("--apply");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const databaseName = readDatabaseName(connectionString);
  const mode = isApplying ? "запис" : "показ без запису";
  console.log(`🧬 Риси рас 2014 → "${databaseName}" (--target ${target}, ${mode})\n`);

  const drift = await findRaceTraitDrift(prisma);
  for (const feature of drift.staleFeatures) {
    console.log(`   текст: ${feature.engName}`);
  }
  for (const entry of drift.missingRaceTraits) {
    console.log(`   ${entry.raceName} ← ${entry.featureEngNames.length} рис`);
  }
  for (const entry of drift.missingVariantTraits) {
    console.log(`   ${entry.variantName} ← ${entry.featureEngNames.length} рис`);
  }
  for (const text of drift.staleOptionTexts) {
    console.log(`   «${text.legacyOptionName}» → «${text.optionName}»`);
  }

  const total = countRaceTraitDrift(drift);
  if (total === 0) {
    console.log("✅ База вже збігається із сідом — писати нема чого.");
    return;
  }

  if (!isApplying) {
    console.log(`\n${total} записів розходяться із сідом. Запис: додайте --apply.`);
    return;
  }

  const applied = await syncRaceTraitsFromSeed(prisma);
  console.log(
    `\n✅ Текстів ${applied.staleFeatures.length}, рас ${applied.missingRaceTraits.length}, ` +
      `варіантів ${applied.missingVariantTraits.length}, перейменувань ${applied.staleOptionTexts.length}.`
  );
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
