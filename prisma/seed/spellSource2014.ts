import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient, Source } from "@prisma/client";

/// Файл-джерело заклинань 2014 (KR34.5). До нього текст жив лише в базі й правився
/// проходами поверх неї (`data/2014/corrections`); тепер правиться файл, а база його дзеркалить.
/// Списки класів і рас сюди не входять — їх і далі несуть свої сіди.

export const SPELL_SOURCE_2014_PATH = "data/2014/spells.json";

const RULESET = "RULES_2014" as const;

export const SPELL_SOURCE_2014_SELECT = {
  engName: true,
  name: true,
  level: true,
  school: true,
  castingTime: true,
  range: true,
  components: true,
  duration: true,
  hasRitual: true,
  hasConcentration: true,
  source: true,
  description: true,
} as const;

export type SpellSourceRecord = {
  engName: string;
  name: string;
  level: number;
  school: string | null;
  castingTime: string;
  range: string;
  components: string | null;
  duration: string;
  hasRitual: string | null;
  hasConcentration: string | null;
  source: Source;
  description: string;
};

/// Каталог тримає книгу рядком, а не enum-ом — звірці цього досить.
export type StoredSpellSource = Omit<SpellSourceRecord, "source"> & { source: string };

export type SpellSourceField = Exclude<keyof SpellSourceRecord, "engName">;

export const SPELL_SOURCE_FIELDS = Object.keys(SPELL_SOURCE_2014_SELECT).filter(
  (field): field is SpellSourceField => field !== "engName"
);

export type SpellSourceDrift = {
  changes: Array<{ engName: string; fields: Partial<Omit<SpellSourceRecord, "engName">> }>;
  missingInDatabase: string[];
  missingInFile: string[];
};

export function toSpellSourceRecord(row: SpellSourceRecord): SpellSourceRecord {
  return {
    engName: row.engName,
    name: row.name,
    level: row.level,
    school: row.school,
    castingTime: row.castingTime,
    range: row.range,
    components: row.components,
    duration: row.duration,
    hasRitual: row.hasRitual,
    hasConcentration: row.hasConcentration,
    source: row.source,
    description: row.description,
  };
}

export function readSpellSource2014(root = process.cwd()): SpellSourceRecord[] {
  return JSON.parse(readFileSync(join(root, SPELL_SOURCE_2014_PATH), "utf-8")) as SpellSourceRecord[];
}

export function writeSpellSource2014(records: SpellSourceRecord[], root = process.cwd()): void {
  const sorted = [...records].sort((left, right) => left.engName.localeCompare(right.engName, "en"));
  writeFileSync(join(root, SPELL_SOURCE_2014_PATH), `${JSON.stringify(sorted, null, 2)}\n`, "utf-8");
}

export async function findSpellSourceDrift(prisma: PrismaClient, records = readSpellSource2014()): Promise<SpellSourceDrift> {
  const stored = await prisma.spell.findMany({ where: { ruleset: RULESET }, select: SPELL_SOURCE_2014_SELECT });
  return compareSpellSource(records, stored);
}

export function compareSpellSource(records: SpellSourceRecord[], stored: StoredSpellSource[]): SpellSourceDrift {
  const storedByEngName = new Map(stored.map((row) => [row.engName, row]));
  const fileEngNames = new Set(records.map((record) => record.engName));

  const changes = records.flatMap((record) => {
    const current = storedByEngName.get(record.engName);
    if (!current) return [];
    const fields = pickChangedFields(record, current);
    return Object.keys(fields).length > 0 ? [{ engName: record.engName, fields }] : [];
  });

  return {
    changes,
    missingInDatabase: records.filter((record) => !storedByEngName.has(record.engName)).map((record) => record.engName),
    missingInFile: stored.filter((row) => !fileEngNames.has(row.engName)).map((row) => row.engName),
  };
}

export async function writeSpellSourceChanges(prisma: PrismaClient, changes: SpellSourceDrift["changes"]): Promise<void> {
  for (const change of changes) {
    await prisma.spell.update({
      where: { engName_ruleset: { engName: change.engName, ruleset: RULESET } },
      data: change.fields,
    });
  }
}

function pickChangedFields(record: SpellSourceRecord, current: StoredSpellSource): Partial<Omit<SpellSourceRecord, "engName">> {
  const changed: Record<string, unknown> = {};
  for (const field of SPELL_SOURCE_FIELDS) {
    if (record[field] !== current[field]) changed[field] = record[field];
  }
  return changed as Partial<Omit<SpellSourceRecord, "engName">>;
}
