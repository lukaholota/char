/**
 * Обладунок 2024 → база. Ціль задається явно, як у scripts/seed-magic-items.ts.
 *
 *   npx tsx scripts/seed-armor-2024.ts --target test
 *   npx tsx scripts/seed-armor-2024.ts --target prod
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { seedArmor2024 } from "../prisma/seed/armorSeed2024";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const target = readSeedTargetName(process.argv, "npx tsx scripts/seed-armor-2024.ts");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log(`🛡️ Обладунок 2024 → "${readDatabaseName(connectionString)}" (--target ${target})\n`);
  await seedArmor2024(prisma);
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
