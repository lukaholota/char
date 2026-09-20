/**
 * Текст і механіку заклинань 2014 — із `data/2014/spells.json` у базу (KR34.5).
 * Лише оновлює наявні рядки: не створює й не видаляє, бо на `spell_id` тримаються 26 тис.
 * `pers_spell`. Розбіжність у складі називає й зупиняється.
 *
 *   bun run seed:spells-2014:test
 *   bun run seed:spells-2014:prod
 *
 * Без `--apply` показує, що змінилося б, і нічого не пише.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { findSpellSourceDrift, writeSpellSourceChanges, SPELL_SOURCE_2014_PATH } from "../prisma/seed/spellSource2014";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const target = readSeedTargetName(process.argv, "bun tsx scripts/seed-2014-spells.ts");
const isApplying = process.argv.includes("--apply");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log(`🔮 ${SPELL_SOURCE_2014_PATH} → "${readDatabaseName(connectionString)}" (--target ${target}, ${isApplying ? "запис" : "показ без запису"})\n`);

  const { changes, missingInDatabase, missingInFile } = await findSpellSourceDrift(prisma);
  if (missingInDatabase.length > 0 || missingInFile.length > 0) {
    console.log(`⛔ Склад розійшовся — сід лише оновлює, тому зупинено.`);
    console.log(`   немає в базі (${missingInDatabase.length}): ${missingInDatabase.join(", ")}`);
    console.log(`   немає у файлі (${missingInFile.length}): ${missingInFile.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  for (const change of changes) console.log(`   ${change.engName}: ${Object.keys(change.fields).join(", ")}`);

  if (changes.length === 0) {
    console.log("✅ База дорівнює файлу — писати нема чого.");
    return;
  }

  if (!isApplying) {
    console.log(`\n${changes.length} заклинань зміняться. Запис: додайте --apply.`);
    return;
  }

  await writeSpellSourceChanges(prisma, changes);
  console.log(`\n✍︎ Записано ${changes.length} заклинань. Далі — bun run generate:spells.`);
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
