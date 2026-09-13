"use server";

import { auth } from "@/lib/auth";
import { canEditPers } from "@/lib/actions/pers";
import {
  addMagicItemLink,
  deletePersMagicItem,
  findAttunementLimitError,
  findMagicItemPersId,
  hasMagicItemLink,
  removeMagicItemLinks,
  updatePersMagicItem,
  type MagicItemUpdates,
} from "@/server/db/magic-items";
import { findUserIdByEmail } from "@/server/db/users";
import { revalidatePath } from "next/cache";

async function assertOwnsPers(persId: number) {
  const session = await auth();
  if (!session?.user?.email) return { ok: false as const, error: "Не авторизовано" };

  const userId = await findUserIdByEmail(session.user.email);
  if (!userId) return { ok: false as const, error: "Користувача не знайдено" };

  const canEdit = await canEditPers(persId, userId);
  if (!canEdit) return { ok: false as const, error: "Немає доступу до персонажа" };

  return { ok: true as const };
}

export async function updateMagicItem(
  persMagicItemId: number,
  updates: MagicItemUpdates
) {
  const persId = await findMagicItemPersId(persMagicItemId);
  if (persId === null) return { success: false, error: "Предмет не знайдено" };

  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  if (updates.isAttuned) {
    const limitError = await findAttunementLimitError(persId, persMagicItemId);
    if (limitError) return { success: false, error: limitError };
  }

  try {
    const updated = await updatePersMagicItem(persMagicItemId, updates);

    revalidatePath(`/char/${persId}`);
    revalidatePath(`/character/${persId}`);
    return { success: true, item: updated };
  } catch (error) {
    console.error("Error updating magic item:", error);
    return { success: false, error: "Помилка при оновленні предмета" };
  }
}

export async function deleteMagicItem(persMagicItemId: number) {
  const persId = await findMagicItemPersId(persMagicItemId);
  if (persId === null) return { success: false, error: "Предмет не знайдено" };

  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  try {
    await deletePersMagicItem(persMagicItemId);

    revalidatePath(`/char/${persId}`);
    revalidatePath(`/character/${persId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting magic item:", error);
    return { success: false, error: "Помилка при видаленні предмета" };
  }
}

export async function toggleMagicItemForPers({
  persId,
  magicItemId,
}: {
  persId: number;
  magicItemId: number;
}): Promise<{ success: true; added: boolean } | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  const existing = await hasMagicItemLink(persId, magicItemId);

  if (existing) {
    await removeMagicItemLinks(persId, magicItemId);

    revalidatePath(`/char/${persId}`);
    return { success: true, added: false };
  }

  await addMagicItemLink(persId, magicItemId);

  revalidatePath(`/char/${persId}`);
  return { success: true, added: true };
}
