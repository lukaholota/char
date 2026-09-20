/**
 * Знімає текст і механіку заклинань 2014 із бази у файл-джерело `data/2014/spells.json`.
 * Разовий крок переходу з проходів по базі на файл (KR34.5); далі файл правиться руками,
 * а в базу його несе `seed:spells-2014`.
 *
 *   bunx tsx scripts/export-2014-spells.ts --target prod
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { writeSpellSource2014, SPELL_SOURCE_2014_PATH, SPELL_SOURCE_2014_SELECT, toSpellSourceRecord } from "../prisma/seed/spellSource2014";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const target = readSeedTargetName(process.argv, "bunx tsx scripts/export-2014-spells.ts");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const rows = await prisma.spell.findMany({ where: { ruleset: "RULES_2014" }, select: SPELL_SOURCE_2014_SELECT });
  writeSpellSource2014(rows.map(toSpellSourceRecord));
  console.log(`📤 ${rows.length} заклинань 2014 із "${readDatabaseName(connectionString)}" → ${SPELL_SOURCE_2014_PATH}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
