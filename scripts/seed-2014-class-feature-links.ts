/**
 * Звʼязки класів 2014 з фічами: додати пропущений, прибрати чужий. Тексту фіч і рівнів решти
 * звʼязків не чіпає, на відміну від повного `seedClasses`.
 *
 *   bun run seed:class-feature-links:test
 *   bun run seed:class-feature-links:prod
 *
 * Без `--apply` показує, що змінилося б, і нічого не пише.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  findClassFeatureLinkDrift,
  syncClassFeatureLinksFromSeed,
} from "../prisma/seed/classFeatureLinks2014";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const target = readSeedTargetName(process.argv, "bun tsx scripts/seed-2014-class-feature-links.ts");
const isApplying = process.argv.includes("--apply");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const databaseName = readDatabaseName(connectionString);
  const mode = isApplying ? "запис" : "показ без запису";
  console.log(`🔗 Звʼязки класових фіч 2014 → "${databaseName}" (--target ${target}, ${mode})\n`);

  const drift = await findClassFeatureLinkDrift(prisma);
  for (const link of drift.missing) {
    console.log(`   + ${link.className} ← ${link.featureEngName} (рівень ${link.levelGranted})`);
  }
  for (const link of drift.extra) {
    console.log(`   − ${link.className} ← ${link.featureEngName} — ${link.why}`);
  }

  if (drift.missing.length === 0 && drift.extra.length === 0) {
    console.log("✅ База вже збігається із сідом — писати нема чого.");
    return;
  }

  if (!isApplying) {
    console.log(
      `\n${drift.missing.length} додати, ${drift.extra.length} прибрати. Запис: додайте --apply.`
    );
    return;
  }

  const applied = await syncClassFeatureLinksFromSeed(prisma);
  console.log(`\n✅ Додано ${applied.missing.length}, прибрано ${applied.extra.length}.`);
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
