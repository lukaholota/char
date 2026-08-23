"use server";

import { auth } from "@/lib/auth";
import { canEditPers } from "@/lib/actions/pers";
import { findUserIdByEmail } from "@/server/db/users";
import {
  addPersFeat,
  removePersFeat,
  removePersFeatById,
  getPersFeats,
  PersFeatWithDetails,
} from "@/server/db/feat-actions";
import { revalidatePath } from "next/cache";

async function assertOwnsPers(persId: number) {
  const session = await auth();
  if (!session?.user?.email) return { ok: false as const, error: "Не авторизовано" };

  const userId = await findUserIdByEmail(session.user.email);
  if (!userId) return { ok: false as const, error: "Користувача не знайдено" };

  const canEdit = await canEditPers(persId, userId);
  if (!canEdit) return { ok: false as const, error: "Немає доступу до персонажа" };

  return { ok: true as const, userId };
}

export async function addFeatToPers({
  persId,
  featId,
  choiceOptionIds,
}: {
  persId: number;
  featId: number;
  choiceOptionIds?: number[];
}): Promise<{ success: true } | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  try {
    await addPersFeat(persId, featId, choiceOptionIds);

    revalidatePath(`/char/${persId}`);
    revalidatePath(`/char/home`);
    revalidatePath(`/character/${persId}`);
    return { success: true };
  } catch (error) {
    console.error("Error adding feat to pers:", error);
    return { success: false, error: "Помилка при додаванні риси" };
  }
}

export async function removeFeatFromPers({
  persId,
  featId,
}: {
  persId: number;
  featId: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  try {
    await removePersFeat(persId, featId);

    revalidatePath(`/char/${persId}`);
    revalidatePath(`/char/home`);
    revalidatePath(`/character/${persId}`);
    return { success: true };
  } catch (error) {
    console.error("Error removing feat from pers:", error);
    return { success: false, error: "Помилка при видаленні риси" };
  }
}

export async function removePersFeatAction({
  persId,
  persFeatId,
}: {
  persId: number;
  persFeatId: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  try {
    await removePersFeatById(persFeatId, persId);

    revalidatePath(`/char/${persId}`);
    revalidatePath(`/char/home`);
    revalidatePath(`/character/${persId}`);
    return { success: true };
  } catch (error) {
    console.error("Error removing pers feat:", error);
    return { success: false, error: "Помилка при видаленні риси" };
  }
}

export async function fetchPersFeats(persId: number): Promise<PersFeatWithDetails[]> {
  return getPersFeats(persId);
}
