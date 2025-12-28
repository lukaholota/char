"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Ability } from "@prisma/client";

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
      wearsShield: true,
      additionalShieldBonus: true,
    },
  });

  if (!pers || pers.userId !== user.id) {
    return { ok: false as const, error: "Немає доступу до персонажа" };
  }

  return { ok: true as const, pers };
}

// ============================================================================
// WEAPON ACTIONS
// ============================================================================

export async function addWeapon(
  persId: number,
  weaponId: number | null,
  customData: {
    overrideName?: string;
    attackBonus?: number;
    customDamageBonus?: number;
    customDamageDice?: string;
    customDamageAbility?: Ability;
    isMagical?: boolean;
    isProficient?: boolean;
  }
) {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  try {
    const newWeapon = await prisma.persWeapon.create({
      data: {
        persId,
        weaponId: weaponId || 1, // Fallback to a default weapon if null? Wait, weaponId is required in schema?
        // Let me check PersWeapon.prisma again.
        // Yes, weaponId is required. I should probably have a "Custom" weapon in DB or allow it to be 0/null if possible.
        // Actually, seed likely has a generic weapon.
        overrideName: customData.overrideName || null,
        attackBonus: customData.attackBonus || 0,
        customDamageBonus: customData.customDamageBonus || 0,
        customDamageDice: customData.customDamageDice || null,
        customDamageAbility: customData.customDamageAbility || null,
        isMagical: customData.isMagical || false,
        isProficient: customData.isProficient ?? true,
      },
    });

    revalidatePath(`/pers/${persId}`);
    revalidatePath(`/character/${persId}`);
    return { success: true, weapon: newWeapon };
  } catch (error) {
    console.error("Error adding weapon:", error);
    return { success: false, error: "Помилка при додаванні зброї" };
  }
}

export async function updateWeapon(
  persWeaponId: number,
  updates: {
    overrideName?: string | null;
    attackBonus?: number | null;
    customDamageBonus?: number | null;
    customDamageDice?: string | null;
    customDamageAbility?: Ability | null;
    isMagical?: boolean;
    isProficient?: boolean;
  }
) {
  const weapon = await prisma.persWeapon.findUnique({
    where: { persWeaponId },
    select: { persId: true },
  });

  if (!weapon) return { success: false, error: "Зброю не знайдено" };

  const owned = await assertOwnsPers(weapon.persId);
  if (!owned.ok) return { success: false, error: owned.error };

  try {
    const updated = await prisma.persWeapon.update({
      where: { persWeaponId },
      data: updates,
    });

    revalidatePath(`/pers/${weapon.persId}`);
    revalidatePath(`/character/${weapon.persId}`);
    return { success: true, weapon: updated };
  } catch (error) {
    console.error("Error updating weapon:", error);
    return { success: false, error: "Помилка при оновленні зброї" };
  }
}

export async function deleteWeapon(persWeaponId: number) {
  const weapon = await prisma.persWeapon.findUnique({
    where: { persWeaponId },
    select: { persId: true },
  });

  if (!weapon) return { success: false, error: "Зброю не знайдено" };

  const owned = await assertOwnsPers(weapon.persId);
  if (!owned.ok) return { success: false, error: owned.error };

  try {
    await prisma.persWeapon.delete({
      where: { persWeaponId },
    });

    revalidatePath(`/pers/${weapon.persId}`);
    revalidatePath(`/character/${weapon.persId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting weapon:", error);
    return { success: false, error: "Помилка при видаленні зброї" };
  }
}

// ============================================================================
// ARMOR ACTIONS
// ============================================================================

export async function addArmor(
  persId: number,
  armorId: number | null,
  customData: {
    overrideBaseAC?: number;
    miscACBonus?: number;
    isProficient?: boolean;
    equipped?: boolean;
  }
) {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  try {
    // If equipping new armor, unequip others
    if (customData.equipped) {
      await prisma.persArmor.updateMany({
        where: { persId, equipped: true },
        data: { equipped: false },
      });
    }

    const newArmor = await prisma.persArmor.create({
      data: {
        persId,
        armorId: armorId || 1, // Fallback
        overrideBaseAC: customData.overrideBaseAC || null,
        miscACBonus: customData.miscACBonus || 0,
        isProficient: customData.isProficient ?? true,
        equipped: customData.equipped || false,
      },
    });

    revalidatePath(`/pers/${persId}`);
    revalidatePath(`/character/${persId}`);
    return { success: true, armor: newArmor };
  } catch (error) {
    console.error("Error adding armor:", error);
    return { success: false, error: "Помилка при додаванні обладунку" };
  }
}

export async function updateArmor(
  persArmorId: number,
  updates: {
    overrideBaseAC?: number | null;
    miscACBonus?: number | null;
    isProficient?: boolean;
    equipped?: boolean;
  }
) {
  const armor = await prisma.persArmor.findUnique({
    where: { persArmorId },
    select: { persId: true },
  });

  if (!armor) return { success: false, error: "Обладунок не знайдено" };

  const owned = await assertOwnsPers(armor.persId);
  if (!owned.ok) return { success: false, error: owned.error };

  try {
    // If equipping, unequip others
    if (updates.equipped) {
      await prisma.persArmor.updateMany({
        where: { persId: armor.persId, equipped: true },
        data: { equipped: false },
      });
    }

    const updated = await prisma.persArmor.update({
      where: { persArmorId },
      data: updates,
    });

    revalidatePath(`/pers/${armor.persId}`);
    revalidatePath(`/character/${armor.persId}`);
    return { success: true, armor: updated };
  } catch (error) {
    console.error("Error updating armor:", error);
    return { success: false, error: "Помилка при оновленні обладунку" };
  }
}

export async function deleteArmor(persArmorId: number) {
  const armor = await prisma.persArmor.findUnique({
    where: { persArmorId },
    select: { persId: true },
  });

  if (!armor) return { success: false, error: "Обладунок не знайдено" };

  const owned = await assertOwnsPers(armor.persId);
  if (!owned.ok) return { success: false, error: owned.error };

  try {
    await prisma.persArmor.delete({
      where: { persArmorId },
    });

    revalidatePath(`/pers/${armor.persId}`);
    revalidatePath(`/character/${armor.persId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting armor:", error);
    return { success: false, error: "Помилка при видаленні обладунку" };
  }
}

// ============================================================================
// SHIELD ACTIONS
// ============================================================================

export async function updateShieldStatus(
  persId: number,
  updates: {
    wearsShield?: boolean;
    additionalShieldBonus?: number;
  }
) {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  try {
    await prisma.pers.update({
      where: { persId },
      data: updates,
    });

    revalidatePath(`/pers/${persId}`);
    revalidatePath(`/character/${persId}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating shield:", error);
    return { success: false, error: "Помилка при оновленні щита" };
  }
}

// ============================================================================
// DATA FETCHING
// ============================================================================

export async function getBaseEquipment() {
  try {
    const [weapons, armors] = await Promise.all([
      prisma.weapon.findMany({
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.armor.findMany({
        orderBy: { baseAC: 'asc' }
      })
    ]);

    return { success: true, weapons, armors };
  } catch (error) {
    console.error("Error fetching base equipment:", error);
    return { success: false, error: "Помилка при завантаженні списку спорядження" };
  }
}
