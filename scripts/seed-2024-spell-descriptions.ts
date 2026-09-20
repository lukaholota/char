/**
 * Описи заклинань 2024 — із `data/2024/normalized/spells.json` у базу. Лише `description` і лише
 * наявні рядки: повний `seed:2024` переливає весь контент редакції, а правці тексту це не потрібно.
 *
 *   bun run seed:spell-descriptions-2024:test
 *   bun run seed:spell-descriptions-2024:prod
 *
 * Без `--apply` показує, що змінилося б, і нічого не пише.
 */

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const SOURCE_PATH = "data/2024/normalized/spells.json";

const target = readSeedTargetName(process.argv, "bun tsx scripts/seed-2024-spell-descriptions.ts");
const isApplying = process.argv.includes("--apply");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type SpellDescription = { engName: string; description: string };

async function main() {
  console.log(`🔮 ${SOURCE_PATH} → "${readDatabaseName(connectionString)}" (--target ${target}, ${isApplying ? "запис" : "показ без запису"})\n`);

  const fileSpells = readFileSpells();
  const databaseSpells = await prisma.spell.findMany({
    where: { ruleset: "RULES_2024" },
    select: { spellId: true, engName: true, description: true },
  });

  const missingInDatabase = findMissingNames(fileSpells, databaseSpells);
  const missingInFile = findMissingNames(databaseSpells, fileSpells);
  if (missingInDatabase.length > 0 || missingInFile.length > 0) {
    console.log("⛔ Склад розійшовся — сід лише оновлює, тому зупинено.");
    console.log(`   немає в базі (${missingInDatabase.length}): ${missingInDatabase.join(", ")}`);
    console.log(`   немає у файлі (${missingInFile.length}): ${missingInFile.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const changes = findChangedDescriptions(fileSpells, databaseSpells);
  for (const change of changes) console.log(`   ${change.engName}`);

  if (changes.length === 0) {
    console.log("✅ Описи в базі дорівнюють файлу — писати нема чого.");
    return;
  }

  if (!isApplying) {
    console.log(`\n${changes.length} описів зміниться. Запис: додайте --apply.`);
    return;
  }

  await prisma.$transaction(
    changes.map((change) => prisma.spell.update({ where: { spellId: change.spellId }, data: { description: change.description } }))
  );
  console.log(`\n✍︎ Записано ${changes.length} описів.`);
}

function readFileSpells(): SpellDescription[] {
  return JSON.parse(readFileSync(SOURCE_PATH, "utf8"));
}

function findMissingNames(from: SpellDescription[], within: SpellDescription[]): string[] {
  const names = new Set(within.map((spell) => spell.engName));
  return from.filter((spell) => !names.has(spell.engName)).map((spell) => spell.engName);
}

function findChangedDescriptions(
  fileSpells: SpellDescription[],
  databaseSpells: Array<SpellDescription & { spellId: number }>
): Array<{ spellId: number; engName: string; description: string }> {
  const fileByName = new Map(fileSpells.map((spell) => [spell.engName, spell.description]));
  return databaseSpells.flatMap((spell) => {
    const description = fileByName.get(spell.engName);
    if (description === undefined || description === spell.description) return [];
    return [{ spellId: spell.spellId, engName: spell.engName, description }];
  });
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
