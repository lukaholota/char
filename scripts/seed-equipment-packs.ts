/**
 * Набори спорядження → база. Ціль задається явно, як у scripts/seed-magic-items.ts.
 *
 *   npx tsx scripts/seed-equipment-packs.ts --target test
 *   npx tsx scripts/seed-equipment-packs.ts --target prod
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { seedEquipmentPacks } from "../prisma/seed/equipmentPackSeed";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const target = readSeedTargetName(process.argv, "npx tsx scripts/seed-equipment-packs.ts");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log(`🎒 Набори спорядження → "${readDatabaseName(connectionString)}" (--target ${target})\n`);
  await seedEquipmentPacks(prisma);
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
