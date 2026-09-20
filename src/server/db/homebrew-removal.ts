import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deleteStoredImage } from "@/server/media/image-upload";

export async function deleteHomebrewEntryAsModerator(entryId: number): Promise<void> {
  const creature = await prisma.homebrewCreature.findUnique({ where: { homebrewEntryId: entryId }, select: { statBlock: true } });
  await prisma.homebrewEntry.updateMany({ where: { homebrewEntryId: entryId, deletedAt: null }, data: { deletedAt: new Date() } });
  await deleteStoredImage(readImageKey(creature?.statBlock));
}

export function readImageKey(value: Prisma.JsonValue | undefined): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return typeof value.imageKey === "string" ? value.imageKey : null;
}
