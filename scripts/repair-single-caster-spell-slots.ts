/**
 * Ремонт комірок заклинань у персонажів з одним класом зі Spellcasting.
 *
 * До фіксу такий персонаж (паладин, слідопит, Лицар-чародій, Таємний пройдисвіт — зокрема з
 * мультикласом у клас без Spellcasting) рахувався формулою мультикласу з округленням униз, і
 * паладин 5 мав 3 комірки 1 кола замість 4 / 2. Максимум тепер рахується правильно, а поточні
 * комірки в базі — ні: прогін додає до них різницю між новим і старим максимумом, як це робить
 * підвищення рівня. Витрачені комірки лишаються витраченими.
 *
 *   bun tsx scripts/repair-single-caster-spell-slots.ts --target test          # сухий прогін
 *   bun tsx scripts/repair-single-caster-spell-slots.ts --target prod --apply
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import { SPELL_SLOT_PROGRESSION } from "../src/lib/refs/static";
import { toRulesSpellcastingCharacter, type SpellcastingPersLike } from "../src/lib/logic/spell-logic";
import { applySpellSlotMaximumDelta, getMaximumStandardSpellSlots, normalizeSpellSlotArray } from "../src/rules/spellcasting";
import type { Ruleset, SpellcastingCharacter, SpellcastingClassLevel, SpellcastingKind } from "../src/rules/types";

const TARGETS = {
  test: { envFile: ".env.test", expectedSuffix: "_test" },
  prod: { envFile: ".env", expectedSuffix: "spells" },
} as const;

type TargetName = keyof typeof TARGETS;

const target = readTargetName(process.argv);
const shouldApply = process.argv.includes("--apply");
const pool = new Pool({ connectionString: resolveConnectionString(target) });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const spellcastingSelect = { select: { name: true, spellcastingType: true } } as const;
const subclassSelect = { select: { spellcastingType: true } } as const;

async function main() {
  const characters = await loadCasters();
  const repairs = characters.map(findSlotRepair).filter((repair) => repair !== null);

  printRepairs(repairs, characters.length);
  if (!shouldApply) {
    console.log("\nСухий прогін — нічого не записано. Додай --apply.");
    return;
  }

  await saveRepairs(repairs);
  console.log(`\nЗаписано: ${repairs.length}.`);
}

async function loadCasters() {
  return prisma.pers.findMany({
    select: {
      persId: true,
      name: true,
      level: true,
      ruleset: true,
      currentSpellSlots: true,
      class: spellcastingSelect,
      subclass: subclassSelect,
      multiclasses: { select: { classLevel: true, class: spellcastingSelect, subclass: subclassSelect } },
    },
    orderBy: { persId: "asc" },
  });
}

type Caster = Awaited<ReturnType<typeof loadCasters>>[number];
type SlotRepair = { persId: number; name: string; before: number[]; after: number[]; oldMaximum: number[]; newMaximum: number[] };

function findSlotRepair(pers: Caster): SlotRepair | null {
  const character = toRulesSpellcastingCharacter(pers as SpellcastingPersLike);
  const newMaximum = getMaximumStandardSpellSlots(character, SPELL_SLOT_PROGRESSION.FULL, pers.ruleset);
  const oldMaximum = findLegacyMaximum(character, pers.ruleset);
  if (sameSlots(newMaximum, oldMaximum)) return null;

  const before = normalizeSpellSlotArray(pers.currentSpellSlots);
  const after = applySpellSlotMaximumDelta(before, oldMaximum, newMaximum);
  return { persId: pers.persId, name: pers.name, before, after, oldMaximum, newMaximum };
}

// Формула мультикласу, якою до фіксу рахувався кожен персонаж. Пакт не впливав на стандартні комірки.
function findLegacyMaximum(character: SpellcastingCharacter, ruleset: Ruleset): number[] {
  const multiclasses = character.multiclasses ?? [];
  const mainLevel = clampLevel(character.level - multiclasses.reduce((sum, multiclass) => sum + multiclass.classLevel, 0));
  const classLevels: SpellcastingClassLevel[] = [{ classLevel: mainLevel, characterClass: character.characterClass, subclass: character.subclass }, ...multiclasses];
  const casterLevel = Math.min(20, classLevels.reduce((sum, classLevel) => sum + findLegacyContribution(classLevel, ruleset), 0));
  return normalizeSpellSlotArray(SPELL_SLOT_PROGRESSION.FULL[casterLevel as keyof typeof SPELL_SLOT_PROGRESSION.FULL] ?? []);
}

function findLegacyContribution(classLevel: SpellcastingClassLevel, ruleset: Ruleset): number {
  const level = clampLevel(classLevel.classLevel);
  const kind = findKind(classLevel);
  if (kind === "FULL") return level;
  if (kind === "HALF") {
    const roundsUp = ruleset === "RULES_2024" || Boolean(classLevel.characterClass?.name?.startsWith("ARTIFICER"));
    return roundsUp ? Math.ceil(level / 2) : Math.floor(level / 2);
  }
  if (kind === "THIRD") return Math.floor(level / 3);
  return 0;
}

function findKind(classLevel: SpellcastingClassLevel): SpellcastingKind {
  const classKind = classLevel.characterClass?.spellcastingType;
  if (classKind && classKind !== "NONE") return classKind;
  return classLevel.subclass?.spellcastingType ?? "NONE";
}

function clampLevel(level: number): number {
  return Math.min(20, Math.max(1, Math.trunc(level)));
}

function sameSlots(left: number[], right: number[]): boolean {
  return left.every((value, index) => value === right[index]);
}

function printRepairs(repairs: SlotRepair[], total: number) {
  console.log(`Ціль: ${target}. Персонажів: ${total}. Максимум змінився в ${repairs.length}.\n`);
  for (const repair of repairs) {
    console.log(`#${repair.persId} ${repair.name}: максимум ${formatSlots(repair.oldMaximum)} → ${formatSlots(repair.newMaximum)}; поточні ${formatSlots(repair.before)} → ${formatSlots(repair.after)}`);
  }
}

function formatSlots(slots: number[]): string {
  const lastIndex = slots.findLastIndex((slot) => slot > 0);
  return lastIndex === -1 ? "—" : slots.slice(0, lastIndex + 1).join("/");
}

async function saveRepairs(repairs: SlotRepair[]) {
  for (const repair of repairs) {
    await prisma.pers.update({ where: { persId: repair.persId }, data: { currentSpellSlots: repair.after } });
  }
}

function readTargetName(argv: string[]): TargetName {
  const name = argv[argv.indexOf("--target") + 1];
  if (argv.includes("--target") && (name === "test" || name === "prod")) return name;
  throw new Error("Ціль треба назвати явно: --target test | --target prod");
}

function resolveConnectionString(targetName: TargetName): string {
  const { envFile, expectedSuffix } = TARGETS[targetName];
  const url = dotenv.config({ path: envFile, quiet: true }).parsed?.DATABASE_URL;
  if (!url) throw new Error(`У ${envFile} немає DATABASE_URL.`);

  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!dbName.endsWith(expectedSuffix)) throw new Error(`--target ${targetName} очікує базу на "${expectedSuffix}", а ${envFile} веде в "${dbName}".`);
  return url;
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
