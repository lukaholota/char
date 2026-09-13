/**
 * KR31.5 — «завжди підготовлені» заклинання підкласів 2024.
 *
 * Перелік їде з `data/2024/normalized/subclasses.json`, куди його поклав прохід
 * `scripts/2024/parse-subclass-prepared-spells.ts` із сирих сторінок ([Р33](docs/DECISIONS.md#р33)).
 * Рівень у рядку — рівень КЛАСУ, як у книзі: Домен життя дає Aid на 3-му, Revivify на 5-му.
 * Ідемпотентний: повторний прогін дає ті самі рядки, а перелік, що зник із файлу, зникає з бази.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient, Ruleset } from "@prisma/client";
import { toSubclassEnum } from "./subclassSeed2024";

const RULESET: Ruleset = "RULES_2024";
const SUBCLASSES_JSON = "data/2024/normalized/subclasses.json";

type PreparedSpellsAtLevel = { classLevel: number; spellsEng: string[] };
type SubclassJson = { engName: string; featuresEng?: Array<{ preparedSpells?: PreparedSpellsAtLevel[] }> };

type PreparedSpellRow = { subclassEnum: string; subclassEngName: string; spellEng: string; classLevel: number };

export const seedSubclassSpells2024 = async (prisma: PrismaClient) => {
  console.log("📖 Завжди підготовлені заклинання підкласів 2024…");

  const rows = readPreparedSpellRows();
  const subclassIdByEnum = await findSubclassIdByEnum(prisma);
  const spellIdByEngName = await findSpellIdByEngName(prisma);

  const resolved = resolveRows(rows, subclassIdByEnum, spellIdByEngName);
  await writeRows(prisma, resolved);
  const pruned = await pruneRowsMissingFromFile(prisma, resolved);

  const subclasses = new Set(resolved.map((row) => row.subclassId)).size;
  console.log(`  • ${resolved.length} заклинань у ${subclasses} підкласах`);
  if (pruned) console.log(`  • ${pruned} рядків прибрано — їх більше немає у файлі`);
};

function readPreparedSpellRows(): PreparedSpellRow[] {
  const subclasses: SubclassJson[] = JSON.parse(readFileSync(join(process.cwd(), SUBCLASSES_JSON), "utf-8"));

  return subclasses.flatMap((subclass) =>
    (subclass.featuresEng ?? []).flatMap((feature) =>
      (feature.preparedSpells ?? []).flatMap((level) =>
        level.spellsEng.map((spellEng) => ({
          subclassEnum: toSubclassEnum(subclass.engName),
          subclassEngName: subclass.engName,
          spellEng,
          classLevel: level.classLevel,
        })),
      ),
    ),
  );
}

async function findSubclassIdByEnum(prisma: PrismaClient): Promise<Map<string, number>> {
  const rows = await prisma.subclass.findMany({ where: { ruleset: RULESET }, select: { subclassId: true, name: true } });
  return new Map(rows.map((row) => [String(row.name), row.subclassId]));
}

async function findSpellIdByEngName(prisma: PrismaClient): Promise<Map<string, number>> {
  const rows = await prisma.spell.findMany({ where: { ruleset: RULESET }, select: { spellId: true, engName: true } });
  return new Map(rows.map((row) => [row.engName.toLowerCase(), row.spellId]));
}

function resolveRows(
  rows: readonly PreparedSpellRow[],
  subclassIdByEnum: ReadonlyMap<string, number>,
  spellIdByEngName: ReadonlyMap<string, number>,
) {
  return rows.flatMap((row) => {
    const subclassId = subclassIdByEnum.get(row.subclassEnum);
    const spellId = spellIdByEngName.get(row.spellEng.toLowerCase());

    if (!subclassId) {
      console.warn(`  ⚠️ Підкласу "${row.subclassEngName}" (${row.subclassEnum}) немає в базі — пропущено`);
      return [];
    }
    if (!spellId) {
      console.warn(`  ⚠️ Заклинання "${row.spellEng}" (${row.subclassEngName}) немає серед 2024 — пропущено`);
      return [];
    }

    return [{ subclassId, spellId, classLevel: row.classLevel }];
  });
}

async function writeRows(prisma: PrismaClient, rows: Array<{ subclassId: number; spellId: number; classLevel: number }>) {
  for (const row of rows) {
    await prisma.subclassSpell.upsert({
      where: { unique_subclass_spell: { subclassId: row.subclassId, spellId: row.spellId } },
      update: { classLevel: row.classLevel, ruleset: RULESET },
      create: { ...row, ruleset: RULESET },
    });
  }
}

async function pruneRowsMissingFromFile(
  prisma: PrismaClient,
  rows: ReadonlyArray<{ subclassId: number; spellId: number }>,
): Promise<number> {
  const keep = new Set(rows.map((row) => `${row.subclassId}|${row.spellId}`));
  const existing = await prisma.subclassSpell.findMany({
    where: { ruleset: RULESET },
    select: { subclassSpellId: true, subclassId: true, spellId: true },
  });
  const stale = existing.filter((row) => !keep.has(`${row.subclassId}|${row.spellId}`));
  if (!stale.length) return 0;

  const { count } = await prisma.subclassSpell.deleteMany({
    where: { subclassSpellId: { in: stale.map((row) => row.subclassSpellId) } },
  });
  return count;
}
