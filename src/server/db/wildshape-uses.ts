import { prisma } from "@/lib/prisma";
import { calculateMaxUsesForFeature } from "@/lib/logic/feature-resources";
import { buildOwnedFeatureFilter, findPoolProviderForPers } from "@/server/db/resource-pool-provider";
import {
  WILDSHAPE_POOL_KEY,
  findFormFeature,
  findFormPrice,
  describeUseShortfall,
} from "@/rules/wildshape-uses";

/// Лічильник Дикої форми таким, яким його бачить лист: скільки лишилось, скільки всього і
/// скільки коштує вхід саме в цю форму. Пул той самий, що на слайді Рис, — не другий,
/// «автоматичний»: ручне керування лишається робочим ([KR24.5](../../../docs/o24-wildshape-second-layer/kr24.5-uses-and-form.md)).
export type WildshapeUses = {
  featureId: number;
  price: number;
  remaining: number;
  max: number;
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

  const max = await findPoolMaximum(input.persId);
  if (max === null) return null;

  const pool = await prisma.persResourcePool.findUnique({
    where: { persId_poolKey: { persId: input.persId, poolKey: WILDSHAPE_POOL_KEY } },
    select: { usesRemaining: true },
  });

  return {
    featureId: feature.featureId,
    price: findFormPrice(feature),
    remaining: pool?.usesRemaining ?? max,
    max,
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
/// (BUG-011): інакше гравець бачив би одне число, а витрата знімала б із іншого.
async function findPoolMaximum(persId: number): Promise<number | null> {
  const [pers, provider] = await Promise.all([
    prisma.pers.findUnique({ where: { persId }, include: { multiclasses: true, class: true } }),
    findPoolProviderForPers({ persId, poolKey: WILDSHAPE_POOL_KEY }),
  ]);
  if (!pers || !provider) return null;

  return calculateMaxUsesForFeature(pers, provider);
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
