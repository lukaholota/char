import { prisma } from "@/lib/prisma";
import { calculateMaxUsesForFeature } from "@/lib/logic/feature-resources";
import { buildOwnedFeatureFilter, findPoolProviderForPers } from "@/server/db/resource-pool-provider";
import {
  WILDSHAPE_POOL_KEY,
  findFormFeature,
  findFormPrice,
  describeUseShortfall,
  hasUnlimitedWildshapeUses,
} from "@/rules/wildshape-uses";
import { findDruidStanding } from "@/rules/wildshape";

/// Лічильник Дикої форми таким, яким його бачить лист: скільки лишилось, скільки всього і
/// скільки коштує вхід саме в цю форму. Пул той самий, що на слайді Рис, — не другий,
/// «автоматичний»: ручне керування лишається робочим ([KR24.5](../../../docs/o24-wildshape-second-layer/kr24.5-uses-and-form.md)).
export type WildshapeUses = {
  featureId: number;
  price: number;
  remaining: number;
  max: number;
  /** Архідруїд 2014: межі немає — лист малює «Без обмежень», а вхід нічого не списує. */
  isUnlimited: boolean;
};

/// Тип істоти за замовчуванням — звір: базова Дика форма перетворює саме на нього, і саме її
/// ціну показує картка, поки гравець не увійшов у форму.
const DEFAULT_CREATURE_TYPE = "звір";

/// `null` — персонаж не має фічі, яка перетворює на істоту цього типу, або її максимум із даних
/// не виводиться. Тоді лічильника немає й платити нема з чого.
export async function findWildshapeUses(input: {
  persId: number;
  creatureType?: string;
}): Promise<WildshapeUses | null> {
  const feature = await findFormFeatureOfPers(input.persId, input.creatureType ?? DEFAULT_CREATURE_TYPE);
  if (!feature) return null;

  const maximum = await findPoolMaximum(input.persId);
  if (!maximum) return null;

  const pool = await prisma.persResourcePool.findUnique({
    where: { persId_poolKey: { persId: input.persId, poolKey: WILDSHAPE_POOL_KEY } },
    select: { usesRemaining: true },
  });

  return {
    featureId: feature.featureId,
    price: findFormPrice(feature),
    remaining: pool?.usesRemaining ?? maximum.max,
    max: maximum.max,
    isUnlimited: maximum.isUnlimited,
  };
}

/// Витрата за вхід у форму; віддає попередження, якщо залишку не вистачило. Знімаємо тоді
/// скільки є й пропускаємо ([Р-3], [Р26]): лист трекер, а не суддя.
export async function spendWildshapeUse(input: {
  persId: number;
  creatureType: string;
}): Promise<string | null> {
  const uses = await findWildshapeUses(input);
  if (!uses) return null;
  if (uses.isUnlimited) return null;

  await withdrawFromPool({ persId: input.persId, price: uses.price, max: uses.max });

  return describeUseShortfall({ price: uses.price, remaining: uses.remaining });
}

async function findFormFeatureOfPers(persId: number, creatureType: string) {
  const owned = await buildOwnedFeatureFilter(persId);
  if (!owned) return null;

  const features = await prisma.feature.findMany({
    where: { usesPoolKey: WILDSHAPE_POOL_KEY, ...owned },
    select: { featureId: true, engName: true, usePrice: true },
  });

  return findFormFeature(features, creatureType);
}

/// Максимум рахує той самий власник пулу, за яким його показує лист і відновлює відпочинок
/// (BUG-011): інакше гравець бачив би одне число, а витрата знімала б із іншого. Тут же
/// вирішується, чи межа взагалі є: Архідруїд 2014 її знімає, і зчитувати персонажа вдруге заради
/// цього не треба — він уже завантажений.
async function findPoolMaximum(persId: number): Promise<{ max: number; isUnlimited: boolean } | null> {
  const [pers, provider] = await Promise.all([
    prisma.pers.findUnique({
      where: { persId },
      include: { multiclasses: { include: { class: true, subclass: true } }, class: true, subclass: true },
    }),
    findPoolProviderForPers({ persId, poolKey: WILDSHAPE_POOL_KEY }),
  ]);
  if (!pers || !provider) return null;

  const max = calculateMaxUsesForFeature(pers, provider);
  if (max === null) return null;

  const standing = findDruidStanding(collectClassStandings(pers));

  return {
    max,
    isUnlimited: hasUnlimitedWildshapeUses({ ruleset: pers.ruleset, druidLevel: standing.druidLevel }),
  };
}

type PersWithClasses = {
  level: number;
  class: { name: string } | null;
  subclass: { name: string } | null;
  multiclasses: Array<{ classLevel: number; class: { name: string } | null; subclass: { name: string } | null }>;
};

function collectClassStandings(pers: PersWithClasses) {
  const mainClassLevel = pers.level - pers.multiclasses.reduce((sum, entry) => sum + entry.classLevel, 0);

  return [
    { className: pers.class?.name ?? "", classLevel: mainClassLevel, subclassName: pers.subclass?.name ?? null },
    ...pers.multiclasses.map((entry) => ({
      className: entry.class?.name ?? "",
      classLevel: entry.classLevel,
      subclassName: entry.subclass?.name ?? null,
    })),
  ];
}

/// Рядок пулу може ще не існувати — тоді він створюється повним, як і при ручній витраті.
async function withdrawFromPool(input: {
  persId: number;
  price: number;
  max: number;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const pool = await tx.persResourcePool.upsert({
      where: { persId_poolKey: { persId: input.persId, poolKey: WILDSHAPE_POOL_KEY } },
      create: { persId: input.persId, poolKey: WILDSHAPE_POOL_KEY, usesRemaining: input.max },
      update: {},
      select: { usesRemaining: true },
    });

    const remaining = Math.max(0, (pool.usesRemaining ?? input.max) - input.price);
    await tx.persResourcePool.update({
      where: { persId_poolKey: { persId: input.persId, poolKey: WILDSHAPE_POOL_KEY } },
      data: { usesRemaining: remaining },
    });
  });
}
