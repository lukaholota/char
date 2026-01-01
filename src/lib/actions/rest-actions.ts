"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { RestType } from "@prisma/client";
import { calculateCasterLevel } from "@/lib/logic/spell-logic";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { getCharacterFeaturesGrouped, CharacterFeaturesGroupedResult } from "@/lib/actions/pers";

/**
 * Helper to assert the user owns the pers and return pers data
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
      currentHp: true,
      maxHp: true,
      tempHp: true,
      level: true,
      con: true,
      currentHitDice: true,
      usedHitDice: true,
      currentSpellSlots: true,
      currentPactSlots: true,
      class: {
        select: {
          classId: true,
          hitDie: true,
        },
      },
      multiclasses: {
        select: {
          classId: true,
          classLevel: true,
          class: {
            select: {
              hitDie: true,
            },
          },
        },
      },
    },
  });

  if (!pers || pers.userId !== user.id) {
    return { ok: false as const, error: "Немає доступу до персонажа" };
  }

  return { ok: true as const, pers };
}

/**
 * Get max hit dice per class for a character
 * Returns an object with classId as key and { max, hitDie } as value
 */
function getMaxHitDiceByClass(
  pers: NonNullable<Awaited<ReturnType<typeof assertOwnsPers>> & { ok: true }>["pers"]
): Record<number, { max: number; hitDie: number }> {
  const result: Record<number, { max: number; hitDie: number }> = {};
  
  // Calculate main class level (total level - sum of multiclass levels)
  const multiclassLevelSum = pers.multiclasses.reduce((acc, mc) => acc + mc.classLevel, 0);
  const mainClassLevel = pers.level - multiclassLevelSum;
  
  // Main class
  result[pers.class.classId] = {
    max: mainClassLevel,
    hitDie: pers.class.hitDie,
  };
  
  // Multiclasses
  for (const mc of pers.multiclasses) {
    result[mc.classId] = {
      max: mc.classLevel,
      hitDie: mc.class.hitDie,
    };
  }
  
  return result;
}

/**
 * Get current hit dice by class (from JSON or calculate defaults)
 */
function getCurrentHitDiceByClass(
  pers: NonNullable<Awaited<ReturnType<typeof assertOwnsPers>> & { ok: true }>["pers"],
  maxByClass: Record<number, { max: number; hitDie: number }>
): Record<number, number> {
  const stored = pers.currentHitDice as Record<string, number> | null;
  const result: Record<number, number> = {};
  
  for (const classIdStr of Object.keys(maxByClass)) {
    const classId = Number(classIdStr);
    if (stored && typeof stored[classIdStr] === "number") {
      result[classId] = Math.max(0, Math.min(stored[classIdStr], maxByClass[classId].max));
    } else {
      // Default to max if not set
      result[classId] = maxByClass[classId].max;
    }
  }
  
  return result;
}

export interface HitDiceToUse {
  classId: number;
  count: number;
}

export interface ShortRestResult {
  success: true;
  hpRestored: number;
  newCurrentHp: number;
  currentHitDice: Record<number, number>;
  currentPactSlots: number;
  featuresRestored: number;
  groupedFeatures: CharacterFeaturesGroupedResult;
}

export interface ShortRestError {
  success: false;
  error: string;
}

/**
 * Perform a short rest
 * - Use hit dice to restore HP
 * - Restore features with limitedUsesPer = SHORT_REST
 */
export async function shortRest(
  persId: number,
  hitDiceToUse: HitDiceToUse[]
): Promise<ShortRestResult | ShortRestError> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };
  
  const pers = owned.pers;
  const maxByClass = getMaxHitDiceByClass(pers);
  const currentByClass = getCurrentHitDiceByClass(pers, maxByClass);
  
  // Validate dice usage
  const updatedDice = { ...currentByClass };
  
  for (const dice of hitDiceToUse) {
    if (!maxByClass[dice.classId]) {
      return { success: false, error: `Невірний клас ID: ${dice.classId}` };
    }
    
    const available = currentByClass[dice.classId] ?? 0;
    if (dice.count > available) {
      return { success: false, error: `Недостатньо хіт-дайсів для класу ${dice.classId}` };
    }
    
    updatedDice[dice.classId] = available - dice.count;
  }
  
  // HP is no longer restored automatically during short rest
  const newCurrentHp = pers.currentHp;

  const persForSlots = await prisma.pers.findUnique({
    where: { persId },
    include: {
      class: { select: { name: true, spellcastingType: true } },
      subclass: { select: { spellcastingType: true } },
      multiclasses: {
        include: {
          class: { select: { name: true, spellcastingType: true } },
          subclass: { select: { spellcastingType: true } },
        },
      },
    },
  });

  const caster = persForSlots ? calculateCasterLevel(persForSlots as any) : { pactLevel: 0, casterLevel: 0 };
  const pactRow = (SPELL_SLOT_PROGRESSION as any).PACT?.[caster.pactLevel] as { slots: number; level: number } | undefined;
  const maxPactSlots = pactRow?.slots ? Math.max(0, Math.trunc(pactRow.slots)) : 0;
  const newCurrentPactSlots = maxPactSlots > 0 ? maxPactSlots : (Number.isFinite(pers.currentPactSlots) ? Math.max(0, Math.trunc(pers.currentPactSlots)) : 0);
  
  // Restore SHORT_REST features
  const featuresWithShortRest = await prisma.persFeature.findMany({
    where: {
      persId,
      feature: {
        limitedUsesPer: RestType.SHORT_REST,
      },
    },
    include: {
      feature: {
        select: {
          usesCount: true,
          usesCountDependsOnProficiencyBonus: true,
        },
      },
    },
  });
  
  const proficiencyBonus = 2 + Math.floor((pers.level - 1) / 4);
  let featuresRestored = 0;
  
  for (const pf of featuresWithShortRest) {
    const maxUses = pf.feature.usesCountDependsOnProficiencyBonus
      ? proficiencyBonus
      : pf.feature.usesCount ?? 0;
    
    if (maxUses > 0) {
      await prisma.persFeature.update({
        where: {
          persId_featureId: {
            persId,
            featureId: pf.featureId,
          },
        },
        data: { usesRemaining: maxUses },
      });
      featuresRestored++;
    }
  }
  
  // Update database
  await prisma.pers.update({
    where: { persId },
    data: {
      currentHp: newCurrentHp,
      currentHitDice: updatedDice as object,
      currentPactSlots: newCurrentPactSlots,
    },
  });
  
  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);
  
  const groupedFeatures = await getCharacterFeaturesGrouped(persId);

  return {
    success: true,
    hpRestored: 0,
    newCurrentHp,
    currentHitDice: updatedDice,
    currentPactSlots: newCurrentPactSlots,
    featuresRestored,
    groupedFeatures: groupedFeatures!,
  };
}

export interface LongRestResult {
  success: true;
  newCurrentHp: number;
  currentHitDice: Record<number, number>;
  currentSpellSlots: number[];
  currentPactSlots: number;
  spellSlotsRestored: boolean;
  featuresRestored: number;
  groupedFeatures: CharacterFeaturesGroupedResult;
}

export interface LongRestError {
  success: false;
  error: string;
}

/**
 * Perform a long rest
 * - Restore HP to max
 * - Restore all hit dice
 * - Restore all spell slots
 * - Restore all features (SHORT_REST and LONG_REST types)
 */
export async function longRest(persId: number): Promise<LongRestResult | LongRestError> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };
  
  const pers = owned.pers;
  const maxByClass = getMaxHitDiceByClass(pers);
  
  // Restore all hit dice to max
  const restoredHitDice: Record<number, number> = {};
  for (const classIdStr of Object.keys(maxByClass)) {
    const classId = Number(classIdStr);
    restoredHitDice[classId] = maxByClass[classId].max;
  }
  
  // Restore ALL features (both SHORT_REST and LONG_REST)
  const featuresWithRest = await prisma.persFeature.findMany({
    where: {
      persId,
      feature: {
        limitedUsesPer: {
          in: [RestType.SHORT_REST, RestType.LONG_REST],
        },
      },
    },
    include: {
      feature: {
        select: {
          usesCount: true,
          usesCountDependsOnProficiencyBonus: true,
        },
      },
    },
  });
  
  const proficiencyBonus = 2 + Math.floor((pers.level - 1) / 4);
  let featuresRestored = 0;
  
  for (const pf of featuresWithRest) {
    const maxUses = pf.feature.usesCountDependsOnProficiencyBonus
      ? proficiencyBonus
      : pf.feature.usesCount ?? 0;
    
    if (maxUses > 0) {
      await prisma.persFeature.update({
        where: {
          persId_featureId: {
            persId,
            featureId: pf.featureId,
          },
        },
        data: { usesRemaining: maxUses },
      });
      featuresRestored++;
    }
  }
  
  // Get max spell slots and pact slots using robust logic
  const persForSlots = await prisma.pers.findUnique({
    where: { persId },
    include: {
      class: { select: { name: true, spellcastingType: true } },
      subclass: { select: { spellcastingType: true } },
      multiclasses: {
        include: {
          class: { select: { name: true, spellcastingType: true } },
          subclass: { select: { spellcastingType: true } },
        },
      },
    },
  });

  const caster = persForSlots ? calculateCasterLevel(persForSlots as any) : { pactLevel: 0, casterLevel: 0 };
  const maxSpellSlots = ((SPELL_SLOT_PROGRESSION as any).FULL?.[caster.casterLevel] as number[] | undefined) ?? Array(9).fill(0);
  const pactRow = (SPELL_SLOT_PROGRESSION as any).PACT?.[caster.pactLevel] as { slots: number; level: number } | undefined;
  const maxPactSlots = pactRow?.slots ? Math.max(0, Math.trunc(pactRow.slots)) : 0;
  
  // Update database
  await prisma.pers.update({
    where: { persId },
    data: {
      currentHp: pers.maxHp,
      tempHp: 0, // Reset temp HP on long rest
      currentHitDice: restoredHitDice as object,
      currentSpellSlots: maxSpellSlots,
      currentPactSlots: maxPactSlots, // Warlocks
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
      isDead: false,
    },
  });
  
  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);
  
  const groupedFeatures = await getCharacterFeaturesGrouped(persId);

  return {
    success: true,
    newCurrentHp: pers.maxHp,
    currentHitDice: restoredHitDice,
    currentSpellSlots: maxSpellSlots,
    currentPactSlots: maxPactSlots,
    spellSlotsRestored: true,
    featuresRestored,
    groupedFeatures: groupedFeatures!,
  };
}

/**
 * Get hit dice info for a character (for display purposes)
 */
export async function getHitDiceInfo(persId: number): Promise<{
  success: true;
  hitDice: Array<{
    classId: number;
    className: string;
    hitDie: number;
    current: number;
    max: number;
  }>;
} | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };
  
  const pers = owned.pers;
  const maxByClass = getMaxHitDiceByClass(pers);
  const currentByClass = getCurrentHitDiceByClass(pers, maxByClass);
  
  // Get class names
  const classIds = Object.keys(maxByClass).map(Number);
  const classes = await prisma.class.findMany({
    where: { classId: { in: classIds } },
    select: { classId: true, name: true },
  });
  
  const classNameMap = new Map(classes.map(c => [c.classId, c.name]));
  
  const hitDice = classIds.map(classId => ({
    classId,
    className: classNameMap.get(classId) ?? "Невідомий",
    hitDie: maxByClass[classId].hitDie,
    current: currentByClass[classId],
    max: maxByClass[classId].max,
  }));
  
  return { success: true, hitDice };
}
