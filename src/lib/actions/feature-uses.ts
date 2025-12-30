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
    select: { persId: true, userId: true, level: true },
  });
  if (!pers || pers.userId !== user.id) return { success: false, error: "Немає доступу до персонажа" };

  // Fetch feature to know max uses if we need to initialize
  const feature = await prisma.feature.findUnique({
    where: { featureId },
    select: { usesCount: true, usesCountDependsOnProficiencyBonus: true },
  });
  if (!feature) return { success: false, error: "Вміння не знайдено" };

  const pf = await prisma.persFeature.findUnique({
    where: {
      persId_featureId: {
        persId,
        featureId,
      },
    },
    select: { usesRemaining: true },
  });

  // Calculate max uses
  let max = feature.usesCount;
  if (feature.usesCountDependsOnProficiencyBonus) {
      max = Math.ceil(pers.level / 4) + 1;
  }

  // If no record or usesRemaining is null, start from max
  const cur = pf?.usesRemaining ?? max;
  
  if (typeof cur !== "number") {
    return { success: true, usesRemaining: null };
  }

  const next = Math.max(0, Math.trunc(cur) - 1);

  const updated = await prisma.persFeature.upsert({
    where: {
      persId_featureId: {
        persId,
        featureId,
      },
    },
    create: {
      persId,
      featureId,
      usesRemaining: next
    },
    update: { 
      usesRemaining: next 
    },
    select: { usesRemaining: true },
  });

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

  const pers = await prisma.pers.findUnique({
    where: { persId },
    select: { persId: true, userId: true, level: true },
  });
  if (!pers || pers.userId !== user.id) return { success: false, error: "Немає доступу до персонажа" };

  const feature = await prisma.feature.findUnique({
    where: { featureId },
    select: { usesCount: true, usesCountDependsOnProficiencyBonus: true },
  });
  if (!feature) return { success: false, error: "Вміння не знайдено" };

  const pf = await prisma.persFeature.findUnique({
    where: {
      persId_featureId: {
        persId,
        featureId,
      },
    },
    select: { usesRemaining: true },
  });

  // Calculate max uses
  let max = feature.usesCount;
  if (feature.usesCountDependsOnProficiencyBonus) {
      max = Math.ceil(pers.level / 4) + 1;
  }
  
  // If no record or usesRemaining is null, start from max
  const cur = pf?.usesRemaining ?? max;

  if (typeof cur !== "number" || typeof max !== "number") {
    return { success: true, usesRemaining: null };
  }

  const next = Math.min(max, Math.trunc(cur) + 1);

  const updated = await prisma.persFeature.upsert({
    where: {
      persId_featureId: {
        persId,
        featureId,
      },
    },
    create: {
      persId,
      featureId,
      usesRemaining: next
    },
    update: { 
      usesRemaining: next 
    },
    select: { usesRemaining: true },
  });

  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);

  return { success: true, usesRemaining: updated.usesRemaining };
}
