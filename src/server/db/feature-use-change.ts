import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { findPoolProviderForPers } from "@/server/db/resource-pool-provider";
import { calculateMaxUsesForFeature } from "@/lib/logic/feature-resources";
import { stepFeatureUses, type FeatureUseDirection } from "@/lib/offline/operations";

export type FeatureUseResult =
  | { success: true; usesRemaining: number | null; changed?: boolean }
  | { success: false; error: string };

async function withSerializableRetry<T>(work: (tx: Prisma.TransactionClient) => Promise<T>, attempt = 0): Promise<T> {
  try {
    return await prisma.$transaction((tx) => work(tx), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error) {
    if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return withSerializableRetry(work, attempt + 1);
    }
    throw error;
  }
}

/// Спільний крок для дії з листа й для відтворення офлайн-черги; перевірка прав лишається на
/// тому, хто кличе, тому модуль не є `use server`. Ресурс із `usesPoolKey` ділять кілька рис —
/// тоді залишок живе в `persResourcePool`, а стелю дає та риса з пулу, яка знає лічильник.
export async function changeFeatureUses(
  { persId, featureId }: { persId: number; featureId: number },
  direction: FeatureUseDirection,
): Promise<FeatureUseResult> {
  const feature = await prisma.feature.findUnique({
    where: { featureId },
    select: {
      usesCount: true,
      usesCountDependsOnProficiencyBonus: true,
      usesCountSpecial: true,
      usesPoolKey: true,
      usePrice: true,
      classFeatures: { select: { classId: true } },
      subclassFeatures: { select: { subclass: { select: { classId: true } } } },
    },
  });
  if (!feature) return { success: false, error: "Вміння не знайдено" };

  const pers = await prisma.pers.findUnique({
    where: { persId },
    include: { multiclasses: true, class: true },
  });
  if (!pers) return { success: false, error: "Немає доступу до персонажа" };

  const cost = Math.max(1, Number(feature.usePrice ?? 1));
  const poolKey = feature.usesPoolKey;

  if (poolKey) {
    const hasCounts =
      feature.usesCountDependsOnProficiencyBonus ||
      typeof feature.usesCount === "number" ||
      (feature.usesCountSpecial && typeof feature.usesCountSpecial === "object");
    const provider = hasCounts ? feature : ((await findPoolProviderForPers({ persId, poolKey })) ?? feature);
    const max = calculateMaxUsesForFeature(pers, provider);

    const pool = await withSerializableRetry(async (tx) => {
      const current = await tx.persResourcePool.upsert({
        where: { persId_poolKey: { persId, poolKey } },
        create: { persId, poolKey, usesRemaining: max },
        update: {},
        select: { usesRemaining: true },
      });
      const next = findNextUses(current.usesRemaining, max, cost, direction);
      if (next === null) return { usesRemaining: null as number | null, changed: false };

      const saved = await tx.persResourcePool.update({
        where: { persId_poolKey: { persId, poolKey } },
        data: { usesRemaining: next },
        select: { usesRemaining: true },
      });
      return { usesRemaining: saved.usesRemaining, changed: next !== (current.usesRemaining ?? max) };
    });

    return describeResult(pool.usesRemaining, max, pool.changed);
  }

  const max = calculateMaxUsesForFeature(pers, feature);
  const updated = await withSerializableRetry(async (tx) => {
    const current = await tx.persFeature.upsert({
      where: { persId_featureId: { persId, featureId } },
      create: { persId, featureId, usesRemaining: max },
      update: {},
      select: { usesRemaining: true },
    });
    const next = findNextUses(current.usesRemaining, max, cost, direction);
    if (next === null) return { usesRemaining: null as number | null, changed: false };

    const saved = await tx.persFeature.update({
      where: { persId_featureId: { persId, featureId } },
      data: { usesRemaining: next },
      select: { usesRemaining: true },
    });
    return { usesRemaining: saved.usesRemaining, changed: next !== (current.usesRemaining ?? max) };
  });

  return describeResult(updated.usesRemaining, max, updated.changed);
}

function findNextUses(
  stored: number | null,
  max: number | null,
  cost: number,
  direction: FeatureUseDirection,
): number | null {
  const current = stored ?? max;
  if (typeof current !== "number" || typeof max !== "number") return null;
  return stepFeatureUses(Math.trunc(current), max, cost, direction);
}

function describeResult(usesRemaining: number | null, max: number | null, changed: boolean): FeatureUseResult {
  if (typeof usesRemaining !== "number" || typeof max !== "number") return { success: true, usesRemaining: null, changed: false };
  return { success: true, usesRemaining, changed };
}
