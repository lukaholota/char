'use server';

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditPers } from "@/lib/actions/pers";
import { revalidatePath } from "next/cache";
import { isCrimsonRiteFeature } from "@/rules/crimson-rite";
import { Ability, AbilityBonusType, ArmorCategory, DamageType, Prisma, Ruleset } from "@prisma/client";

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
      ruleset: true,
      wearsShield: true,
      additionalShieldBonus: true,
    },
  });

  if (!pers) return { ok: false as const, error: "Немає доступу до персонажа" };
  const canEdit = await canEditPers(persId, user.id);
  if (!canEdit) return { ok: false as const, error: "Немає доступу до персонажа" };

  return { ok: true as const, pers };
}

const FOREIGN_RULESET_ERROR = "Цей предмет належить іншій редакції правил";

async function isWeaponOfRuleset(weaponId: number, ruleset: Ruleset) {
  const weapon = await prisma.weapon.findUnique({ where: { weaponId }, select: { ruleset: true } });
  return weapon?.ruleset === ruleset;
}

async function isArmorOfRuleset(armorId: number, ruleset: Ruleset) {
  const armor = await prisma.armor.findUnique({ where: { armorId }, select: { ruleset: true } });
  return armor?.ruleset === ruleset;
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
  if (weaponId && !(await isWeaponOfRuleset(weaponId, owned.pers.ruleset))) {
    return { success: false, error: FOREIGN_RULESET_ERROR };
  }

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

    revalidatePath(`/char/${persId}`);
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
    overrideDamageType?: DamageType | null;
    overrideNormalRange?: number | null;
    overrideLongRange?: number | null;
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
    const data: Prisma.PersWeaponUpdateInput = {
      overrideName: updates.overrideName,
      attackBonus: updates.attackBonus,
      customDamageBonus:
        updates.customDamageBonus === null
          ? Prisma.DbNull
          : updates.customDamageBonus,
      customDamageDice: updates.customDamageDice,
      customDamageAbility: updates.customDamageAbility,
      overrideDamageType: updates.overrideDamageType,
      overrideNormalRange: updates.overrideNormalRange,
      overrideLongRange: updates.overrideLongRange,
      isMagical: updates.isMagical,
      isProficient: updates.isProficient,
    };

    const updated = await prisma.persWeapon.update({
      where: { persWeaponId },
      data,
    });

    revalidatePath(`/char/${weapon.persId}`);
    revalidatePath(`/character/${weapon.persId}`);
    return { success: true, weapon: updated };
  } catch (error) {
    console.error("Error updating weapon:", error);
    return { success: false, error: "Помилка при оновленні зброї" };
  }
}

/**
 * O45: Багряний обряд мисливця за кровʼю на одній зброї — «a weapon can hold only one active rite at a time».
 * Хижі удари лікантропа — рядок «Кулак», тож обряд на них ставиться так само, одним рядком.
 * `null` знімає обряд (відпочинок або гравець вимкнув).
 */
export async function setWeaponCrimsonRite(persWeaponId: number, riteFeatureId: number | null) {
  const weapon = await prisma.persWeapon.findUnique({ where: { persWeaponId }, select: { persId: true } });
  if (!weapon) return { success: false, error: "Зброю не знайдено" };

  const owned = await assertOwnsPers(weapon.persId);
  if (!owned.ok) return { success: false, error: owned.error };

  if (riteFeatureId !== null && !(await isKnownCrimsonRite(weapon.persId, riteFeatureId))) {
    return { success: false, error: "Цього обряду персонаж не знає" };
  }

  const updated = await prisma.persWeapon.update({ where: { persWeaponId }, data: { crimsonRiteFeatureId: riteFeatureId } });
  revalidatePath(`/char/${weapon.persId}`);
  return { success: true, weapon: updated };
}

async function isKnownCrimsonRite(persId: number, featureId: number): Promise<boolean> {
  const feature = await prisma.feature.findUnique({ where: { featureId }, select: { engName: true } });
  if (!isCrimsonRiteFeature(feature?.engName)) return false;

  const [asFeature, asChoice] = await Promise.all([
    prisma.persFeature.count({ where: { persId, featureId } }),
    prisma.pers.count({ where: { persId, choiceOptions: { some: { features: { some: { featureId } } } } } }),
  ]);
  return asFeature + asChoice > 0;
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

    revalidatePath(`/char/${weapon.persId}`);
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
    overrideName?: string;
    overrideBaseAC?: number;
    abilityBonuses?: Ability[];
    abilityBonusType?: AbilityBonusType;
    miscACBonus?: number;
    isProficient?: boolean;
    equipped?: boolean;
  }
) {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };
  if (armorId && !(await isArmorOfRuleset(armorId, owned.pers.ruleset))) {
    return { success: false, error: FOREIGN_RULESET_ERROR };
  }

  try {
    /// `HOMEBREW` шукається саме в 2014, і після KR16.5 це вже не через порожню базу:
    /// 13 категорій 2024 у таблиці є, але `HOMEBREW` серед них немає — у книзі його теж
    /// немає, тож власний обладунок персонажа 2024 теж спирається на рядок 2014.
    const resolvedArmorId = armorId
      ? armorId
      : (
          await prisma.armor.findUnique({
            where: {
              name_ruleset: { name: ArmorCategory.HOMEBREW, ruleset: Ruleset.RULES_2014 },
            },
            select: { armorId: true },
          })
        )?.armorId ?? 1;

    const armorDefaults = await prisma.armor.findUnique({
      where: { armorId: resolvedArmorId },
      select: { abilityBonuses: true, abilityBonusType: true },
    });

    const defaultAbilityBonuses =
      customData.abilityBonuses !== undefined ? customData.abilityBonuses : (armorDefaults?.abilityBonuses ?? []);

    const defaultAbilityBonusType =
      customData.abilityBonusType !== undefined
        ? customData.abilityBonusType
        : (armorDefaults?.abilityBonusType ?? AbilityBonusType.FULL);

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
        armorId: resolvedArmorId,
        overrideName: customData.overrideName || null,
        overrideBaseAC: customData.overrideBaseAC ?? null,
        abilityBonuses: Array.from(new Set(defaultAbilityBonuses ?? [])),
        abilityBonusType: defaultAbilityBonusType,
        miscACBonus: customData.miscACBonus ?? 0,
        isProficient: customData.isProficient ?? true,
        equipped: customData.equipped ?? false,
      },
    });

    revalidatePath(`/char/${persId}`);
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
    overrideName?: string | null;
    overrideBaseAC?: number | null;
    abilityBonuses?: Ability[];
    abilityBonusType?: AbilityBonusType;
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
      data: {
        ...updates,
        abilityBonuses: updates.abilityBonuses ? Array.from(new Set(updates.abilityBonuses)) : undefined,
      },
    });

    revalidatePath(`/char/${armor.persId}`);
    revalidatePath(`/character/${armor.persId}`);
    return { success: true, armor: updated };
  } catch (error) {
    console.error("Error updating armor:", error);
    return { success: false, error: "Помилка при оновленні обладунку" };
  }
}

export async function updateRaceStaticAcBonus(persId: number, value: number) {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  const next = Number.isFinite(value) ? Math.trunc(value) : 0;

  try {
    const updated = await prisma.pers.update({
      where: { persId },
      data: { raceStaticAcBonus: next },
    });

    revalidatePath(`/char/${persId}`);
    revalidatePath(`/character/${persId}`);
    return { success: true, pers: updated };
  } catch (error) {
    console.error("Error updating raceStaticAcBonus:", error);
    return { success: false, error: "Помилка при оновленні бонусу раси до КБ" };
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

    revalidatePath(`/char/${armor.persId}`);
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

    revalidatePath(`/char/${persId}`);
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

export async function getBaseEquipment(ruleset: Ruleset) {
  try {
    const [weapons, armors] = await Promise.all([
      prisma.weapon.findMany({
        where: { ruleset },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.armor.findMany({
        where: { ruleset },
        orderBy: { baseAC: 'asc' }
      })
    ]);

    return { success: true, weapons, armors };
  } catch (error) {
    console.error("Error fetching base equipment:", error);
    return { success: false, error: "Помилка при завантаженні списку спорядження" };
  }
}
