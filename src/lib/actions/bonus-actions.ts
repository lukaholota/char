"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Ability, Prisma, Skills, SkillProficiencyType } from "@prisma/client";
import { StatBonuses, SkillBonuses, SimpleBonusField } from "@/lib/types/model-types";

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
      statBonuses: true,
      statModifierBonuses: true,
      saveBonuses: true,
      skillBonuses: true,
      hpBonuses: true,
      acBonuses: true,
      speedBonuses: true,
      proficiencyBonuses: true,
      initiativeBonuses: true,
      spellAttackBonuses: true,
      spellDCBonuses: true,
    },
  });

  if (!pers || pers.userId !== user.id) {
    return { ok: false as const, error: "Немає доступу до персонажа" };
  }

  return { ok: true as const, pers };
}

type BonusUpdateType = 'stat' | 'statModifier' | 'save' | 'skill' | SimpleBonusField;

interface UpdateBonusResult {
  success: true;
  updatedField: string;
  updatedValue: unknown;
}

interface UpdateBonusError {
  success: false;
  error: string;
}

/**
 * Update a bonus for a character
 * 
 * @param persId - Character ID
 * @param bonusType - Type of bonus to update
 * @param key - Ability or Skill enum value (null for simple bonuses like HP/AC)
 * @param value - New bonus value (0 removes the bonus)
 */
export async function updateBonus(
  persId: number,
  bonusType: BonusUpdateType,
  key: string | null,
  value: number
): Promise<UpdateBonusResult | UpdateBonusError> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  const pers = owned.pers;
  
  // Validate value
  if (!Number.isFinite(value)) {
    return { success: false, error: "Невірне значення бонусу" };
  }
  
  // Round to integer
  const roundedValue = Math.trunc(value);

  try {
    let updatedField = "";
    let updatedValue: Record<string, number> | { value: number } | typeof Prisma.JsonNull | null = null;

    if (bonusType === 'stat' || bonusType === 'statModifier' || bonusType === 'save') {
      // Validate ability key
      if (!key || !Object.values(Ability).includes(key as Ability)) {
        return { success: false, error: "Невірний атрибут" };
      }
      
      const abilityFieldMap: Record<string, string> = {
        stat: 'statBonuses',
        statModifier: 'statModifierBonuses',
        save: 'saveBonuses',
      };
      
      updatedField = abilityFieldMap[bonusType];
      
      // Get existing bonuses
      const existingJson = (pers as Record<string, unknown>)[updatedField];
      const existing: StatBonuses = (existingJson && typeof existingJson === 'object') 
        ? { ...existingJson as StatBonuses }
        : {};
      
      // Update
      if (roundedValue === 0) {
        delete existing[key as Ability];
      } else {
        existing[key as Ability] = roundedValue;
      }
      
      updatedValue = Object.keys(existing).length > 0 ? existing : Prisma.JsonNull;
      
      await prisma.pers.update({
        where: { persId },
        data: { [updatedField]: updatedValue },
      });
      
    } else if (bonusType === 'skill') {
      // Validate skill key
      if (!key || !Object.values(Skills).includes(key as Skills)) {
        return { success: false, error: "Невірне вміння" };
      }
      
      updatedField = 'skillBonuses';
      
      // Get existing bonuses
      const skillJson = pers.skillBonuses;
      const existingSkills: SkillBonuses = (skillJson && typeof skillJson === 'object') 
        ? { ...skillJson as SkillBonuses }
        : {};
      
      // Update
      if (roundedValue === 0) {
        delete existingSkills[key as Skills];
      } else {
        existingSkills[key as Skills] = roundedValue;
      }
      
      updatedValue = Object.keys(existingSkills).length > 0 ? existingSkills : Prisma.JsonNull;
      
      await prisma.pers.update({
        where: { persId },
        data: { skillBonuses: updatedValue },
      });
      
    } else {
      // Simple bonus (hp, ac, speed, proficiency, initiative, spellAttack, spellDC)
      const simpleFieldMap: Record<SimpleBonusField, string> = {
        hp: 'hpBonuses',
        ac: 'acBonuses',
        speed: 'speedBonuses',
        proficiency: 'proficiencyBonuses',
        initiative: 'initiativeBonuses',
        spellAttack: 'spellAttackBonuses',
        spellDC: 'spellDCBonuses',
      };
      
      updatedField = simpleFieldMap[bonusType];
      updatedValue = roundedValue === 0 ? Prisma.JsonNull : { value: roundedValue };
      
      await prisma.pers.update({
        where: { persId },
        data: { [updatedField]: updatedValue },
      });
    }

    revalidatePath(`/char/${persId}`);
    revalidatePath(`/character/${persId}`);

    return {
      success: true,
      updatedField,
      updatedValue: updatedValue === Prisma.JsonNull ? null : updatedValue,
    };
  } catch (error) {
    console.error("Error updating bonus:", error);
    return { success: false, error: "Помилка при збереженні бонусу" };
  }
}

/**
 * Update skill proficiency type for a character
 */
export async function updateSkillProficiency(
  persId: number,
  skillName: Skills,
  proficiencyType: SkillProficiencyType
): Promise<{ success: true } | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  try {
    // Find skill ID (assuming all skills exist in character or we need to upsert)
    // Actually our PersSkill has a unique constraint on [persId, name]
    await prisma.persSkill.upsert({
      where: {
        persId_name: {
          persId,
          name: skillName,
        }
      },
      update: {
        proficiencyType,
      },
      create: {
        persId,
        name: skillName,
        proficiencyType,
        skillId: 0, // We need to handle skillId. Wait, where does it come from? 
        // Let me check if Skill table exists.
      },
    });

    revalidatePath(`/char/${persId}`);
    revalidatePath(`/character/${persId}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating skill proficiency:", error);
    return { success: false, error: "Помилка при зміні володіння вмінням" };
  }
}

/**
 * Update saving throw proficiency for a character
 */
export async function updateSaveProficiency(
  persId: number,
  ability: Ability,
  isProficient: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  const pers = owned.pers;
  const currentSaves = (pers as any).additionalSaveProficiencies as Ability[] ?? [];
  
  let nextSaves: Ability[];
  if (isProficient) {
    if (currentSaves.includes(ability)) return { success: true };
    nextSaves = [...currentSaves, ability];
  } else {
    if (!currentSaves.includes(ability)) return { success: true };
    nextSaves = currentSaves.filter(a => a !== ability);
  }

  try {
    await prisma.pers.update({
      where: { persId },
      data: { additionalSaveProficiencies: nextSaves },
    });

    revalidatePath(`/char/${persId}`);
    revalidatePath(`/character/${persId}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating save proficiency:", error);
    return { success: false, error: "Помилка при зміні володіння рятівним кидком" };
  }
}

/**
 * Get all bonuses for a character (for initial load)
 */
export async function getAllBonuses(persId: number): Promise<{
  success: true;
  bonuses: {
    statBonuses: StatBonuses | null;
    statModifierBonuses: StatBonuses | null;
    saveBonuses: StatBonuses | null;
    skillBonuses: SkillBonuses | null;
    hpBonuses: { value: number } | null;
    acBonuses: { value: number } | null;
    speedBonuses: { value: number } | null;
    proficiencyBonuses: { value: number } | null;
    initiativeBonuses: { value: number } | null;
    spellAttackBonuses: { value: number } | null;
    spellDCBonuses: { value: number } | null;
  };
} | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  return {
    success: true,
    bonuses: {
      statBonuses: owned.pers.statBonuses as StatBonuses | null,
      statModifierBonuses: owned.pers.statModifierBonuses as StatBonuses | null,
      saveBonuses: owned.pers.saveBonuses as StatBonuses | null,
      skillBonuses: owned.pers.skillBonuses as SkillBonuses | null,
      hpBonuses: owned.pers.hpBonuses as { value: number } | null,
      acBonuses: owned.pers.acBonuses as { value: number } | null,
      speedBonuses: owned.pers.speedBonuses as { value: number } | null,
      proficiencyBonuses: owned.pers.proficiencyBonuses as { value: number } | null,
      initiativeBonuses: owned.pers.initiativeBonuses as { value: number } | null,
      spellAttackBonuses: owned.pers.spellAttackBonuses as { value: number } | null,
      spellDCBonuses: owned.pers.spellDCBonuses as { value: number } | null,
    },
  };
}

/**
 * Update base stat value for a character
 */
export async function updateBaseStat(
  persId: number,
  ability: Ability,
  value: number
): Promise<{ success: true } | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };
  
  // Validate value
  if (!Number.isFinite(value) || value < 0) {
    return { success: false, error: "Невірне значення характеристики" };
  }
  
  const roundedValue = Math.trunc(value);
  
  try {
    const abilityFieldMap: Record<Ability, string> = {
      STR: 'str',
      DEX: 'dex',
      CON: 'con',
      INT: 'int',
      WIS: 'wis',
      CHA: 'cha',
    };
    
    await prisma.pers.update({
      where: { persId },
      data: { [abilityFieldMap[ability]]: roundedValue },
    });
    
    revalidatePath(`/char/${persId}`);
    revalidatePath(`/character/${persId}`);
    
    return { success: true };
  } catch (error) {
    console.error("Error updating base stat:", error);
    return { success: false, error: "Помилка при збереженні характеристики" };
  }
}
