'use server';

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditPers } from "@/lib/actions/pers";
import { revalidatePath } from "next/cache";
import { RestType } from "@prisma/client";
import { getAbilityMod } from "@/lib/logic/utils";
import {
  calculateCasterLevel,
  toRulesSpellcastingCharacter,
  type SpellcastingPersLike,
} from "@/lib/logic/spell-logic";
import { getMaximumStandardSpellSlots } from "@/rules/spellcasting";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { calculateMaxUsesForFeature } from "@/lib/logic/feature-resources";
import { findPoolProviderForPers } from "@/server/db/resource-pool-provider";
import { findUsesAfterShortRest } from "@/rules/resource-pools";
import {
  findHeroicInspirationAfterLongRest,
  listFeaturesGrantingHeroicInspirationOnLongRest,
} from "@/rules/heroic-inspiration";
import {
  buildHitDicePools,
  findMainClassLevel,
  findPoolsAfterLongRest,
  findPoolsAfterSetting,
  findPoolsAfterSpending,
  serializeHitDicePools,
  type HitDicePool,
  type HitDiceSpend,
  type StoredHitDice,
} from "@/rules/hit-dice";

const pactSpellSlotProgression = (SPELL_SLOT_PROGRESSION as { PACT?: Record<number, { slots: number; level: number }> }).PACT;

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
      ruleset: true,
      currentHp: true,
      maxHp: true,
      tempHp: true,
      level: true,
      con: true,
      currentHitDice: true,
      usedHitDice: true,
      currentSpellSlots: true,
      currentPactSlots: true,
      hasHeroicInspiration: true,
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

  if (!pers) return { ok: false as const, error: "Немає доступу до персонажа" };
  const canEdit = await canEditPers(persId, user.id);
  if (!canEdit) return { ok: false as const, error: "Немає доступу до персонажа" };

  return { ok: true as const, pers };
}

type OwnedPers = Extract<Awaited<ReturnType<typeof assertOwnsPers>>, { ok: true }>["pers"];

function collectHitDicePools(pers: OwnedPers): HitDicePool[] {
  const mainClassLevel = findMainClassLevel(pers.level, pers.multiclasses);
  const classes = [
    { classId: pers.class.classId, hitDie: pers.class.hitDie, classLevel: mainClassLevel },
    ...pers.multiclasses.map((multiclass) => ({
      classId: multiclass.classId,
      hitDie: multiclass.class.hitDie,
      classLevel: multiclass.classLevel,
    })),
  ];

  return buildHitDicePools(classes, pers.currentHitDice as StoredHitDice);
}

function rollHitDiceForHitPoints(pools: HitDicePool[], spends: HitDiceSpend[], constitutionModifier: number): number {
  let restored = 0;

  for (const spend of spends) {
    const pool = pools.find((candidate) => candidate.classId === spend.classId);
    if (!pool) continue;

    for (let die = 0; die < spend.count; die += 1) {
      const roll = Math.floor(Math.random() * pool.hitDie) + 1;
      restored += Math.max(1, roll + constitutionModifier);
    }
  }

  return restored;
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
  hitDiceToUse: HitDiceToUse[],
  rolledHitPoints?: number
): Promise<ShortRestResult | ShortRestError> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };
  
  const pers = owned.pers;
  const hitDicePools = collectHitDicePools(pers);
  const spent = findPoolsAfterSpending(hitDicePools, hitDiceToUse);
  if (!spent.ok) return { success: false, error: spent.error };

  const updatedDice = serializeHitDicePools(spent.pools);

  // Гравець, що кидає кубики вживу, вводить свій результат — включно з нулем,
  // коли кубик витрачено на щось інше й хіти не відновлювались.
  const totalHpRestored =
    rolledHitPoints === undefined
      ? rollHitDiceForHitPoints(hitDicePools, hitDiceToUse, getAbilityMod(pers.con))
      : Math.max(0, Math.trunc(Number.isFinite(rolledHitPoints) ? rolledHitPoints : 0));
  
  // Calculate new HP (capped at maxHp)
  const newCurrentHp = Math.min(pers.maxHp, pers.currentHp + totalHpRestored);

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

  const caster = persForSlots ? calculateCasterLevel(persForSlots as SpellcastingPersLike) : { pactLevel: 0, casterLevel: 0 };
  const pactRow = pactSpellSlotProgression?.[caster.pactLevel];
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
          engName: true,
          usesCount: true,
          usesCountDependsOnProficiencyBonus: true,
          usesCountSpecial: true,
          classFeatures: { select: { classId: true } },
          subclassFeatures: { select: { subclass: { select: { classId: true } } } },
        },
      },
    },
  });
  
  let featuresRestored = 0;
  
  for (const pf of featuresWithShortRest) {
    const maxUses = calculateMaxUsesForFeature(pers, pf.feature) ?? 0;

    if (maxUses > 0) {
      await prisma.persFeature.update({
        where: {
          persId_featureId: {
            persId,
            featureId: pf.featureId,
          },
        },
        data: {
          usesRemaining: findUsesAfterShortRest({
            engName: pf.feature.engName,
            usesRemaining: pf.usesRemaining,
            maxUses,
          }),
        },
      });
      featuresRestored++;
    }
  }

  // Restore pooled resources with SHORT_REST
  const pools = await prisma.persResourcePool.findMany({
    where: { persId },
  });

  for (const pool of pools) {
    const provider = await findPoolProviderForPers({
      persId,
      poolKey: pool.poolKey,
      restTypes: [RestType.SHORT_REST],
    });

    if (!provider) continue;

    const maxUses = calculateMaxUsesForFeature(pers, provider) ?? 0;

    if (maxUses > 0) {
      await prisma.persResourcePool.update({
        where: { persId_poolKey: { persId, poolKey: pool.poolKey } },
        data: {
          usesRemaining: findUsesAfterShortRest({
            engName: provider.engName,
            usesRemaining: pool.usesRemaining,
            maxUses,
          }),
        },
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
  
  return {
    success: true,
    hpRestored: totalHpRestored,
    newCurrentHp,
    currentHitDice: updatedDice,
    currentPactSlots: newCurrentPactSlots,
    featuresRestored,
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
  const restoredHitDice = serializeHitDicePools(
    findPoolsAfterLongRest(collectHitDicePools(pers), pers.ruleset),
  );
  
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
          usesCountSpecial: true,
          classFeatures: { select: { classId: true } },
          subclassFeatures: { select: { subclass: { select: { classId: true } } } },
        },
      },
    },
  });
  
  let featuresRestored = 0;
  
  for (const pf of featuresWithRest) {
    const maxUses = calculateMaxUsesForFeature(pers, pf.feature) ?? 0;
    
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

  // Restore pooled resources with SHORT_REST or LONG_REST
  const pools = await prisma.persResourcePool.findMany({
    where: { persId },
  });

  for (const pool of pools) {
    const provider = await findPoolProviderForPers({
      persId,
      poolKey: pool.poolKey,
      restTypes: [RestType.SHORT_REST, RestType.LONG_REST],
    });

    if (!provider) continue;

    const maxUses = calculateMaxUsesForFeature(pers, provider) ?? 0;

    if (maxUses > 0) {
      await prisma.persResourcePool.update({
        where: { persId_poolKey: { persId, poolKey: pool.poolKey } },
        data: { usesRemaining: maxUses },
      });
      featuresRestored++;
    }
  }
  
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

  const caster = persForSlots ? calculateCasterLevel(persForSlots as SpellcastingPersLike) : { pactLevel: 0, casterLevel: 0 };
  const pactRow = pactSpellSlotProgression?.[caster.pactLevel];
  const maxPactSlots = pactRow?.slots ? Math.max(0, Math.trunc(pactRow.slots)) : 0;

  /// Слоти рахує рівень заклинача, а не загальний рівень персонажа (BUG-010): інакше Воїн 2
  /// прокидається з трьома слотами 1 кола, а Воїн 3 / Чарівник 2 — зі слотами повного
  /// заклинача 5 рівня. Створення й підвищення рівня рахують саме так уже давно —
  /// відпочинок був єдиним місцем із власною копією таблиці.
  const maxSpellSlots = persForSlots
    ? getMaximumStandardSpellSlots(
        toRulesSpellcastingCharacter(persForSlots as SpellcastingPersLike),
        SPELL_SLOT_PROGRESSION.FULL,
        pers.ruleset,
      )
    : [];

  const hasHeroicInspiration = await findHeroicInspirationAfterLongRestForPers(persId, pers.hasHeroicInspiration);

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
      hasHeroicInspiration,
    },
  });

  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);

  return {
    success: true,
    newCurrentHp: pers.maxHp,
    currentHitDice: restoredHitDice,
    currentSpellSlots: maxSpellSlots,
    currentPactSlots: maxPactSlots,
    spellSlotsRestored: true,
    featuresRestored,
  };
}

/// У відповідь дії натхнення не кладеться: її дослівно фіксують золоті знімки `tests/golden`,
/// а лист виводить те саме правило з фіч персонажа сам (`RestButton`).
async function findHeroicInspirationAfterLongRestForPers(persId: number, hasHeroicInspiration: boolean): Promise<boolean> {
  const carriers = await prisma.persFeature.findMany({
    where: { persId, feature: { engName: { in: listFeaturesGrantingHeroicInspirationOnLongRest() } } },
    select: { feature: { select: { engName: true } } },
  });

  return findHeroicInspirationAfterLongRest({
    hasHeroicInspiration,
    featureEngNames: carriers.map((row) => row.feature.engName),
  });
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
  
  const hitDicePools = collectHitDicePools(owned.pers);

  const classes = await prisma.class.findMany({
    where: { classId: { in: hitDicePools.map((pool) => pool.classId) } },
    select: { classId: true, name: true },
  });
  const classNameMap = new Map(classes.map((entry) => [entry.classId, entry.name]));

  const hitDice = hitDicePools.map((pool) => ({
    classId: pool.classId,
    className: classNameMap.get(pool.classId) ?? "Невідомий",
    hitDie: pool.hitDie,
    current: pool.current,
    max: pool.max,
  }));

  return { success: true, hitDice };
}

/**
 * Ручна правка кубиків здоровʼя: скільки лишилось у кожному класі.
 * Витрачений вживу кубик має відніматись без відпочинку й без лікування.
 */
export async function setHitDice(
  persId: number,
  remainingByClass: Record<number, number>
): Promise<{ success: true; currentHitDice: Record<number, number> } | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  const updated = findPoolsAfterSetting(collectHitDicePools(owned.pers), remainingByClass);
  if (!updated.ok) return { success: false, error: updated.error };

  const currentHitDice = serializeHitDicePools(updated.pools);

  try {
    await prisma.pers.update({
      where: { persId },
      data: { currentHitDice: currentHitDice as object },
    });

    revalidatePath(`/char/${persId}`);
    revalidatePath(`/character/${persId}`);

    return { success: true, currentHitDice };
  } catch (error) {
    console.error("Error updating hit dice:", error);
    return { success: false, error: "Помилка при збереженні кубиків здоровʼя" };
  }
}
