/**
 * KR33.6 — проза каталогу 2014 із `data/2014/catalog-prose/` → `class.description`.
 *
 *   bun run seed:catalog-prose-2014:test [--apply]
 *   bun run seed:catalog-prose-2014:prod [--apply]
 *
 * Без `--apply` показує, що змінилося б, і нічого не пише.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { findClassProseDrift, syncClassProse2014 } from "../prisma/seed/catalogProse2014";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const target = readSeedTargetName(process.argv, "bun tsx scripts/seed-2014-catalog-prose.ts");
const isApplying = process.argv.includes("--apply");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const mode = isApplying ? "запис" : "показ без запису";
  console.log(`📖 Проза класів 2014 → "${readDatabaseName(connectionString)}" (--target ${target}, ${mode})\n`);

  const drift = await findClassProseDrift(prisma);
  for (const entry of drift) console.log(`   ${entry.key} — опис розходиться з файлом`);

  if (drift.length === 0) {
    console.log("✅ База вже збігається з файлом — писати нема чого.");
    return;
  }
  if (!isApplying) {
    console.log(`\n${drift.length} класів розходяться з файлом. Запис: додайте --apply.`);
    return;
  }

  await syncClassProse2014(prisma, drift);
  console.log(`\n✅ Оновлено ${drift.length} класів.`);
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
