/**
 * KR48.4 — персонажі 2014, які стоять на підкласі з власними заклинаннями, до O48 їх не отримували:
 * `subclass_spell` 2014 був порожній. Підвищення рівня тепер видає їх саме, але персонаж, який не
 * росте, лишився б без домену назавжди. Прогін добирає відсутні рядки й, за рішенням власника
 * 2026-09-26, перемічає ті, що гравець тримав своїм вибором, як «від підкласу, поза лімітом».
 *
 * Нічого не видаляє. Той самий розрахунок, що й майстер підвищення (`findSubclassSpellGrants`).
 *
 *   bun run repair:subclass-spells-2014:test                  # сухий прогін
 *   bun run repair:subclass-spells-2014:test -- --apply
 *   … -- --verbose                                            # кожен персонаж окремим рядком
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
import { findMainClassLevel } from "../src/rules/hit-dice";
import type { AbilityKey } from "../src/rules/types";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const target = readSeedTargetName(process.argv, "bun tsx scripts/repair-2014-subclass-spells.ts");
const isApplying = process.argv.includes("--apply");
const isVerbose = process.argv.includes("--verbose");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type RepairTotals = { characters: number; repaired: number; created: number; adopted: number; bySubclass: Map<string, { created: number; adopted: number }> };

async function main() {
  const mode = isApplying ? "ЗАПИС" : "сухий прогін";
  console.log(`🔧 KR48.4 — заклинання підкласів 2014, база "${readDatabaseName(connectionString)}" (${mode})\n`);

  const characters = await loadCharactersOnGrantingSubclasses();
  const totals: RepairTotals = { characters: characters.length, repaired: 0, created: 0, adopted: 0, bySubclass: new Map() };

  for (const pers of characters) {
    const grants = await findSubclassSpellGrants(prisma, { persId: pers.persId, subclasses: collectSubclassesAtLevel(pers) });
    if (!grants.created.length && !grants.adopted.length) continue;

    countGrants(totals, grants);
    if (isVerbose) console.log(`  #${pers.persId} «${pers.name}» рів. ${pers.level}: +${grants.created.length}, перемічено ${grants.adopted.length}`);
    if (isApplying) {
      await prisma.$transaction((tx) => writeSubclassSpellGrants(tx, { persId: pers.persId, grants, learnedAtLevel: pers.level }));
    }
  }

  printTotals(totals);
}

async function loadCharactersOnGrantingSubclasses() {
  const granting = await prisma.subclassSpell.findMany({ where: { ruleset: "RULES_2014" }, distinct: ["subclassId"], select: { subclassId: true } });
  const subclassIds = granting.map((row) => row.subclassId);

  return prisma.pers.findMany({
    where: { ruleset: "RULES_2014", OR: [{ subclassId: { in: subclassIds } }, { multiclasses: { some: { subclassId: { in: subclassIds } } } }] },
    select: {
      persId: true,
      name: true,
      level: true,
      subclassId: true,
      class: { select: { primaryCastingStat: true } },
      multiclasses: { select: { subclassId: true, classLevel: true, class: { select: { primaryCastingStat: true } } } },
    },
    orderBy: { persId: "asc" },
  });
}

type RepairPers = Awaited<ReturnType<typeof loadCharactersOnGrantingSubclasses>>[number];

function collectSubclassesAtLevel(pers: RepairPers): SubclassAtClassLevel[] {
  const main = pers.subclassId
    ? [{ subclassId: pers.subclassId, classLevel: findMainClassLevel(pers.level, pers.multiclasses), ability: pers.class.primaryCastingStat as AbilityKey | null }]
    : [];
  const multiclasses = pers.multiclasses.flatMap((row) =>
    row.subclassId ? [{ subclassId: row.subclassId, classLevel: row.classLevel, ability: row.class.primaryCastingStat as AbilityKey | null }] : [],
  );
  return [...main, ...multiclasses];
}

function countGrants(totals: RepairTotals, grants: SubclassSpellGrants): void {
  totals.repaired += 1;
  totals.created += grants.created.length;
  totals.adopted += grants.adopted.length;
  for (const [kind, spells] of [["created", grants.created], ["adopted", grants.adopted]] as const) {
    for (const spell of spells) {
      const row = totals.bySubclass.get(spell.sourceName) ?? { created: 0, adopted: 0 };
      row[kind] += 1;
      totals.bySubclass.set(spell.sourceName, row);
    }
  }
}

function printTotals(totals: RepairTotals): void {
  console.log("\nПідклас — нових рядків / перемічено:");
  for (const [name, row] of [...totals.bySubclass].sort((a, b) => b[1].created + b[1].adopted - (a[1].created + a[1].adopted))) {
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
