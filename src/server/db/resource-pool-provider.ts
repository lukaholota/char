import { Prisma, RestType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findPoolProvider } from "@/rules/resource-pools";

/// Поля, з яких `calculateMaxUsesForFeature` рахує максимум пулу.
const PROVIDER_FIELDS = {
  featureId: true,
  usesCount: true,
  usesCountDependsOnProficiencyBonus: true,
  usesCountSpecial: true,
  classFeatures: { select: { classId: true } },
  subclassFeatures: { select: { subclass: { select: { classId: true } } } },
} as const;

export type PoolProvider = Prisma.FeatureGetPayload<{ select: typeof PROVIDER_FIELDS }>;

/**
 * Фіча, яка задає максимум пулу **цього** персонажа. Пошук звужено двічі: спершу до фіч, які
 * персонаж справді має (інакше клірик діставав би максимум паладина, а друїд — фічу чужого
 * кола), потім правилом `findPoolProvider`. До BUG-011 тут стояв глобальний `findFirst` без
 * сортування, і відповідь залежала від фізичного порядку рядків у таблиці.
 */
export async function findPoolProviderForPers(input: {
  persId: number;
  poolKey: string;
  restTypes?: RestType[];
}): Promise<PoolProvider | null> {
  const owned = await buildOwnedFeatureFilter(input.persId);
  if (!owned) return null;

  const candidates = await prisma.feature.findMany({
    where: {
      usesPoolKey: input.poolKey,
      ...(input.restTypes ? { limitedUsesPer: { in: input.restTypes } } : {}),
      AND: [
        {
          OR: [
            { usesCount: { not: null } },
            { usesCountDependsOnProficiencyBonus: true },
            { usesCountSpecial: { not: Prisma.AnyNull } },
          ],
        },
        owned,
      ],
    },
    select: PROVIDER_FIELDS,
  });

  return findPoolProvider(candidates);
}

/**
 * Фічі, які персонаж справді має: класові, підкласові й власні. Фільтр окремо, бо «має» мусить
 * означати одне й те саме і для власника пулу, і для фічі, що платить за перевтілення
 * ([KR24.5](../../../docs/o24-wildshape-second-layer/kr24.5-uses-and-form.md)). `null` —
 * персонажа немає.
 */
export async function buildOwnedFeatureFilter(persId: number): Promise<Prisma.FeatureWhereInput | null> {
  const pers = await prisma.pers.findUnique({
    where: { persId },
    select: {
      classId: true,
      subclassId: true,
      multiclasses: { select: { classId: true, subclassId: true } },
    },
  });
  if (!pers) return null;

  const classIds = [pers.classId, ...pers.multiclasses.map((multiclass) => multiclass.classId)];
  const subclassIds = [pers.subclassId, ...pers.multiclasses.map((multiclass) => multiclass.subclassId)].filter(
    (subclassId): subclassId is number => subclassId !== null
  );

  return {
    OR: [
      { classFeatures: { some: { classId: { in: classIds } } } },
      { subclassFeatures: { some: { subclassId: { in: subclassIds } } } },
      { persFeatures: { some: { persId } } },
    ],
  };
}
