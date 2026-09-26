/**
 * KR48.1 — заклинання, які підклас 2014 дає сам, у `subclass_spell`.
 *
 * Файл-джерело — `data/2014/subclass-granted-spells.json` ([Р33](../../docs/DECISIONS.md#р33)), його виводить
 * `scripts/5etools/build-subclass-granted-spells-2014.ts`. Рівень у рядку — рівень КЛАСУ, як у книзі.
 * Сід зводить базу з файлом лише для підкласів із файлу: додає, прибирає й виправляє рівень.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";

const RULESET = "RULES_2014" as const;
const FILE_PATH = "data/2014/subclass-granted-spells.json";

type FileSpell = { engName: string; classLevel: number };
type FileSubclass = { subclass: string; spells: FileSpell[] };

type WantedRow = { subclassId: number; spellId: number; classLevel: number; label: string };

export type SubclassGrantedSpellDrift = {
  /** «ПІДКЛАС|Заклинання@рівень» — є у файлі, немає в базі. */
  missing: string[];
  /** Є в базі в підкласі з файлу, немає у файлі. */
  extra: string[];
  /** Є і там, і там, але рівень класу інший. */
  wrongLevel: string[];
};

export type SubclassGrantedSpellsOutcome = { created: number; deleted: number; updated: number };

export async function seedSubclassGrantedSpells2014(prisma: PrismaClient, apply: boolean): Promise<SubclassGrantedSpellsOutcome> {
  const plan = await planSubclassGrantedSpells(prisma);
  const outcome = { created: plan.create.length, deleted: plan.deleteIds.length, updated: plan.update.length };
  if (!apply) return outcome;

  await prisma.$transaction(async (tx) => {
    if (plan.create.length) {
      await tx.subclassSpell.createMany({
        data: plan.create.map((row) => ({ subclassId: row.subclassId, spellId: row.spellId, classLevel: row.classLevel, ruleset: RULESET })),
      });
    }
    if (plan.deleteIds.length) await tx.subclassSpell.deleteMany({ where: { subclassSpellId: { in: plan.deleteIds } } });
    for (const row of plan.update) {
      await tx.subclassSpell.update({ where: { subclassSpellId: row.subclassSpellId }, data: { classLevel: row.classLevel } });
    }
  });
  return outcome;
}

export async function findSubclassGrantedSpellDrift(prisma: PrismaClient): Promise<SubclassGrantedSpellDrift> {
  const plan = await planSubclassGrantedSpells(prisma);
  return { missing: plan.missing, extra: plan.extra, wrongLevel: plan.wrongLevel };
}

export function readSubclassGrantedSpells2014(): FileSubclass[] {
  return (JSON.parse(readFileSync(join(process.cwd(), FILE_PATH), "utf-8")) as { subclasses: FileSubclass[] }).subclasses;
}

async function planSubclassGrantedSpells(prisma: PrismaClient) {
  const subclasses = readSubclassGrantedSpells2014();
  const [subclassIdByName, spellIdByEngName] = await Promise.all([findSubclassIdByName(prisma), findSpellIdByEngName(prisma)]);
  const wanted = resolveWantedRows(subclasses, subclassIdByName, spellIdByEngName);
  const existing = await prisma.subclassSpell.findMany({
    where: { ruleset: RULESET, subclassId: { in: [...new Set(wanted.map((row) => row.subclassId))] } },
    select: { subclassSpellId: true, subclassId: true, spellId: true, classLevel: true, subclass: { select: { name: true } }, spell: { select: { engName: true } } },
  });

  const existingByKey = new Map(existing.map((row) => [`${row.subclassId}|${row.spellId}`, row]));
  const wantedKeys = new Set(wanted.map((row) => `${row.subclassId}|${row.spellId}`));

  const create = wanted.filter((row) => !existingByKey.has(`${row.subclassId}|${row.spellId}`));
  const update = wanted.flatMap((row) => {
    const present = existingByKey.get(`${row.subclassId}|${row.spellId}`);
    return present && present.classLevel !== row.classLevel ? [{ subclassSpellId: present.subclassSpellId, classLevel: row.classLevel, label: row.label }] : [];
  });
  const extraRows = existing.filter((row) => !wantedKeys.has(`${row.subclassId}|${row.spellId}`));

  return {
    create,
    update,
    deleteIds: extraRows.map((row) => row.subclassSpellId),
    missing: create.map((row) => row.label).sort(),
    wrongLevel: update.map((row) => row.label).sort(),
    extra: extraRows.map((row) => `${row.subclass.name}|${row.spell.engName}@${row.classLevel}`).sort(),
  };
}

function resolveWantedRows(
  subclasses: readonly FileSubclass[],
  subclassIdByName: ReadonlyMap<string, number>,
  spellIdByEngName: ReadonlyMap<string, number>,
): WantedRow[] {
  return subclasses.flatMap((subclass) => {
    const subclassId = subclassIdByName.get(subclass.subclass);
    if (!subclassId) throw new Error(`Підкласу 2014 «${subclass.subclass}» немає в базі`);

    return subclass.spells.map((spell) => {
      const spellId = spellIdByEngName.get(spell.engName.toLowerCase());
      if (!spellId) throw new Error(`${subclass.subclass}: заклинання «${spell.engName}» немає серед 2014`);
      return { subclassId, spellId, classLevel: spell.classLevel, label: `${subclass.subclass}|${spell.engName}@${spell.classLevel}` };
    });
  });
}

async function findSubclassIdByName(prisma: PrismaClient): Promise<Map<string, number>> {
  const rows = await prisma.subclass.findMany({ where: { ruleset: RULESET }, select: { subclassId: true, name: true } });
  return new Map(rows.map((row) => [String(row.name), row.subclassId]));
}

async function findSpellIdByEngName(prisma: PrismaClient): Promise<Map<string, number>> {
  const rows = await prisma.spell.findMany({ where: { ruleset: RULESET }, select: { spellId: true, engName: true } });
  return new Map(rows.map((row) => [row.engName.toLowerCase(), row.spellId]));
}
