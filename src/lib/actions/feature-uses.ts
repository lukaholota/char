"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

  const pers = await prisma.pers.findUnique({
    where: { persId },
    select: { persId: true, userId: true },
  });
  if (!pers || pers.userId !== user.id) return { success: false, error: "Немає доступу до персонажа" };

  const pf = await prisma.persFeature.findUnique({
    where: {
      persId_featureId: {
        persId,
        featureId,
      },
    },
    select: { usesRemaining: true },
  });

  const cur = pf?.usesRemaining;
  if (typeof cur !== "number") {
    return { success: true, usesRemaining: null };
  }

  const next = Math.max(0, Math.trunc(cur) - 1);

  const updated = await prisma.persFeature.update({
    where: {
      persId_featureId: {
        persId,
        featureId,
      },
    },
    data: { usesRemaining: next },
    select: { usesRemaining: true },
  });

  revalidatePath(`/pers/${persId}`);
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

  const pers = await prisma.pers.findUnique({
    where: { persId },
    select: { persId: true, userId: true },
  });
  if (!pers || pers.userId !== user.id) return { success: false, error: "Немає доступу до персонажа" };

  const pf = await prisma.persFeature.findUnique({
    where: {
      persId_featureId: {
        persId,
        featureId,
      },
    },
    include: { 
      feature: true,
      pers: {
        select: { level: true }
      }
    },
  });

  if (!pf) return { success: false, error: "Вміння не знайдено" };

  // Calculate max uses
  let max = pf.feature.usesCount;
  if (pf.feature.usesCountDependsOnProficiencyBonus) {
      max = Math.ceil(pf.pers.level / 4) + 1;
  }
  
  const cur = pf.usesRemaining;
  if (typeof cur !== "number" || typeof max !== "number") {
    return { success: true, usesRemaining: null };
  }

  const next = Math.min(max, Math.trunc(cur) + 1);

  const updated = await prisma.persFeature.update({
    where: {
      persId_featureId: {
        persId,
        featureId,
      },
    },
    data: { usesRemaining: next },
    select: { usesRemaining: true },
  });

  revalidatePath(`/pers/${persId}`);
  revalidatePath(`/character/${persId}`);

  return { success: true, usesRemaining: updated.usesRemaining };
}
