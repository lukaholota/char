/**
 * KR31.5 — класові «завжди підготовлені» заклинання 2024 мусять бути **в базі**, а не лише у файлі.
 *
 * Файл із книгою звіряє `tests/content/class-prepared-spells-2024.test.ts`; тут перевіряється інша
 * ланка — що сід привʼязав ті самі заклинання до тих самих фіч. Без цієї перевірки зелений
 * контентний гейт означав би тільки «файл гарний», а слідопит лишався б без Hunter's Mark.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";
import { CLASSES_JSON } from "../../scripts/2024/parse-class-feature-uses";

type FeatureEng = { level: number; name: string; alwaysPreparedSpells?: string[] };
type ClassJson = { engName: string; featuresEng?: FeatureEng[] };

const classes: ClassJson[] = JSON.parse(readFileSync(join(process.cwd(), CLASSES_JSON), "utf-8"));

function normalize(value: string): string {
  return value.replace(/[’ʼ‘]/g, "'").toLowerCase();
}

function listExpectedRows(): string[] {
  return classes
    .flatMap((characterClass) =>
      (characterClass.featuresEng ?? [])
        .filter((feature) => feature.alwaysPreparedSpells?.length)
        .flatMap((feature) =>
          feature.alwaysPreparedSpells!.map(
            (spellEng) =>
              `${characterClass.engName.toUpperCase()}_2024|${feature.level}|${normalize(feature.name)}|${normalize(spellEng)}`,
          ),
        ),
    )
    .sort();
}

async function listSeededRows(): Promise<string[]> {
  const rows = await prisma.classFeature.findMany({
    where: { class: { ruleset: "RULES_2024" }, feature: { givesSpells: { some: {} } } },
    select: {
      levelGranted: true,
      class: { select: { name: true } },
      feature: { select: { engName: true, givesSpells: { select: { engName: true } } } },
    },
  });

  return rows
    .flatMap(({ class: characterClass, levelGranted, feature }) =>
      feature.givesSpells.map((spell) => {
        const featureName = normalize(feature.engName).replace(/^.*: /, "").replace(" (2024)", "");
        return `${characterClass.name}|${levelGranted}|${featureName}|${normalize(spell.engName)}`;
      }),
    )
    .sort();
}

describe("KR31.5 — класові заклинання 2024 у базі", () => {
  afterAll(disconnectDatabase);

  it("кожне заклинання з файлу привʼязане до своєї класової фічі", async () => {
    expect(await listSeededRows()).toEqual(listExpectedRows());
  });

  it("слідопит несе Hunter's Mark на рисі 1-го рівня", async () => {
    const rows = await prisma.classFeature.findMany({
      where: { class: { name: "RANGER_2024", ruleset: "RULES_2024" }, feature: { givesSpells: { some: {} } } },
      select: { levelGranted: true, feature: { select: { engName: true, givesSpells: { select: { engName: true } } } } },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].levelGranted).toBe(1);
    expect(rows[0].feature.givesSpells.map((spell) => spell.engName)).toEqual(["Hunter's Mark"]);
  });
});
