/**
 * KR31.3 — числа використань і пули підкласових фіч 2024 мусять бути **в базі**, а не лише у
 * файлі.
 *
 * Вхідний файл звіряє з джерелом `tests/content/subclass-feature-uses-2024.test.ts`; тут
 * перевіряється інша ланка — що сід доніс ті самі числа до `feature`. Без цієї перевірки зелений
 * контентний гейт означав би тільки «файл гарний», а лист лишався б порожнім.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";
import { SUBCLASSES_JSON } from "../../scripts/2024/parse-subclass-feature-uses";
import { BLOOD_HUNTER_SUBCLASS_NAMES } from "../../prisma/seed/bloodHunter";

type FeatureEng = {
  level: number;
  name: string;
  displayType?: string[];
  uses?: { limitedUsesPer?: string; usesCount?: number; usesCountSpecial?: unknown; usesPoolKey?: string };
};

type SubclassJson = { engName: string; featuresEng?: FeatureEng[] };

/// jsonb віддає ключі у своєму порядку, тож порівнюються значення, а не текст запису.
function stringifyStably(value: unknown): string {
  return JSON.stringify(value, (_key, nested) =>
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? Object.fromEntries(Object.entries(nested).sort(([left], [right]) => left.localeCompare(right)))
      : nested,
  );
}

const subclasses: SubclassJson[] = JSON.parse(readFileSync(join(process.cwd(), SUBCLASSES_JSON), "utf-8"));

const expectedByEngName = new Map(
  subclasses.flatMap((subclass) =>
    (subclass.featuresEng ?? []).map((feature) => [
      `${subclass.engName}: ${feature.name} (2024)`,
      {
        limitedUsesPer: feature.uses?.limitedUsesPer ?? null,
        usesCount: feature.uses?.usesCount ?? null,
        usesCountSpecial: feature.uses?.usesCountSpecial ?? null,
        usesPoolKey: feature.uses?.usesPoolKey ?? null,
        displayType: feature.displayType ?? ["PASSIVE"],
      },
    ]),
  ),
);

afterAll(disconnectDatabase);

describe("лічильники підкласових фіч 2024 у базі", () => {
  it("кожна підкласова фіча несе рівно ті числа, що й файл-джерело", async () => {
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

  it("жодна підкласова фіча 2024 не несе лічильника чи пулу, якого немає у файлі", async () => {
    const carrying = await prisma.feature.findMany({
      where: {
        ruleset: "RULES_2024",
        // Мисливець за кровʼю — власний носій O45, його звіряє blood-hunter-carrier.
        subclassFeatures: { some: { subclass: { name: { notIn: [...BLOOD_HUNTER_SUBCLASS_NAMES] } } } },
        OR: [{ usesCount: { not: null } }, { limitedUsesPer: { not: null } }, { usesPoolKey: { not: null } }],
      },
      select: { engName: true },
    });

    const expectedCarrying = [...expectedByEngName.entries()]
      .filter(([, expected]) => expected.limitedUsesPer !== null || expected.usesPoolKey !== null)
      .map(([engName]) => engName)
      .sort();

    expect(carrying.map((feature) => feature.engName).sort()).toEqual(expectedCarrying);
  });

  /**
   * BUG-011: суддя пулу бере фічу з масштабованим максимумом раніше за пласку, і класову раніше
   * за підкласову. Підкласова фіча, що з пулу тільки витрачає, не має нести ані максимуму, ані
   * `limitedUsesPer` — інакше вона переб'є класову, яка пул дає.
   */
  it("витратні фічі 2024 не претендують на роль власника пулу", async () => {
    const spenders = await prisma.feature.findMany({
      where: { ruleset: "RULES_2024", subclassFeatures: { some: {} }, usesPoolKey: { not: null }, limitedUsesPer: null },
      select: { engName: true, usesCount: true, usesCountSpecial: true, usesCountDependsOnProficiencyBonus: true },
    });

    expect(spenders.length).toBeGreaterThan(0);
    expect(
      spenders.filter(
        (feature) =>
          feature.usesCount !== null || feature.usesCountSpecial !== null || feature.usesCountDependsOnProficiencyBonus,
      ),
    ).toEqual([]);
  });
});
