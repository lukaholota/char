/**
 * KR31.3 — числа використань класових фіч 2024 мусять бути **в базі**, а не лише у файлі.
 *
 * Вхідний файл звіряє з книгою `tests/content/class-feature-uses-2024.test.ts`; тут перевіряється
 * інша ланка — що сід доніс ті самі числа до `feature`. Без цієї перевірки зелений контентний
 * гейт означав би тільки «файл гарний», а лист лишався б порожнім.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";
import { buildFeatureEngNames } from "../../prisma/seed/classSeed2024";
import { CLASSES_JSON } from "../../scripts/2024/parse-class-feature-uses";
import { BLOOD_HUNTER_CLASS_NAMES } from "../../prisma/seed/bloodHunter";

type FeatureEng = {
  level: number;
  name: string;
  displayOrder: number;
  displayType?: string[];
  uses?: { limitedUsesPer: string; usesCount?: number; usesCountSpecial?: unknown; usesPoolKey?: string };
};

type ClassJson = { engName: string; featuresEng?: FeatureEng[] };

/// jsonb віддає ключі у своєму порядку, тож порівнюються значення, а не текст запису.
function stringifyStably(value: unknown): string {
  return JSON.stringify(value, (_key, nested) =>
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? Object.fromEntries(Object.entries(nested).sort(([left], [right]) => left.localeCompare(right)))
      : nested,
  );
}

const classes: ClassJson[] = JSON.parse(readFileSync(join(process.cwd(), CLASSES_JSON), "utf-8"));

const expectedByEngName = new Map(
  classes.flatMap((cls) => {
    const featuresEng = cls.featuresEng ?? [];
    return featuresEng.map((feature, index) => [
      buildFeatureEngNames(featuresEng, cls.engName)[index],
      {
        limitedUsesPer: feature.uses?.limitedUsesPer ?? null,
        usesCount: feature.uses?.usesCount ?? null,
        usesCountSpecial: feature.uses?.usesCountSpecial ?? null,
        usesPoolKey: feature.uses?.usesPoolKey ?? null,
        displayType: feature.displayType ?? ["PASSIVE"],
      },
    ]);
  }),
);

afterAll(disconnectDatabase);

describe("лічильники класових фіч 2024 у базі", () => {
  it("кожна класова фіча несе рівно ті числа, що й файл-джерело", async () => {
    const seeded = await prisma.feature.findMany({
      where: { engName: { in: [...expectedByEngName.keys()] } },
      select: {
        engName: true,
        limitedUsesPer: true,
        usesCount: true,
        usesCountSpecial: true,
        usesPoolKey: true,
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
          usesPoolKey: feature.usesPoolKey,
          displayType: feature.displayType,
        },
        expected: expectedByEngName.get(feature.engName),
      }))
      .filter(({ actual, expected }) => stringifyStably(actual) !== stringifyStably(expected))
      .map(({ engName, actual, expected }) => `${engName}: ${stringifyStably(actual)} проти ${stringifyStably(expected)}`);

    expect(mismatched).toEqual([]);
  });

  it("жодна класова фіча 2024 не несе лічильника, якого немає у файлі", async () => {
    const counted = await prisma.feature.findMany({
      where: {
        ruleset: "RULES_2024",
        // Мисливець за кровʼю — власний носій O45, його звіряє blood-hunter-carrier.
        classFeatures: { some: { class: { name: { notIn: [...BLOOD_HUNTER_CLASS_NAMES] } } } },
        OR: [{ usesCount: { not: null } }, { limitedUsesPer: { not: null } }, { usesPoolKey: { not: null } }],
      },
      select: { engName: true },
    });

    const expectedCounted = [...expectedByEngName.entries()]
      .filter(([, expected]) => expected.limitedUsesPer !== null)
      .map(([engName]) => engName)
      .sort();

    expect(counted.map((feature) => feature.engName).sort()).toEqual(expectedCounted);
  });
});
