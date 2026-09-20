/**
 * KR33.6–KR33.7 — проза каталогу 2014 із `data/2014/catalog-prose/` → `description` класів, рас, підрас, варіантів і підкласів.
 *
 *   bun run seed:catalog-prose-2014:test [--apply]
 *   bun run seed:catalog-prose-2014:prod [--apply]
 *
 * Без `--apply` показує, що змінилося б, і нічого не пише.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { CATALOG_PROSE_KINDS, findCatalogProseDrift, syncCatalogProse2014 } from "../prisma/seed/catalogProse2014";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const target = readSeedTargetName(process.argv, "bun tsx scripts/seed-2014-catalog-prose.ts");
const isApplying = process.argv.includes("--apply");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const mode = isApplying ? "запис" : "показ без запису";
  console.log(`📖 Проза каталогу 2014 → "${readDatabaseName(connectionString)}" (--target ${target}, ${mode})\n`);

  for (const kind of CATALOG_PROSE_KINDS) {
    const drift = await findCatalogProseDrift(prisma, kind);
    for (const entry of drift) console.log(`   ${kind}: ${entry.key} — опис розходиться з файлом`);

    if (drift.length === 0) console.log(`✅ ${kind}: база вже збігається з файлом.`);
    else if (!isApplying) console.log(`${kind}: ${drift.length} розходяться з файлом. Запис: додайте --apply.`);
    else {
      await syncCatalogProse2014(prisma, kind, drift);
      console.log(`✅ ${kind}: оновлено ${drift.length}.`);
    }
  }
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
