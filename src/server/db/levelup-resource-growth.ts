import { Prisma } from "@prisma/client";
import { calculateMaxUsesForFeature, type FeatureResourcePersLike } from "@/lib/logic/feature-resources";
import { applyUsesMaximumDelta, findPoolProvider } from "@/rules/resource-pools";

/// Поля, з яких `calculateMaxUsesForFeature` рахує максимум — ті самі, що й у `PROVIDER_FIELDS`.
const MAXIMUM_FIELDS = {
  featureId: true,
  engName: true,
  usesCount: true,
  usesCountDependsOnProficiencyBonus: true,
  usesCountSpecial: true,
  classFeatures: { select: { classId: true } },
  subclassFeatures: { select: { subclass: { select: { classId: true } } } },
} as const;

type FeatureWithMaximum = Prisma.FeatureGetPayload<{ select: typeof MAXIMUM_FIELDS }>;

/**
 * Доростити лічильники використань до нових максимумів після підвищення рівня
 * (KR31.3, знахідка `L08-levelup-machine-08`).
 *
 * Слоти заклинань доростали ще з `applyLevelUp`, а `usesRemaining` не рухався ніде, крім
 * відпочинку: варвар, що витратив усі люті на 2-му рівні, входив у 3-й із нулем при максимумі 3.
 *
 * Читає **тільки** через `tx`: рівень щойно записаний цією ж транзакцією, і глобальний клієнт
 * побачив би ще старий.
 */
export async function growFeatureUsesToNewMaximums(
  tx: Prisma.TransactionClient,
  persId: number,
  levelBefore: number,
): Promise<void> {
  const persAfter = await loadPersForMaximums(tx, persId);
  if (!persAfter) return;

  const persBefore = { ...persAfter, level: levelBefore };
  const findDelta = (feature: FeatureWithMaximum, usesRemaining: number | null) =>
    applyUsesMaximumDelta({
      usesRemaining,
      beforeMaximum: calculateMaxUsesForFeature(persBefore, feature),
      afterMaximum: calculateMaxUsesForFeature(persAfter, feature),
    });

  await growPersFeatures(tx, persId, findDelta);
  await growResourcePools(tx, persId, findDelta);
}

type FindDelta = (feature: FeatureWithMaximum, usesRemaining: number | null) => number | null;

async function growPersFeatures(tx: Prisma.TransactionClient, persId: number, findDelta: FindDelta): Promise<void> {
  const rows = await tx.persFeature.findMany({
    where: { persId },
    select: { featureId: true, usesRemaining: true, feature: { select: MAXIMUM_FIELDS } },
  });

  for (const row of rows) {
    const grown = findDelta(row.feature, row.usesRemaining);
    if (grown === null) continue;
    await tx.persFeature.update({
      where: { persId_featureId: { persId, featureId: row.featureId } },
      data: { usesRemaining: grown },
    });
  }
}

/// Максимум пулу задає одна фіча з багатьох носіїв ключа — суддя той самий, що й у відпочинку
/// (`findPoolProvider`, BUG-011), інакше рівень доростив би пул за чужим числом.
async function growResourcePools(tx: Prisma.TransactionClient, persId: number, findDelta: FindDelta): Promise<void> {
  const pools = await tx.persResourcePool.findMany({ where: { persId } });
  if (pools.length === 0) return;

  const owned = await buildOwnedFeatureFilterWithin(tx, persId);
  if (!owned) return;

  for (const pool of pools) {
    const candidates = await tx.feature.findMany({
      where: { usesPoolKey: pool.poolKey, AND: [owned] },
      select: MAXIMUM_FIELDS,
    });
    const provider = findPoolProvider(candidates);
    if (!provider) continue;

    const grown = findDelta(provider, pool.usesRemaining);
    if (grown === null) continue;
    await tx.persResourcePool.update({
      where: { persId_poolKey: { persId, poolKey: pool.poolKey } },
      data: { usesRemaining: grown },
    });
  }
}

async function loadPersForMaximums(
  tx: Prisma.TransactionClient,
  persId: number,
): Promise<(FeatureResourcePersLike & { classId: number }) | null> {
  const pers = await tx.pers.findUnique({
    where: { persId },
    select: {
      level: true,
      classId: true,
      str: true, dex: true, con: true, int: true, wis: true, cha: true,
      multiclasses: { select: { classId: true, classLevel: true } },
    },
  });
  return pers ?? null;
}

async function buildOwnedFeatureFilterWithin(
  tx: Prisma.TransactionClient,
  persId: number,
): Promise<Prisma.FeatureWhereInput | null> {
  const pers = await tx.pers.findUnique({
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
    (subclassId): subclassId is number => subclassId !== null,
  );

  return {
    OR: [
      { classFeatures: { some: { classId: { in: classIds } } } },
      { subclassFeatures: { some: { subclassId: { in: subclassIds } } } },
      { persFeatures: { some: { persId } } },
    ],
  };
}
