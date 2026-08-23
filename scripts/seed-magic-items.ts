/**
 * Магічні предмети 2014 → база. Ціль задається явно, як у scripts/seed-2024.ts.
 *
 *   bun run seed:magic-items:test
 *   bun run seed:magic-items:prod
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { seedMagicItems } from "../prisma/seed/magicItemSeed";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const target = readSeedTargetName(process.argv, "bun tsx scripts/seed-magic-items.ts");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const dbName = readDatabaseName(connectionString);
  console.log(`🧪 Магічні предмети → "${dbName}" (--target ${target})\n`);
  await seedMagicItems(prisma);
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
