/**
 * KR27.3 — рівні підвищення характеристик (ASI) класів 2024 звіряються з SRD у репо, а не з
 * памʼяті: усі тринадцять класів були засіяні з `[4, 8, 12, 16]`, тоді як воїн має ASI ще на
 * 6-му й 14-му рівні класу, а пройдисвіт — на 10-му.
 *
 * Ланцюг, який тут пінується: SRD → data/2024/normalized/classes.json → (сід → база →
 * generate-creator-content) → src/lib/generated/creator-content-2024.json. Останній файл і є
 * тим, що читає левелап; базу окремо звіряє tests/rules/class-progression.test.ts.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type ClassJson2024 = { engName: string; abilityScoreImprovementLevels: number[]; epicBoonLevel: number };
type GeneratedClass2024 = { name: string; abilityScoreUpLevels: number[] | null; epicBoonLevel: number | null };

const FIRST_ABILITY_SCORE_LEVEL = 4;

/** Винахідника в SRD 5.2.1 немає; додаткових ASI він не має (TCoE), тому стандартний ряд. */
const ABILITY_SCORE_LEVELS_OUTSIDE_SRD: Record<string, number[]> = {
  Artificer: [4, 8, 12, 16],
};

const sourceClasses: ClassJson2024[] = JSON.parse(
  readFileSync(join(process.cwd(), "data/2024/normalized/classes.json"), "utf-8"),
);
const generatedClasses: GeneratedClass2024[] = JSON.parse(
  readFileSync(join(process.cwd(), "src/lib/generated/creator-content-2024.json"), "utf-8"),
).classes;

const srdAbilityScoreLevels = readSrdAbilityScoreLevels();

describe("KR27.3 — рівні ASI класів 2024 збігаються з SRD", () => {
  it("SRD називає рівні ASI для дванадцяти класів", () => {
    expect(Object.keys(srdAbilityScoreLevels).sort()).toEqual(
      sourceClasses.map((cls) => cls.engName).filter((name) => !(name in ABILITY_SCORE_LEVELS_OUTSIDE_SRD)).sort(),
    );
  });

  it.each(sourceClasses.map((cls) => [cls.engName, cls] as const))(
    "%s: джерельний JSON несе ті самі рівні, що й SRD",
    (engName, cls) => {
      expect(cls.abilityScoreImprovementLevels).toEqual(findExpectedAbilityScoreLevels(engName));
    },
  );

  it.each(sourceClasses.map((cls) => [cls.engName, cls] as const))(
    "%s: згенерований каталог левелапу дорівнює джерелу",
    (engName, cls) => {
      const generated = generatedClasses.find((candidate) => candidate.name === toClassEnumName(engName));
      expect(generated?.abilityScoreUpLevels).toEqual(cls.abilityScoreImprovementLevels);
      expect(generated?.epicBoonLevel).toBe(cls.epicBoonLevel);
    },
  );

  it("рівень епічного дару не входить до рівнів ASI", () => {
    const broken = sourceClasses
      .filter((cls) => cls.abilityScoreImprovementLevels.includes(cls.epicBoonLevel))
      .map((cls) => cls.engName);
    expect(broken).toEqual([]);
  });
});

function findExpectedAbilityScoreLevels(engName: string): number[] {
  return ABILITY_SCORE_LEVELS_OUTSIDE_SRD[engName] ?? srdAbilityScoreLevels[engName];
}

/** «You gain this feature again at Fighter levels 6, 8, 12, 14, and 16.» → [4, 6, 8, 12, 14, 16] */
function readSrdAbilityScoreLevels(): Record<string, number[]> {
  const srd = readFileSync(join(process.cwd(), "data/2024/srd/classes.md"), "utf-8");
  const pattern = /You gain this feature again at (\w+) levels ([\d, and]+)\./g;
  const levelsByClass: Record<string, number[]> = {};
  for (const match of srd.matchAll(pattern)) {
    const [, engName, levelsText] = match;
    const laterLevels = levelsText.match(/\d+/g)?.map(Number) ?? [];
    levelsByClass[engName] = [FIRST_ABILITY_SCORE_LEVEL, ...laterLevels];
  }
  return levelsByClass;
}

function toClassEnumName(engName: string): string {
  return `${engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_2024`;
}
