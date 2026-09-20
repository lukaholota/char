"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { canEditPers } from "@/lib/actions/pers";
import { findCurrentUserId } from "@/server/db/current-user";
import { deleteUnusedPortraits } from "@/server/db/pers-portrait-cleanup";
import { storeSquareImage } from "@/server/media/image-upload";

type PortraitResult = { success: true; portraitKey: string | null } | { success: false; error: string };

export async function uploadPersPortrait(formData: FormData): Promise<PortraitResult> {
  const persId = Number(formData.get("persId"));
  const accessError = await findPortraitAccessError(persId);
  if (accessError) return { success: false, error: accessError };

  const stored = await storeSquareImage(formData.get("file"), `portraits/${persId}`);
  if ("error" in stored) return { success: false, error: stored.error };

  return replacePortraitKey(persId, stored.key);
}

export async function removePersPortrait(persId: number): Promise<PortraitResult> {
  const accessError = await findPortraitAccessError(persId);
  if (accessError) return { success: false, error: accessError };
  return replacePortraitKey(persId, null);
}

async function findPortraitAccessError(persId: number): Promise<string | null> {
  if (!Number.isInteger(persId) || persId <= 0) return "Персонажа не знайдено";
  const userId = await findCurrentUserId();
  if (!userId) return "Не авторизовано";
  return (await canEditPers(persId, userId)) ? null : "Немає доступу до персонажа";
}

async function replacePortraitKey(persId: number, portraitKey: string | null): Promise<PortraitResult> {
  const previous = await prisma.pers.findUnique({ where: { persId }, select: { portraitKey: true } });
  await prisma.pers.update({ where: { persId }, data: { portraitKey } });
  await deleteUnusedPortraits([previous?.portraitKey ?? null]);
  revalidatePath(`/char/${persId}`);
  revalidatePath("/char/home");
  return { success: true, portraitKey };
}
