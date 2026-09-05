'use server';

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findPoolProviderForPers } from "@/server/db/resource-pool-provider";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { canEditPers } from "@/lib/actions/pers";
import { calculateMaxUsesForFeature } from "@/lib/logic/feature-resources";

async function withSerializableRetry<T>(work: (tx: Prisma.TransactionClient) => Promise<T>, attempt = 0): Promise<T> {
  try {
    return await prisma.$transaction((tx) => work(tx), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error) {
    if (
      attempt < 2 &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return withSerializableRetry(work, attempt + 1);
    }

    throw error;
  }
}

export async function spendFeatureUse({
  persId,
  featureId,
}: {
  persId: number;
  featureId: number;
}): Promise<{ success: true; usesRemaining: number | null } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user?.email) return { success: false, error: "Не авторизовано" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return { success: false, error: "Користувача не знайдено" };

  // Fetch feature to know max uses if we need to initialize
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

  // Need more pers info to calculate max uses
  const pers = await prisma.pers.findUnique({
    where: { persId },
    include: {
      multiclasses: true,
      class: true
    }
  });

  if (!pers) return { success: false, error: "Немає доступу до персонажа" };
  const canEdit = await canEditPers(persId, user.id);
  if (!canEdit) return { success: false, error: "Немає доступу до персонажа" };

  const poolKey = feature.usesPoolKey;
  if (poolKey) {
      const cost = Math.max(1, Number(feature.usePrice ?? 1));
      const hasCounts = feature.usesCountDependsOnProficiencyBonus || typeof feature.usesCount === "number" || (feature.usesCountSpecial && typeof feature.usesCountSpecial === "object");
      const provider = hasCounts
        ? feature
        : (await findPoolProviderForPers({ persId, poolKey })) ?? feature;

      const max = calculateMaxUsesForFeature(pers, provider);
      const cur = await withSerializableRetry(async (tx) => {
        const pool = await tx.persResourcePool.upsert({
          where: { persId_poolKey: { persId, poolKey } },
          create: { persId, poolKey, usesRemaining: max },
          update: {},
          select: { usesRemaining: true },
        });

        const current = pool.usesRemaining ?? max;
        if (typeof current !== "number" || typeof max !== "number") {
          return { usesRemaining: null as number | null };
        }

        if (current < cost) {
          return { usesRemaining: current };
        }

        return tx.persResourcePool.update({
          where: { persId_poolKey: { persId, poolKey } },
          data: { usesRemaining: Math.max(0, Math.trunc(current) - cost) },
          select: { usesRemaining: true },
        });
      });

      const next = cur.usesRemaining;
      if (typeof next !== "number" || typeof max !== "number") {
        return { success: true, usesRemaining: null };
      }

      revalidatePath(`/char/${persId}`);
      revalidatePath(`/character/${persId}`);

      return { success: true, usesRemaining: next };
  }

  const max = calculateMaxUsesForFeature(pers, feature);
  const updated = await withSerializableRetry(async (tx) => {
    const pf = await tx.persFeature.upsert({
      where: {
        persId_featureId: {
          persId,
          featureId,
        },
      },
      create: {
        persId,
        featureId,
        usesRemaining: max,
      },
      update: {},
      select: { usesRemaining: true },
    });

    const cur = pf.usesRemaining ?? max;
    if (typeof cur !== "number" || typeof max !== "number") {
      return { usesRemaining: null as number | null };
    }

    const cost = Math.max(1, Number(feature.usePrice ?? 1));
    if (cur < cost) {
      return { usesRemaining: cur };
    }

    return tx.persFeature.update({
      where: {
        persId_featureId: {
          persId,
          featureId,
        },
      },
      data: {
        usesRemaining: Math.max(0, Math.trunc(cur) - cost),
      },
      select: { usesRemaining: true },
    });
  });
  
  if (typeof updated.usesRemaining !== "number" || typeof max !== "number") {
    return { success: true, usesRemaining: null };
  }

  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);

  return { success: true, usesRemaining: updated.usesRemaining };
}

export async function restoreFeatureUse({
  persId,
  featureId,
}: {
  persId: number;
  featureId: number;
}): Promise<{ success: true; usesRemaining: number | null } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user?.email) return { success: false, error: "Не авторизовано" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return { success: false, error: "Користувача не знайдено" };

  // Fetch feature to know max uses
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
    include: {
      multiclasses: true,
      class: true
    }
  });

  if (!pers) return { success: false, error: "Немає доступу до персонажа" };
  const canEdit = await canEditPers(persId, user.id);
  if (!canEdit) return { success: false, error: "Немає доступу до персонажа" };

  const poolKey = feature.usesPoolKey;
  if (poolKey) {
      const cost = Math.max(1, Number(feature.usePrice ?? 1));
      const hasCounts = feature.usesCountDependsOnProficiencyBonus || typeof feature.usesCount === "number" || (feature.usesCountSpecial && typeof feature.usesCountSpecial === "object");
      const provider = hasCounts
        ? feature
        : (await findPoolProviderForPers({ persId, poolKey })) ?? feature;

      const max = calculateMaxUsesForFeature(pers, provider);
      const updatedPool = await withSerializableRetry(async (tx) => {
        const pool = await tx.persResourcePool.upsert({
          where: { persId_poolKey: { persId, poolKey } },
          create: { persId, poolKey, usesRemaining: max },
          update: {},
          select: { usesRemaining: true },
        });

        const cur = pool.usesRemaining ?? max;
        if (typeof cur !== "number" || typeof max !== "number") {
          return { usesRemaining: null as number | null };
        }

        return tx.persResourcePool.update({
          where: { persId_poolKey: { persId, poolKey } },
          data: { usesRemaining: Math.min(max, Math.trunc(cur) + cost) },
          select: { usesRemaining: true },
        });
      });

      const cur = updatedPool.usesRemaining;
      if (typeof cur !== "number" || typeof max !== "number") {
        return { success: true, usesRemaining: null };
      }

      revalidatePath(`/char/${persId}`);
      revalidatePath(`/character/${persId}`);

      return { success: true, usesRemaining: updatedPool.usesRemaining };
  }

  const max = calculateMaxUsesForFeature(pers, feature);
  const updated = await withSerializableRetry(async (tx) => {
    const pf = await tx.persFeature.upsert({
      where: {
        persId_featureId: {
          persId,
          featureId,
        },
      },
      create: {
        persId,
        featureId,
        usesRemaining: max,
      },
      update: {},
      select: { usesRemaining: true },
    });

    const cur = pf.usesRemaining ?? max;
    if (typeof cur !== "number" || typeof max !== "number") {
      return { usesRemaining: null as number | null };
    }

    const cost = Math.max(1, Number(feature.usePrice ?? 1));

    return tx.persFeature.update({
      where: {
        persId_featureId: {
          persId,
          featureId,
        },
      },
      data: {
        usesRemaining: Math.min(max, Math.trunc(cur) + cost),
      },
      select: { usesRemaining: true },
    });
  });

  if (typeof updated.usesRemaining !== "number" || typeof max !== "number") {
    return { success: true, usesRemaining: null };
  }

  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);

  return { success: true, usesRemaining: updated.usesRemaining };
}
