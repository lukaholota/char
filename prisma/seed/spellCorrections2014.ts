/**
 * KR16.2 — механічні виправлення каталогу заклинань 2014.
 *
 * Вхід — data/2014/corrections/spells.json, звірений із пінованим корпусом 5etools.
 * Контент їде сідом, не SQL-скриптом (Р17).
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RULESET = "RULES_2014" as const;

const CORRECTIONS_PATH = "data/2014/corrections/spells.json";

export type SpellCorrection = {
  engName: string;
  why: string;
  set?: Record<string, string | number>;
  replaceInDescription?: [string, string][];
  addClasses?: string[];
  removeClasses?: string[];
};

export type CorrectionsOutcome = {
  applied: string[];
  classRowsAdded: number;
  classRowsRemoved: number;
  duplicateClassRowsRemoved: number;
};

export async function seedSpellCorrections2014(
  prisma: PrismaClient
): Promise<CorrectionsOutcome> {
  const corrections = readSpellCorrections2014();
  const outcome: CorrectionsOutcome = {
    applied: [],
    classRowsAdded: 0,
    classRowsRemoved: 0,
    duplicateClassRowsRemoved: 0,
  };

  for (const correction of corrections) {
    const spell = await findSpell2014(prisma, correction.engName);

    await applyFieldChanges(prisma, spell.spellId, correction, spell.description);
    outcome.classRowsAdded += await addMissingClasses(prisma, spell.spellId, correction);
    outcome.classRowsRemoved += await removeWrongClasses(prisma, spell.spellId, correction);
    outcome.applied.push(correction.engName);
  }

  outcome.duplicateClassRowsRemoved = await removeDuplicateClassRows(prisma);
  return outcome;
}

export function readSpellCorrections2014(): SpellCorrection[] {
  const raw = readFileSync(join(process.cwd(), CORRECTIONS_PATH), "utf-8");
  const parsed: unknown = JSON.parse(raw);

  if (parsed === null || typeof parsed !== "object" || !("corrections" in parsed)) {
    throw new Error(`${CORRECTIONS_PATH}: очікували об'єкт із ключем corrections`);
  }

  const corrections = (parsed as { corrections: unknown }).corrections;
  if (!Array.isArray(corrections)) {
    throw new Error(`${CORRECTIONS_PATH}: corrections має бути масивом`);
  }

  return corrections as SpellCorrection[];
}

async function findSpell2014(prisma: PrismaClient, engName: string) {
  const spell = await prisma.spell.findUnique({
    where: { engName_ruleset: { engName, ruleset: RULESET } },
    select: { spellId: true, description: true },
  });

  if (!spell) throw new Error(`Заклинання «${engName}» немає в каталозі ${RULESET}`);
  return spell;
}

/// Заміна в описі — не переклад, а виправлення числа: єдиний випадок, `Disintegrate`.
/// Якщо шуканого рядка вже немає, це помилка даних, а не привід мовчки пропустити.
async function applyFieldChanges(
  prisma: PrismaClient,
  spellId: number,
  correction: SpellCorrection,
  description: string
): Promise<void> {
  const data: Record<string, string | number> = { ...(correction.set ?? {}) };

  for (const [from, to] of correction.replaceInDescription ?? []) {
    const current = typeof data.description === "string" ? data.description : description;
    if (!current.includes(from) && !current.includes(to)) {
      throw new Error(`${correction.engName}: в описі немає ні «${from}», ні «${to}»`);
    }
    data.description = current.split(from).join(to);
  }

  if (Object.keys(data).length === 0) return;
  await prisma.spell.update({ where: { spellId }, data });
}

async function addMissingClasses(
  prisma: PrismaClient,
  spellId: number,
  correction: SpellCorrection
): Promise<number> {
  const wanted = correction.addClasses ?? [];
  if (wanted.length === 0) return 0;

  const existing = await prisma.spellClasses.findMany({
    where: { spellId, ruleset: RULESET },
    select: { className: true },
  });
  const known = new Set(existing.map((row) => row.className));
  const missing = wanted.filter((name) => !known.has(name));
  if (missing.length === 0) return 0;

  await prisma.spellClasses.createMany({
    data: missing.map((className) => ({ spellId, className, ruleset: RULESET })),
  });

  return missing.length;
}

async function removeWrongClasses(
  prisma: PrismaClient,
  spellId: number,
  correction: SpellCorrection
): Promise<number> {
  const unwanted = correction.removeClasses ?? [];
  if (unwanted.length === 0) return 0;

  const { count } = await prisma.spellClasses.deleteMany({
    where: { spellId, ruleset: RULESET, className: { in: unwanted } },
  });

  return count;
}

/// Сімнадцять заклинань 2014 тримають той самий клас двічі й тричі («Коло землі» в
/// `Freedom of Movement` — чотири рази). Звірка цього не бачить, бо зводить перелік у множину,
/// а каталог показує дублікат користувачу.
async function removeDuplicateClassRows(prisma: PrismaClient): Promise<number> {
  const rows = await prisma.spellClasses.findMany({
    where: { ruleset: RULESET },
    select: { classId: true, spellId: true, className: true },
    orderBy: { classId: "asc" },
  });

  const doomed = findDuplicateClassRowIds(rows);
  if (doomed.length === 0) return 0;

  const { count } = await prisma.spellClasses.deleteMany({ where: { classId: { in: doomed } } });
  return count;
}

export function findDuplicateClassRowIds(
  rows: { classId: number; spellId: number; className: string }[]
): number[] {
  const seen = new Set<string>();
  const doomed: number[] = [];

  for (const row of rows) {
    const key = `${row.spellId}|${row.className}`;
    if (seen.has(key)) doomed.push(row.classId);
    else seen.add(key);
  }

  return doomed;
}
