/**
 * Магічні предмети 2024 → база. Ціль задається явно, як у scripts/seed-magic-items.ts.
 *
 *   bun run seed:magic-items-2024:test
 *   bun run seed:magic-items-2024:prod
 *
 * Потребує db/changes/2026-08-29-kr12.5-magic-item-unique-per-ruleset.sql: без
 * `UNIQUE (eng_name, ruleset)` перший же предмет падає на дублікаті назви 2014.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { seedMagicItems2024 } from "../prisma/seed/magicItemSeed2024";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const target = readSeedTargetName(process.argv, "bun tsx scripts/seed-magic-items-2024.ts");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log(`🧪 Магічні предмети 2024 → "${readDatabaseName(connectionString)}" (--target ${target})\n`);
  await seedMagicItems2024(prisma);
}

main()
  .catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
