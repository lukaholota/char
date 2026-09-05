import { prisma } from "@/lib/prisma";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import type { Ruleset } from "@prisma/client";

// KR18.1: контент підвищення рівня їде з `pers.ruleset`, а не з однієї редакції на весь застосунок.
const DEFAULT_RULESET: Ruleset = "RULES_2014";

export async function loadLevelUpBaseContent(persId: number) {
  const pers = await prisma.pers.findUnique({
    where: { persId },
    include: {
      class: true,
      subclass: true,
      choiceOptions: true,
      features: { select: { featureId: true, feature: { select: { bonusHitPointsPerLevel: true } } } },
      skills: { select: { name: true, proficiencyType: true } },
      persInfusions: { select: { infusionId: true } },
      multiclasses: { include: { class: true, subclass: true } },
      // KR18.5: рівневі риси й заклинання виду відкриваються рівнем ПЕРСОНАЖА, тому
      // підвищення рівня має бачити і рівні рис, і обрані вибори виду, і вже видані заклинання.
      race: {
        include: {
          traits: {
            select: {
              featureId: true,
              level: true,
              feature: { include: { givesSpells: { select: { spellId: true } } } },
            },
          },
        },
      },
      raceChoiceOptions: {
        select: {
          optionName: true,
          spellcastingAbility: true,
          traitFeature: { select: { engName: true, name: true } },
          traits: { select: { feature: { select: { engName: true, name: true, givesSpells: { select: { spellId: true } } } } } },
          spells: { select: { spellId: true, characterLevel: true } },
        },
      },
      persSpells: { select: { spellId: true } },
      pers_weapon_mastery: { select: { weapon_id: true } },
      subrace: true,
      feats: { include: { feat: true, choices: { select: { choiceOption: { select: { groupName: true, optionNameEng: true } } } } } },
    },
  });
  // KR22.5: з бази лишається сам персонаж — єдині живі дані. Класи, риси й інфузії їдуть з
  // файлу, тому й добовий `unstable_cache` навколо них більше не потрібен.
  const ruleset = pers?.ruleset ?? DEFAULT_RULESET;
  const { classes, feats, infusions, weapons } = findCharacterCreatorOptions(ruleset);
  return { pers, classes, feats, infusions, weapons };
}

export async function loadLevelUpChoiceContent(choiceOptionIds: readonly number[]) {
  const selectedIds = uniquePositiveIds(choiceOptionIds);
  if (!selectedIds.length) return { choiceOptions: [], choiceOptionFeatures: [] };

  const [choiceOptions, choiceOptionFeatures] = await Promise.all([
    prisma.choiceOption.findMany({
      where: { choiceOptionId: { in: selectedIds } },
      select: {
        choiceOptionId: true,
        groupName: true,
        prerequisites: true,
        optionNameEng: true,
        effectKind: true,
        effectSkill: true,
        effectAbility: true,
        effectAmount: true,
      },
    }),
    prisma.choiceOptionFeature.findMany({
      where: { choiceOptionId: { in: selectedIds } },
      select: { choiceOptionId: true, featureId: true },
    }),
  ]);

  return { choiceOptions, choiceOptionFeatures };
}

export async function loadLevelUpFeatureEffects(featureIds: readonly number[]) {
  const selectedIds = uniquePositiveIds(featureIds);
  if (!selectedIds.length) return [];

  return prisma.feature.findMany({
    where: { featureId: { in: selectedIds } },
    select: {
      featureId: true,
      name: true,
      bonusHitPointsPerLevel: true,
      skillProficiencies: true,
      armorProficiencies: true,
      weaponProficiencies: true,
      weaponProficienciesSpecial: true,
      toolProficiencies: true,
      givesLanguages: true,
      skillExpertises: true,
    },
  });
}

export async function loadLevelUpOptionalFeatures(optionalFeatureIds: readonly number[]) {
  const selectedIds = uniquePositiveIds(optionalFeatureIds);
  if (!selectedIds.length) return [];

  return prisma.classOptionalFeature.findMany({
    where: { optionalFeatureId: { in: selectedIds } },
    include: { replacesFeatures: true },
  });
}

function uniquePositiveIds(ids: readonly number[]): number[] {
  return Array.from(new Set(ids)).filter((id) => Number.isFinite(id) && id > 0);
}
