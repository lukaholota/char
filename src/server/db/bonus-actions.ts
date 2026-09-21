'use server';

import { auth } from "@/lib/auth";
import { buildNextPassiveBonuses } from "@/rules/passive-bonuses";
import { prisma } from "@/lib/prisma";
import { canEditPers } from "@/lib/actions/pers";
import { revalidatePath } from "next/cache";
import { Ability, Prisma, Skills, SkillProficiencyType } from "@prisma/client";
import { StatBonuses, SkillBonuses, SimpleBonusField } from "@/lib/types/model-types";
import { parseStringArray } from "@/server/db/json";
import { calculateAbilityModifier } from "@/rules/abilities";
import { applyMaxHitPointShift, findRetroactiveConstitutionHitPoints } from "@/rules/health";

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
      level: true,
      currentHp: true,
      maxHp: true,
      str: true,
      dex: true,
      con: true,
      int: true,
      wis: true,
      cha: true,
      additionalSaveProficiencies: true,
      statBonuses: true,
      statModifierBonuses: true,
      passiveBonuses: true,
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

  if (!pers) return { ok: false as const, error: "Немає доступу до персонажа" };
  const canEdit = await canEditPers(persId, user.id);
  if (!canEdit) return { ok: false as const, error: "Немає доступу до персонажа" };

  return { ok: true as const, pers };
}

type BonusUpdateType = 'stat' | 'statModifier' | 'save' | 'skill' | 'passive' | SimpleBonusField;

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
const PASSIVE_SKILLS: readonly Skills[] = [Skills.PERCEPTION, Skills.INVESTIGATION, Skills.INSIGHT];

function isPassiveSkill(key: string): key is Skills {
  return PASSIVE_SKILLS.includes(key as Skills);
}


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
      
    } else if (bonusType === 'passive') {
      if (!key || !isPassiveSkill(key)) {
        return { success: false, error: "Невірне пасивне значення" };
      }

      updatedField = 'passiveBonuses';
      const passiveBonuses = buildNextPassiveBonuses(pers.passiveBonuses, key, roundedValue);
      updatedValue = passiveBonuses;

      await prisma.pers.update({
        where: { persId },
        data: { passiveBonuses: passiveBonuses ?? Prisma.DbNull },
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
  const currentSaves = parseStringArray(pers.additionalSaveProficiencies)
    .filter((value): value is Ability => Object.values(Ability).includes(value as Ability));
  
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
 * Пише лише саму характеристику. Для Статури це неповна дія: максимум хітів вона не рухає,
 * тому лист персонажа зберігає характеристики через `saveAbilityAdjustments` — див. Р22.
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

/**
 * Update base AC override (highest-priority base AC).
 * Use `null` to clear the override.
 */
export async function updateBaseACOverride(
  persId: number,
  value: number | null
): Promise<{ success: true } | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  if (value !== null) {
    if (!Number.isFinite(value) || value < 0) {
      return { success: false, error: "Невірне значення базового КБ" };
    }
  }

  const next = value === null ? null : Math.trunc(value);

  try {
    await prisma.pers.update({
      where: { persId },
      data: { overrideBaseAC: next },
    });

    revalidatePath(`/char/${persId}`);
    revalidatePath(`/character/${persId}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating base AC override:", error);
    return { success: false, error: "Помилка при збереженні базового КБ" };
  }
}

const ABILITY_COLUMN: Record<Ability, "str" | "dex" | "con" | "int" | "wis" | "cha"> = {
  STR: "str",
  DEX: "dex",
  CON: "con",
  INT: "int",
  WIS: "wis",
  CHA: "cha",
};

type OwnedPers = Extract<Awaited<ReturnType<typeof assertOwnsPers>>, { ok: true }>["pers"];

export interface AbilityAdjustments {
  persId: number;
  ability: Ability;
  baseScore: number;
  statBonus: number;
  modifierBonus: number;
  saveBonus: number;
  isSaveProficient: boolean;
}

function readAbilityBonus(json: unknown, ability: Ability): number {
  if (!json || typeof json !== "object") return 0;
  const value = (json as Record<string, unknown>)[ability];
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
}

function writeAbilityBonus(json: unknown, ability: Ability, value: number) {
  const bonuses: StatBonuses =
    json && typeof json === "object" ? { ...(json as StatBonuses) } : {};

  if (value === 0) delete bonuses[ability];
  else bonuses[ability] = value;

  return Object.keys(bonuses).length > 0 ? bonuses : Prisma.JsonNull;
}

function writeSaveProficiencies(stored: unknown, ability: Ability, isProficient: boolean): Ability[] {
  const current = parseStringArray(stored).filter((value): value is Ability =>
    Object.values(Ability).includes(value as Ability),
  );
  const without = current.filter((value) => value !== ability);
  return isProficient ? [...without, ability] : without;
}

/**
 * Статура міняє максимум хітів заднім числом, тому характеристика зберігається одним записом:
 * якби база, бонус до стату й бонус до модифікатора летіли трьома паралельними запитами,
 * кожен рахував би зсув хітів зі свого, ще не оновленого, стану.
 */
function findConstitutionHitPointUpdate(pers: OwnedPers, next: AbilityAdjustments) {
  if (next.ability !== Ability.CON) return null;

  const previousModifier =
    calculateAbilityModifier(pers.con + readAbilityBonus(pers.statBonuses, Ability.CON)) +
    readAbilityBonus(pers.statModifierBonuses, Ability.CON);
  const nextModifier =
    calculateAbilityModifier(next.baseScore + next.statBonus) + next.modifierBonus;

  const shift = findRetroactiveConstitutionHitPoints({
    previousConstitutionModifier: previousModifier,
    nextConstitutionModifier: nextModifier,
    level: pers.level,
  });

  if (shift === 0) return null;
  return applyMaxHitPointShift({ maxHp: pers.maxHp, currentHp: pers.currentHp, shift });
}

/**
 * Зберігає все, що редагується в модалці характеристики: базове значення, три бонуси,
 * володіння рятівним кидком і — для Статури — ретроактивні хіти.
 */
export async function saveAbilityAdjustments(
  input: AbilityAdjustments,
): Promise<
  | { success: true; maxHp: number; currentHp: number }
  | { success: false; error: string }
> {
  const owned = await assertOwnsPers(input.persId);
  if (!owned.ok) return { success: false, error: owned.error };

  const numbers = [input.baseScore, input.statBonus, input.modifierBonus, input.saveBonus];
  if (numbers.some((value) => !Number.isFinite(value))) {
    return { success: false, error: "Невірне значення характеристики" };
  }
  if (input.baseScore < 0) {
    return { success: false, error: "Невірне значення характеристики" };
  }

  const next: AbilityAdjustments = {
    ...input,
    baseScore: Math.trunc(input.baseScore),
    statBonus: Math.trunc(input.statBonus),
    modifierBonus: Math.trunc(input.modifierBonus),
    saveBonus: Math.trunc(input.saveBonus),
  };

  const pers = owned.pers;
  const hitPoints = findConstitutionHitPointUpdate(pers, next);

  try {
    await prisma.pers.update({
      where: { persId: input.persId },
      data: {
        [ABILITY_COLUMN[next.ability]]: next.baseScore,
        statBonuses: writeAbilityBonus(pers.statBonuses, next.ability, next.statBonus),
        statModifierBonuses: writeAbilityBonus(pers.statModifierBonuses, next.ability, next.modifierBonus),
        saveBonuses: writeAbilityBonus(pers.saveBonuses, next.ability, next.saveBonus),
        additionalSaveProficiencies: writeSaveProficiencies(
          pers.additionalSaveProficiencies,
          next.ability,
          next.isSaveProficient,
        ),
        ...(hitPoints ?? {}),
      },
    });

    revalidatePath(`/char/${input.persId}`);
    revalidatePath(`/character/${input.persId}`);

    return {
      success: true,
      maxHp: hitPoints?.maxHp ?? pers.maxHp,
      currentHp: hitPoints?.currentHp ?? pers.currentHp,
    };
  } catch (error) {
    console.error("Error saving ability adjustments:", error);
    return { success: false, error: "Помилка при збереженні характеристики" };
  }
}

/**
 * Ручний оверрайд максимуму хітів. Застосунок не вміє порахувати кожен домашній варіант
 * (кинуті вживу кубики, дари майстра), тож число має бути редаговане напряму.
 */
export async function updateMaxHp(
  persId: number,
  value: number,
): Promise<{ success: true; maxHp: number; currentHp: number } | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  if (!Number.isFinite(value) || value < 1) {
    return { success: false, error: "Максимум хітів має бути щонайменше 1" };
  }

  const maxHp = Math.trunc(value);
  const currentHp = Math.max(0, Math.min(maxHp, owned.pers.currentHp));

  try {
    await prisma.pers.update({
      where: { persId },
      data: { maxHp, currentHp },
    });

    revalidatePath(`/char/${persId}`);
    revalidatePath(`/character/${persId}`);

    return { success: true, maxHp, currentHp };
  } catch (error) {
    console.error("Error updating max hp:", error);
    return { success: false, error: "Помилка при збереженні максимуму хітів" };
  }
}
