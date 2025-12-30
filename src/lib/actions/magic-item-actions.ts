"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Helper to assert the user owns the pers
 */
async function assertOwnsPers(persId: number) {
  const session = await auth();
  if (!session?.user?.email) return { ok: false as const, error: "Не авторизовано" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) return { ok: false as const, error: "Користувача не знайдено" };

  const pers = await prisma.pers.findUnique({
    where: { persId },
    select: {
      persId: true,
      userId: true,
    },
  });

  if (!pers || pers.userId !== user.id) {
    return { ok: false as const, error: "Немає доступу до персонажа" };
  }

  return { ok: true as const, pers };
}

export async function updateMagicItem(
  persMagicItemId: number,
  updates: {
    isEquipped?: boolean;
    isAttuned?: boolean;
  }
) {
  const item = await prisma.persMagicItem.findUnique({
    where: { persMagicItemId },
    select: { persId: true },
  });

  if (!item) return { success: false, error: "Предмет не знайдено" };

  const owned = await assertOwnsPers(item.persId);
  if (!owned.ok) return { success: false, error: owned.error };

  try {
    const updated = await prisma.persMagicItem.update({
      where: { persMagicItemId },
      data: updates,
    });

    revalidatePath(`/char/${item.persId}`);
    revalidatePath(`/character/${item.persId}`);
    return { success: true, item: updated };
  } catch (error) {
    console.error("Error updating magic item:", error);
    return { success: false, error: "Помилка при оновленні предмета" };
  }
}

export async function deleteMagicItem(persMagicItemId: number) {
  const item = await prisma.persMagicItem.findUnique({
    where: { persMagicItemId },
    select: { persId: true },
  });

  if (!item) return { success: false, error: "Предмет не знайдено" };

  const owned = await assertOwnsPers(item.persId);
  if (!owned.ok) return { success: false, error: owned.error };

  try {
    await prisma.persMagicItem.delete({
      where: { persMagicItemId },
    });

    revalidatePath(`/char/${item.persId}`);
    revalidatePath(`/character/${item.persId}`);
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

    const existing = await prisma.persMagicItem.findFirst({
        where: {
            persId,
            magicItemId,
        },
        select: { persMagicItemId: true },
    });

    if (existing) {
        // If it exists, we remove ALL instances of this item (to mimic toggle behavior roughly, or just first one?)
        // The user wants "checkbox" style behavior likely.
        // But magic items can be duplicate (potions).
        // For simplicity and "Spells" parity, if it exists, we delete ALL of them?
        // Or just one?
        // Spells logic: "if existing... delete". But spells are unique per pers usually (except wizard clipboard?).
        // Let's delete ALL for correct "toggle off" behavior if user treats it as "does he have it?".
        
        await prisma.persMagicItem.deleteMany({
             where: { persId, magicItemId }
        });

        revalidatePath(`/char/${persId}`);
        return { success: true, added: false };
    }

    // Create new
    await prisma.persMagicItem.create({
        data: {
            persId,
            magicItemId,
            isEquipped: false,
            isAttuned: false,
        },
    });

    revalidatePath(`/char/${persId}`);
    return { success: true, added: true };
}
