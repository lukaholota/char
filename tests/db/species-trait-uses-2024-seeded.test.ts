/**
 * KR31.3 — числа використань рис видів 2024 мусять бути **в базі**, а не лише у файлі.
 *
 * Вхідний файл звіряє з джерелом `tests/content/species-trait-uses-2024.test.ts`; тут інша
 * ланка — що `seed:2024 --only races` доніс ті самі числа до `feature`. Без цієї перевірки
 * зелений контентний гейт означав би тільки «файл гарний», а лист лишався б порожнім.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";
import { SPECIES_JSON } from "../../scripts/2024/parse-species-trait-uses";

type TraitJson = {
  engName: string;
  displayType?: string[];
  uses?: {
    limitedUsesPer?: string;
    usesCount?: number;
    usesCountSpecial?: unknown;
    usesCountDependsOnProficiencyBonus?: true;
  };
};

type SpeciesJson = { engName: string; traits?: TraitJson[] };

/// jsonb віддає ключі у своєму порядку, тож порівнюються значення, а не текст запису.
function stringifyStably(value: unknown): string {
  return JSON.stringify(value, (_key, nested) =>
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? Object.fromEntries(Object.entries(nested).sort(([left], [right]) => left.localeCompare(right)))
      : nested,
  );
}

const species: SpeciesJson[] = JSON.parse(readFileSync(join(process.cwd(), SPECIES_JSON), "utf-8"));

const expectedByEngName = new Map(
  species.flatMap((one) =>
    (one.traits ?? []).map((trait) => [
      `${one.engName}: ${trait.engName} (2024)`,
      {
        limitedUsesPer: trait.uses?.limitedUsesPer ?? null,
        usesCount: trait.uses?.usesCount ?? null,
        usesCountSpecial: trait.uses?.usesCountSpecial ?? null,
        usesCountDependsOnProficiencyBonus: trait.uses?.usesCountDependsOnProficiencyBonus ?? false,
        displayType: trait.displayType ?? ["PASSIVE"],
      },
    ]),
  ),
);

afterAll(disconnectDatabase);

describe("лічильники рис видів 2024 у базі", () => {
  it("кожна риса виду несе рівно ті числа, що й файл-джерело", async () => {
    const seeded = await prisma.feature.findMany({
      where: { engName: { in: [...expectedByEngName.keys()] } },
      select: {
        engName: true,
        limitedUsesPer: true,
        usesCount: true,
        usesCountSpecial: true,
        usesCountDependsOnProficiencyBonus: true,
        displayType: true,
      },
    });

    expect(seeded.length).toBe(expectedByEngName.size);

    const mismatched = seeded
      .map((feature) => ({
        engName: feature.engName,
        actual: {
          limitedUsesPer: feature.limitedUsesPer,
          usesCount: feature.usesCount,
          usesCountSpecial: feature.usesCountSpecial,
          usesCountDependsOnProficiencyBonus: feature.usesCountDependsOnProficiencyBonus,
          displayType: feature.displayType,
        },
        expected: expectedByEngName.get(feature.engName),
      }))
      .filter(({ actual, expected }) => stringifyStably(actual) !== stringifyStably(expected))
      .map(({ engName, actual, expected }) => `${engName}: ${stringifyStably(actual)} проти ${stringifyStably(expected)}`);

    expect(mismatched).toEqual([]);
  });

  it("жодна риса виду 2024 не несе лічильника, якого немає у файлі", async () => {
    const carrying = await prisma.feature.findMany({
      where: {
        ruleset: "RULES_2024",
        engName: { in: [...expectedByEngName.keys()] },
        OR: [
          { usesCount: { not: null } },
          { limitedUsesPer: { not: null } },
          { usesCountDependsOnProficiencyBonus: true },
        ],
      },
      select: { engName: true },
    });

    const expectedCarrying = [...expectedByEngName.entries()]
      .filter(([, expected]) => expected.limitedUsesPer !== null)
      .map(([engName]) => engName)
      .sort();

    expect(carrying.map((feature) => feature.engName).sort()).toEqual(expectedCarrying);
  });

  /**
   * BUG-011: `usesCountSpecial` — це максимум, а не маркер; будь-який непорожній обʼєкт там
   * перемикає суддю пулу. Риси видів пулів не мають, тож і `usesPoolKey` у них бути не повинно.
   */
  it("риси видів не претендують на роль власника пулу", async () => {
    const withPool = await prisma.feature.findMany({
      where: { engName: { in: [...expectedByEngName.keys()] }, usesPoolKey: { not: null } },
      select: { engName: true, usesPoolKey: true },
    });

    expect(withPool).toEqual([]);
  });
});
