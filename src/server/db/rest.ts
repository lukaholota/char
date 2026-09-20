import { RestType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAbilityMod } from "@/lib/logic/utils";
import {
  calculateCasterLevel,
  toRulesSpellcastingCharacter,
  type SpellcastingPersLike,
} from "@/lib/logic/spell-logic";
import { calculateMaxUsesForFeature } from "@/lib/logic/feature-resources";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { getMaximumStandardSpellSlots } from "@/rules/spellcasting";
import { findUsesAfterShortRest } from "@/rules/resource-pools";
import {
  findHeroicInspirationCountAfterLongRest,
  listFeaturesGrantingHeroicInspirationOnLongRest,
  type HeroicInspiration,
} from "@/rules/heroic-inspiration";
import {
  buildHitDicePools,
  findMainClassLevel,
  findPoolsAfterLongRest,
  findPoolsAfterSpending,
  rollHitPointsFromHitDice,
  serializeHitDicePools,
  type HitDicePool,
  type HitDiceSpend,
  type StoredHitDice,
} from "@/rules/hit-dice";
import { findPoolProviderForPers } from "@/server/db/resource-pool-provider";
import { endFeatureStates } from "@/server/db/feature-state-change";
import { endPersEffectsAfterRest } from "@/server/db/pers-effect-change";

const pactSpellSlotProgression = (SPELL_SLOT_PROGRESSION as { PACT?: Record<number, { slots: number; level: number }> }).PACT;

export async function findRestPers(persId: number) {
  return prisma.pers.findUnique({
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
      heroicInspirationCount: true,
      canStackHeroicInspiration: true,
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
}

export type RestPers = NonNullable<Awaited<ReturnType<typeof findRestPers>>>;

export function collectHitDicePools(pers: RestPers): HitDicePool[] {
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

/// Записи в `pers` ідуть останніми: якщо відтворення з офлайн-черги впаде посередині, повтор лише
/// ще раз відновить ресурси, а кубики здоровʼя не спишуться двічі.
export async function takeShortRest(
  pers: RestPers,
  hitDiceToUse: HitDiceSpend[],
  rolledHitPoints?: number,
): Promise<ShortRestResult | ShortRestError> {
  const hitDicePools = collectHitDicePools(pers);
  const spent = findPoolsAfterSpending(hitDicePools, hitDiceToUse);
  if (!spent.ok) return { success: false, error: spent.error };

  const updatedDice = serializeHitDicePools(spent.pools);

  // Гравець, що кидає кубики вживу, вводить свій результат — включно з нулем,
  // коли кубик витрачено на щось інше й хіти не відновлювались.
  const totalHpRestored =
    rolledHitPoints === undefined
      ? rollHitPointsFromHitDice(hitDicePools, hitDiceToUse, getAbilityMod(pers.con))
      : Math.max(0, Math.trunc(Number.isFinite(rolledHitPoints) ? rolledHitPoints : 0));

  const newCurrentHp = Math.min(pers.maxHp, pers.currentHp + totalHpRestored);

  const maxPactSlots = await findMaxPactSlots(pers.persId);
  const newCurrentPactSlots = maxPactSlots > 0 ? maxPactSlots : (Number.isFinite(pers.currentPactSlots) ? Math.max(0, Math.trunc(pers.currentPactSlots)) : 0);

  const featuresRestored = await restoreFeaturesAfterShortRest(pers);
  await endFeatureStates(pers.persId);
  await endPersEffectsAfterRest(pers.persId, "SHORT");

  await prisma.pers.update({
    where: { persId: pers.persId },
    data: {
      currentHp: newCurrentHp,
      currentHitDice: updatedDice as object,
      currentPactSlots: newCurrentPactSlots,
    },
  });

  return {
    success: true,
    hpRestored: totalHpRestored,
    newCurrentHp,
    currentHitDice: updatedDice,
    currentPactSlots: newCurrentPactSlots,
    featuresRestored,
  };
}

async function restoreFeaturesAfterShortRest(pers: RestPers): Promise<number> {
  const persId = pers.persId;
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

  return featuresRestored;
}

export async function takeLongRest(pers: RestPers): Promise<LongRestResult> {
  const persId = pers.persId;
  const restoredHitDice = serializeHitDicePools(
    findPoolsAfterLongRest(collectHitDicePools(pers), pers.ruleset),
  );

  const featuresRestored = await restoreFeaturesAfterLongRest(pers);
  await endFeatureStates(persId);
  await endPersEffectsAfterRest(persId, "LONG");

  const persForSlots = await findSpellcastingPers(persId);
  const maxPactSlots = findMaxPactSlotsFor(persForSlots);

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

  const heroicInspirationCount = await findHeroicInspirationCountAfterLongRestForPers(persId, pers);

  await prisma.pers.update({
    where: { persId },
    data: {
      currentHp: pers.maxHp,
      tempHp: 0,
      currentHitDice: restoredHitDice as object,
      currentSpellSlots: maxSpellSlots,
      currentPactSlots: maxPactSlots,
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
      isDead: false,
      heroicInspirationCount,
    },
  });

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

async function restoreFeaturesAfterLongRest(pers: RestPers): Promise<number> {
  const persId = pers.persId;
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

  return featuresRestored;
}

async function findSpellcastingPers(persId: number) {
  return prisma.pers.findUnique({
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
}

async function findMaxPactSlots(persId: number): Promise<number> {
  return findMaxPactSlotsFor(await findSpellcastingPers(persId));
}

function findMaxPactSlotsFor(persForSlots: Awaited<ReturnType<typeof findSpellcastingPers>>): number {
  const caster = persForSlots ? calculateCasterLevel(persForSlots as SpellcastingPersLike) : { pactLevel: 0, casterLevel: 0 };
  const pactRow = pactSpellSlotProgression?.[caster.pactLevel];
  return pactRow?.slots ? Math.max(0, Math.trunc(pactRow.slots)) : 0;
}

/// У відповідь дії натхнення не кладеться: її дослівно фіксують золоті знімки `tests/golden`,
/// а лист виводить те саме правило з фіч персонажа сам (`RestButton`).
async function findHeroicInspirationCountAfterLongRestForPers(persId: number, inspiration: HeroicInspiration): Promise<number> {
  const carriers = await prisma.persFeature.findMany({
    where: { persId, feature: { engName: { in: listFeaturesGrantingHeroicInspirationOnLongRest() } } },
    select: { feature: { select: { engName: true } } },
  });

  return findHeroicInspirationCountAfterLongRest({
    heroicInspirationCount: inspiration.heroicInspirationCount,
    canStackHeroicInspiration: inspiration.canStackHeroicInspiration,
    featureEngNames: carriers.map((row) => row.feature.engName),
  });
}
