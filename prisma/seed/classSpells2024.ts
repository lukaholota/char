/**
 * KR31.5 — класові «завжди підготовлені» заклинання 2024.
 *
 * Перелік їде з `data/2024/normalized/classes.json`, куди його поклав прохід
 * `scripts/2024/parse-class-prepared-spells.ts` із `data/2024/srd/classes.md`
 * ([Р33](docs/DECISIONS.md#р33)). Носій — звʼязок «фіча → заклинання»: рівень уже стоїть на самій
 * фічі (`class_feature.level_granted`), тож окремої колонки не треба.
 * Ідемпотентний: повторний прогін дає ті самі звʼязки.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient, Ruleset } from "@prisma/client";

const RULESET: Ruleset = "RULES_2024";
const CLASSES_JSON = "data/2024/normalized/classes.json";

type ClassFeatureJson = { level: number; name: string; alwaysPreparedSpells?: string[] };
type ClassJson = { engName: string; featuresEng?: ClassFeatureJson[] };

type PreparedSpellsForFeature = { classEnum: string; level: number; featureName: string; spellsEng: string[] };

export const seedClassSpells2024 = async (prisma: PrismaClient) => {
  console.log("📖 Завжди підготовлені заклинання класів 2024…");

  const wanted = readPreparedSpellsFromFile();
  const spellIdByEngName = await findSpellIdByEngName(prisma);

  let linked = 0;
  for (const row of wanted) {
    const featureId = await findFeatureId(prisma, row);
    if (!featureId) continue;

    const spellIds = row.spellsEng.flatMap((engName) => {
      const spellId = spellIdByEngName.get(engName.toLowerCase());
      if (!spellId) console.warn(`  ⚠️ Заклинання "${engName}" немає серед 2024 — пропущено`);
      return spellId ? [spellId] : [];
    });

    await prisma.feature.update({
      where: { featureId },
      data: { givesSpells: { set: spellIds.map((spellId) => ({ spellId })) } },
    });
    linked += spellIds.length;
  }

  console.log(`  • ${linked} заклинань привʼязано до ${wanted.length} класових фіч`);
};

function readPreparedSpellsFromFile(): PreparedSpellsForFeature[] {
  const classes: ClassJson[] = JSON.parse(readFileSync(join(process.cwd(), CLASSES_JSON), "utf-8"));

  return classes.flatMap((characterClass) =>
    (characterClass.featuresEng ?? [])
      .filter((feature) => feature.alwaysPreparedSpells?.length)
      .map((feature) => ({
        classEnum: `${characterClass.engName.toUpperCase()}_2024`,
        level: feature.level,
        featureName: feature.name,
        spellsEng: feature.alwaysPreparedSpells!,
      })),
  );
}

async function findSpellIdByEngName(prisma: PrismaClient): Promise<Map<string, number>> {
  const rows = await prisma.spell.findMany({ where: { ruleset: RULESET }, select: { spellId: true, engName: true } });
  return new Map(rows.map((row) => [row.engName.toLowerCase(), row.spellId]));
}

/// Фіча в базі несе назву класу й редакцію: «Ranger: Favored Enemy (2024)». Апостроф друкарні
/// різниться між книгою й базою, тому звіряються нормалізовані назви.
async function findFeatureId(prisma: PrismaClient, row: PreparedSpellsForFeature): Promise<number | null> {
  const candidates = await prisma.classFeature.findMany({
    where: { levelGranted: row.level, class: { name: row.classEnum as never, ruleset: RULESET } },
    select: { feature: { select: { featureId: true, engName: true } } },
  });

  const wanted = normalizeApostrophes(row.featureName);
  const matched = candidates.find(({ feature }) => normalizeApostrophes(feature.engName).endsWith(`${wanted} (2024)`));
  if (!matched) {
    console.warn(`  ⚠️ Фічі "${row.featureName}" (${row.classEnum}, рівень ${row.level}) немає в базі — пропущено`);
    return null;
  }

  return matched.feature.featureId;
}

function normalizeApostrophes(value: string): string {
  return value.replace(/[’ʼ‘]/g, "'").toLowerCase();
}
