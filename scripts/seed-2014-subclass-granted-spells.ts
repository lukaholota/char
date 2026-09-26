/**
 * KR48.1 — заклинання, які підклас 2014 дає сам (домени, клятви, кола, магія підкласів), у `subclass_spell`.
 * Без `--apply` лише показує різницю.
 *
 *   bun run seed:subclass-granted-spells-2014:test [-- --apply]   → .env.test, клон spells_test
 *   bun run seed:subclass-granted-spells-2014:prod [-- --apply]   → .env, робоча база spells
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { findSubclassGrantedSpellDrift, seedSubclassGrantedSpells2014 } from "../prisma/seed/subclassGrantedSpells2014";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const target = readSeedTargetName(process.argv, "bun tsx scripts/seed-2014-subclass-granted-spells.ts");
const isApplying = process.argv.includes("--apply");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const mode = isApplying ? "запис" : "показ без запису";
  console.log(`📖 Заклинання підкласів 2014 → "${readDatabaseName(connectionString)}" (--target ${target}, ${mode})\n`);

  const drift = await findSubclassGrantedSpellDrift(prisma);
  for (const row of drift.missing) console.log(`  + ${row}`);
  for (const row of drift.extra) console.log(`  − ${row}`);
  for (const row of drift.wrongLevel) console.log(`  ~ ${row}`);

  const outcome = await seedSubclassGrantedSpells2014(prisma, isApplying);
  console.log(`\n${isApplying ? "Записано" : "Буде записано"}: +${outcome.created}, −${outcome.deleted}, ~${outcome.updated} рядків.`);
  if (!isApplying) console.log("Це лише показ. Щоб записати, додайте --apply.");
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
