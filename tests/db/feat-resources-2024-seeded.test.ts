/**
 * KR31.3 — ресурси рис персонажа 2024 мусять бути **в базі**: фіча-носій із числами й звʼязок із
 * самою рисою.
 *
 * Ланка тут довша, ніж у класів і видів. Колонок використань у `feat` немає, тому лічильник
 * живе на окремій фічі `<Риса>: <Перевага> (2024)`, яку риса дає через `Feat.grantsFeature`.
 * Без цього звʼязку числа лежали б у базі, а персонаж, який узяв рису, не дістав би рядка
 * `pers_feature` — і лист лишався б порожнім попри правильні дані.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";
import { FEATS_JSON } from "../../scripts/2024/parse-feat-uses";

type BenefitJson = {
  name: string;
  displayType?: string[];
  uses?: {
    limitedUsesPer?: string;
    usesCount?: number;
    usesCountDependsOnProficiencyBonus?: true;
  };
};

type FeatJson = { engName: string; benefitsEng?: BenefitJson[] };

const feats: FeatJson[] = JSON.parse(readFileSync(join(process.cwd(), FEATS_JSON), "utf-8"));

const expectedByEngName = new Map(
  feats.flatMap((feat) =>
    (feat.benefitsEng ?? [])
      .filter((benefit) => benefit.uses)
      .map((benefit) => [
        `${feat.engName.replace(/\bOf\b/g, "of")}: ${benefit.name} (2024)`,
        {
          featEngName: feat.engName,
          limitedUsesPer: benefit.uses!.limitedUsesPer ?? null,
          usesCount: benefit.uses!.usesCount ?? null,
          usesCountDependsOnProficiencyBonus: benefit.uses!.usesCountDependsOnProficiencyBonus ?? false,
          displayType: benefit.displayType ?? ["PASSIVE"],
        },
      ]),
  ),
);

afterAll(disconnectDatabase);

describe("ресурси рис персонажа 2024 у базі", () => {
  it("кожен носій несе рівно ті числа, що й файл-джерело", async () => {
    const seeded = await prisma.feature.findMany({
      where: { engName: { in: [...expectedByEngName.keys()] } },
      select: {
        engName: true,
        limitedUsesPer: true,
        usesCount: true,
        usesCountDependsOnProficiencyBonus: true,
        displayType: true,
      },
      orderBy: { engName: "asc" },
    });

    expect(seeded.map((feature) => feature.engName)).toEqual([...expectedByEngName.keys()].sort());

    const mismatched = seeded
      .filter((feature) => {
        const expected = expectedByEngName.get(feature.engName)!;
        return (
          feature.limitedUsesPer !== expected.limitedUsesPer ||
          feature.usesCount !== expected.usesCount ||
          feature.usesCountDependsOnProficiencyBonus !== expected.usesCountDependsOnProficiencyBonus ||
          JSON.stringify(feature.displayType) !== JSON.stringify(expected.displayType)
        );
      })
      .map((feature) => feature.engName);

    expect(mismatched).toEqual([]);
  });

  it("носій висить на своїй рисі — інакше взявши її, персонаж не дістане лічильника", async () => {
    const linked = await prisma.feat.findMany({
      where: { ruleset: "RULES_2024", grantsFeature: { some: { engName: { in: [...expectedByEngName.keys()] } } } },
      select: { engName: true, grantsFeature: { select: { engName: true } } },
    });

    const pairs = linked
      .flatMap((feat) =>
        feat.grantsFeature
          .filter((feature) => expectedByEngName.has(feature.engName))
          .map((feature) => `${feat.engName} → ${feature.engName}`),
      )
      .sort();

    expect(pairs).toEqual(
      [...expectedByEngName.entries()].map(([engName, expected]) => `${expected.featEngName} → ${engName}`).sort(),
    );
  });

  it("Щасливчик дає бонус майстерності очок удачі, які повертає довгий відпочинок", async () => {
    const carrier = await prisma.feature.findUniqueOrThrow({
      where: { engName: "Lucky: Luck Points (2024)" },
      select: {
        name: true,
        limitedUsesPer: true,
        usesCount: true,
        usesCountSpecial: true,
        usesCountDependsOnProficiencyBonus: true,
        usesPoolKey: true,
      },
    });

    expect(carrier).toEqual({
      name: "Щасливчик: Очки Удачі",
      limitedUsesPer: "LONG_REST",
      usesCount: null,
      usesCountSpecial: null,
      usesCountDependsOnProficiencyBonus: true,
      // Пулу немає навмисно: очки удачі витрачає сама риса, а пул потрібен лише там, де ресурс
      // ділять кілька фіч. Ціна застосування в книзі завжди 1, тож `use_price` теж не потрібна.
      usesPoolKey: null,
    });
  });

  /** BUG-011: носій-риса не має ключа пулу, тож не може перебити класового власника ресурсу. */
  it("жоден носій ресурсу риси не претендує на роль власника пулу", async () => {
    const withPool = await prisma.feature.findMany({
      where: { engName: { in: [...expectedByEngName.keys()] }, usesPoolKey: { not: null } },
      select: { engName: true, usesPoolKey: true },
    });

    expect(withPool).toEqual([]);
  });
});
