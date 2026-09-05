import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { seedNewSpells2014 } from "../prisma/seed/newSpells2014";
import {
  readDatabaseName,
  readSeedTargetName,
  resolveSeedConnectionString,
} from "./lib/seed-target";

async function main(): Promise<void> {
  const target = readSeedTargetName(process.argv, "bun run seed:new-spells:test");
  const connectionString = resolveSeedConnectionString(target);
  const databaseName = readDatabaseName(connectionString);
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    console.log(`🔮 KR17.3: нові заклинання 2014 у базі "${databaseName}"…`);
    const outcome = await seedNewSpells2014(prisma);
    console.log(`  імпортовано: ${outcome.imported.length}`);
    console.log(`  відкладено: ${outcome.deferred.length}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("FATAL:", error);
  process.exit(1);
});
