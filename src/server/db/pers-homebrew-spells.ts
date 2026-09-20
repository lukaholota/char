"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { canEditPers } from "@/lib/actions/pers";
import { findCurrentUserId } from "@/server/db/current-user";
import { toHomebrewCatalogId } from "@/lib/logic/homebrew-view";

type PresenceResult = { success: true; present: boolean; spellId: number } | { success: false; error: string };

export async function setHomebrewSpellPresence(input: { persId: number; entryId: number; present: boolean }): Promise<PresenceResult> {
  const accessError = await findEditAccessError(input.persId);
  if (accessError) return { success: false, error: accessError };

  if (!input.present) {
    await prisma.persHomebrewSpell.deleteMany({ where: { persId: input.persId, homebrewEntryId: input.entryId } });
    return finishChange(input.persId, { success: true, present: false, spellId: toHomebrewCatalogId(input.entryId) });
  }

  const entryError = await findAddableEntryError(input.persId, input.entryId);
  if (entryError) return { success: false, error: entryError };
  await prisma.persHomebrewSpell.createMany({ data: [{ persId: input.persId, homebrewEntryId: input.entryId }], skipDuplicates: true });
  return finishChange(input.persId, { success: true, present: true, spellId: toHomebrewCatalogId(input.entryId) });
}

async function findEditAccessError(persId: number): Promise<string | null> {
  const userId = await findCurrentUserId();
  if (!userId) return "Не авторизовано";
  return (await canEditPers(persId, userId)) ? null : "Немає доступу до персонажа";
}

async function findAddableEntryError(persId: number, entryId: number): Promise<string | null> {
  const [pers, entry] = await Promise.all([
    prisma.pers.findUnique({ where: { persId }, select: { ruleset: true } }),
    prisma.homebrewEntry.findFirst({ where: { homebrewEntryId: entryId, kind: "SPELL", deletedAt: null }, select: { ruleset: true } }),
  ]);
  if (!pers || !entry) return "Заклинання не знайдено";
  return entry.ruleset === null || pers.ruleset === entry.ruleset ? null : "Це заклинання належить іншій редакції правил";
}

function finishChange<T>(persId: number, result: T): T {
  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);
  return result;
}
