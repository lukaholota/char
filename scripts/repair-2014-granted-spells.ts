/**
 * KR48.4 — персонажі 2014 до O48 не отримували заклинань, які дають підклас (домен, клятва, коло) і
 * раса (Thaumaturgy тифлінга, Dancing Lights дроу). Підвищення рівня тепер видає їх саме, але персонаж,
 * який не росте, лишився б без них назавжди. Прогін добирає відсутні рядки й, за рішенням власника
 * 2026-09-26 (Р53), перемічає ті, що гравець тримав своїм вибором.
 *
 * Нічого не видаляє. Рахує тими самими функціями, що й майстер підвищення.
 *
 *   bun run repair:granted-spells-2014:test                  # сухий прогін
 *   bun run repair:granted-spells-2014:test -- --apply
 *   … -- --verbose                                          # кожен персонаж окремим рядком
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  findSubclassSpellGrants,
  writeSubclassSpellGrants,
  type SubclassAtClassLevel,
  type SubclassSpellGrants,
} from "../src/server/db/always-prepared-spell-grants";
import { findRaceSpellGrants2014, writeRaceSpellGrants2014 } from "../src/server/db/race-spell-grants-2014";
import { findEarnedRaceSpells2014 } from "../src/rules/race-granted-spells-2014";
import { findMainClassLevel } from "../src/rules/hit-dice";
import type { AbilityKey } from "../src/rules/types";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const target = readSeedTargetName(process.argv, "bun tsx scripts/repair-2014-granted-spells.ts");
const isApplying = process.argv.includes("--apply");
const isVerbose = process.argv.includes("--verbose");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type RepairTotals = { characters: number; repaired: number; created: number; adopted: number; bySource: Map<string, { created: number; adopted: number }> };

async function main() {
  const mode = isApplying ? "ЗАПИС" : "сухий прогін";
  console.log(`🔧 KR48.4 — заклинання підкласів і рас 2014, база "${readDatabaseName(connectionString)}" (${mode})\n`);

  const characters = await loadCharacters2014();
  const totals: RepairTotals = { characters: characters.length, repaired: 0, created: 0, adopted: 0, bySource: new Map() };

  for (const pers of characters) {
    const subclassGrants = await findSubclassSpellGrants(prisma, {
      persId: pers.persId,
      subclasses: collectSubclassesAtLevel(pers),
      choiceOptionIds: pers.choiceOptions.map((option) => option.choiceOptionId),
    });
    const raceGrants = await findRaceGrants(pers, subclassGrants);
    const grants = { created: [...subclassGrants.created, ...raceGrants.created], adopted: [...subclassGrants.adopted, ...raceGrants.adopted] };
    if (!grants.created.length && !grants.adopted.length) continue;

    countGrants(totals, grants);
    if (isVerbose) console.log(`  #${pers.persId} «${pers.name}» рів. ${pers.level}: +${grants.created.length}, перемічено ${grants.adopted.length}`);
    if (isApplying) {
      await prisma.$transaction(async (tx) => {
        await writeSubclassSpellGrants(tx, { persId: pers.persId, grants: subclassGrants, learnedAtLevel: pers.level });
        await writeRaceSpellGrants2014(tx, { persId: pers.persId, grants: raceGrants, learnedAtLevel: pers.level });
      });
    }
  }

  printTotals(totals);
}

async function loadCharacters2014() {
  return prisma.pers.findMany({
    where: { ruleset: "RULES_2014" },
    select: {
      persId: true,
      name: true,
      level: true,
      subclassId: true,
      choiceOptions: { select: { choiceOptionId: true } },
      race: { select: { name: true } },
      subrace: { select: { name: true } },
      class: { select: { primaryCastingStat: true } },
      multiclasses: { select: { subclassId: true, classLevel: true, class: { select: { primaryCastingStat: true } } } },
    },
    orderBy: { persId: "asc" },
  });
}

type RepairPers = Awaited<ReturnType<typeof loadCharacters2014>>[number];

function collectSubclassesAtLevel(pers: RepairPers): SubclassAtClassLevel[] {
  const main = pers.subclassId
    ? [{ subclassId: pers.subclassId, classLevel: findMainClassLevel(pers.level, pers.multiclasses), ability: pers.class.primaryCastingStat as AbilityKey | null }]
    : [];
  const multiclasses = pers.multiclasses.flatMap((row) =>
    row.subclassId ? [{ subclassId: row.subclassId, classLevel: row.classLevel, ability: row.class.primaryCastingStat as AbilityKey | null }] : [],
  );
  return [...main, ...multiclasses];
}

/// Заклинання, яке в цьому ж прогоні забрав підклас, раса вже не перемічає: рядок один, і він підкласу.
async function findRaceGrants(pers: RepairPers, subclassGrants: SubclassSpellGrants): Promise<SubclassSpellGrants> {
  const input = { persId: pers.persId, race: String(pers.race.name), subrace: pers.subrace ? String(pers.subrace.name) : null, characterLevel: pers.level };
  if (!findEarnedRaceSpells2014(input).length) return { created: [], adopted: [] };

  const taken = new Set([...subclassGrants.created, ...subclassGrants.adopted].map((spell) => spell.spellId));
  const grants = await findRaceSpellGrants2014(prisma, input);
  return { created: grants.created.filter((spell) => !taken.has(spell.spellId)), adopted: grants.adopted.filter((spell) => !taken.has(spell.spellId)) };
}

function countGrants(totals: RepairTotals, grants: SubclassSpellGrants): void {
  totals.repaired += 1;
  totals.created += grants.created.length;
  totals.adopted += grants.adopted.length;
  for (const [kind, spells] of [["created", grants.created], ["adopted", grants.adopted]] as const) {
    for (const spell of spells) {
      const row = totals.bySource.get(spell.sourceName) ?? { created: 0, adopted: 0 };
      row[kind] += 1;
      totals.bySource.set(spell.sourceName, row);
    }
  }
}

function printTotals(totals: RepairTotals): void {
  console.log("\nДжерело — нових рядків / перемічено:");
  for (const [name, row] of [...totals.bySource].sort((a, b) => b[1].created + b[1].adopted - (a[1].created + a[1].adopted))) {
    console.log(`  ${name}: +${row.created} / ~${row.adopted}`);
  }
  console.log(`\n${totals.repaired} із ${totals.characters} персонажів: +${totals.created} рядків, перемічено ${totals.adopted}.`);
  if (!isApplying && totals.repaired) console.log("Нічого не записано — додайте --apply.");
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
