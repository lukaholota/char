/**
 * Граф, який конструктор персонажа читав з бази до KR22.5.
 *
 * Файл існує, щоб джерело було одне: генератор каталогу і тест звірки беруть запити звідси, а не
 * тримають кожен свою копію `include`. Розійдуться копії — звірка почне порівнювати різні речі й
 * мовчки зеленітиме.
 */

import type { PrismaClient, Ruleset } from "@prisma/client";

export const RACE_CREATOR_INCLUDE = {
  raceChoiceOptions: { include: { traits: { include: { feature: true } } } },
  /// Порядок явно: без нього Postgres віддає фізичний, а `UPDATE` підраси (сід прози KR33.6)
  /// його міняє — наступна регенерація переставила б підраси PHB у кінець кроку вибору.
  subraces: { include: { traits: { include: { feature: true } } }, orderBy: { subraceId: "asc" } },
  raceVariants: { include: { traits: { include: { feature: true } } }, orderBy: { raceVariantId: "asc" } },
  traits: { include: { feature: true } },
} as const;

export const CLASS_CREATOR_INCLUDE = {
  subclasses: {
    include: {
      features: { include: { feature: true } },
      subclassChoiceOptions: { include: { choiceOption: { include: { features: { include: { feature: true } } } } } },
      expandedSpells: true,
    },
  },
  startingEquipmentOption: { include: { equipmentPack: true, weapon: true, armor: true } },
  classChoiceOptions: { include: { choiceOption: { include: { features: { include: { feature: true } } } } } },
  classOptionalFeatures: {
    include: { feature: true, replacesFeatures: { include: { replacedFeature: true } }, appearsOnlyIfChoicesTaken: true },
  },
  features: { include: { feature: true } },
} as const;

export const BACKGROUND_CREATOR_INCLUDE = { gainsFeats: true } as const;

export const FEAT_CREATOR_INCLUDE = {
  grantsFeature: true,
  featChoiceOptions: { include: { choiceOption: { include: { features: { include: { feature: true } } } } } },
} as const;

/// Левелап читає той самий граф класів і рис, що й конструктор (його `include` — підмножина),
/// але має ще й інфузії, яких конструктору не треба: артифісер бере їх з другого рівня.
export const INFUSION_CREATOR_INCLUDE = {
  feature: { select: { name: true, description: true, shortDescription: true } },
  replicatedMagicItem: {
    select: {
      magicItemId: true,
      name: true,
      engName: true,
      itemType: true,
      rarity: true,
      requiresAttunement: true,
      description: true,
      shortDescription: true,
      bonusToAC: true,
      bonusToRangedDamage: true,
      bonusToSavingThrows: true,
      noArmorOrShieldForACBonus: true,
      givesSpells: { select: { spellId: true, name: true, engName: true, level: true } },
    },
  },
} as const;

export function findCreatorRaces(prisma: PrismaClient, ruleset: Ruleset) {
  return prisma.race.findMany({
    where: { ruleset },
    include: RACE_CREATOR_INCLUDE,
    orderBy: [{ sortOrder: "asc" }, { raceId: "asc" }],
  });
}

export function findCreatorClasses(prisma: PrismaClient, ruleset: Ruleset) {
  return prisma.class.findMany({
    where: { ruleset },
    include: CLASS_CREATOR_INCLUDE,
    orderBy: [{ sortOrder: "asc" }, { classId: "asc" }],
  });
}

export function findCreatorBackgrounds(prisma: PrismaClient, ruleset: Ruleset) {
  return prisma.background.findMany({ where: { ruleset }, include: BACKGROUND_CREATOR_INCLUDE });
}

export function findCreatorWeapons(prisma: PrismaClient, ruleset: Ruleset) {
  return prisma.weapon.findMany({ where: { ruleset }, orderBy: [{ sortOrder: "asc" }, { weaponId: "asc" }] });
}

export function findCreatorFeats(prisma: PrismaClient, ruleset: Ruleset) {
  return prisma.feat.findMany({
    where: { ruleset },
    include: FEAT_CREATOR_INCLUDE,
    orderBy: [{ name: "asc" }],
  });
}

export function findCreatorInfusions(prisma: PrismaClient, ruleset: Ruleset) {
  return prisma.infusion.findMany({
    where: { ruleset },
    include: INFUSION_CREATOR_INCLUDE,
    orderBy: [{ minArtificerLevel: "asc" }, { name: "asc" }],
  });
}

export type CreatorRace = Awaited<ReturnType<typeof findCreatorRaces>>[number];
export type CreatorClass = Awaited<ReturnType<typeof findCreatorClasses>>[number];
export type CreatorBackground = Awaited<ReturnType<typeof findCreatorBackgrounds>>[number];
export type CreatorWeapon = Awaited<ReturnType<typeof findCreatorWeapons>>[number];
export type CreatorFeat = Awaited<ReturnType<typeof findCreatorFeats>>[number];
export type CreatorInfusion = Awaited<ReturnType<typeof findCreatorInfusions>>[number];

export type CreatorContent = {
  races: CreatorRace[];
  classes: CreatorClass[];
  backgrounds: CreatorBackground[];
  weapons: CreatorWeapon[];
  feats: CreatorFeat[];
  infusions: CreatorInfusion[];
};

export async function findCreatorContent(prisma: PrismaClient, ruleset: Ruleset): Promise<CreatorContent> {
  const [races, classes, backgrounds, weapons, feats, infusions] = await Promise.all([
    findCreatorRaces(prisma, ruleset),
    findCreatorClasses(prisma, ruleset),
    findCreatorBackgrounds(prisma, ruleset),
    findCreatorWeapons(prisma, ruleset),
    findCreatorFeats(prisma, ruleset),
    findCreatorInfusions(prisma, ruleset),
  ]);
  return { races, classes, backgrounds, weapons, feats, infusions };
}
