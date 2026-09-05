import { prisma } from "@/lib/prisma";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { Ruleset } from "@prisma/client";
import { characterLevelOnly } from "@/rules/character-level";
import { findEarnedSpeciesFeatureIds } from "@/rules/species-grants";

// KR6.3: hardcoded until the edition switch (O6 Крок 5) lets pers.ruleset drive this.
const ACTIVE_RULESET: Ruleset = "RULES_2014";

/** Персонаж завжди створюється першим рівнем — усе, що вид дає пізніше, довозить підвищення. */
const CREATION_LEVELS = characterLevelOnly(1);

export async function loadCreationContent(data: PersFormData) {
  const bg = await prisma.background.findUnique({ where: { backgroundId: data.backgroundId } });
  const effectiveBgFeatId = data.backgroundFeatId ?? bg?.originFeatId;

  const [race, variant, subrace, background, characterClass, subclass, feat, backgroundFeat] = await Promise.all([
    prisma.race.findUnique({ where: { raceId: data.raceId } }),
    data.raceVariantId ? prisma.raceVariant.findUnique({ where: { raceVariantId: data.raceVariantId } }) : null,
    data.subraceId ? prisma.subrace.findUnique({ where: { subraceId: data.subraceId } }) : null,
    Promise.resolve(bg),
    prisma.class.findUnique({
      where: { classId: data.classId },
      select: {
        name: true,
        ruleset: true,
        spellcastingType: true,
        primaryCastingStat: true,
        savingThrows: true,
        armorProficiencies: true,
        weaponProficiencies: true,
        weaponProficienciesSpecial: true,
        toolProficiencies: true,
        toolToChooseCount: true,
        languages: true,
        languagesToChooseCount: true,
        hitDie: true,
      },
    }),
    data.subclassId
      ? prisma.subclass.findUnique({
          where: { subclassId: data.subclassId },
          select: {
            subclassId: true,
            classId: true,
            armorProficiencies: true,
            weaponProficiencies: true,
          },
        })
      : null,
    data.featId
      ? prisma.feat.findUnique({
          where: { featId: data.featId },
          include: { featChoiceOptions: { include: { choiceOption: { include: { features: { select: { featureId: true } } } } } } },
        })
      : null,
    effectiveBgFeatId
      ? prisma.feat.findUnique({
          where: { featId: effectiveBgFeatId },
          include: { featChoiceOptions: { include: { choiceOption: { include: { features: { select: { featureId: true } } } } } } },
        })
      : null,
  ] as const);

  const acceptedOptionalFeatureIds = Object.entries(data.classOptionalFeatureSelections ?? {})
    .filter(([, accepted]) => accepted === true)
    .map(([id]) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
  const selectedChoiceOptionIds = uniquePositiveIds([
    ...Object.values(data.classChoiceSelections),
    ...Object.values(data.subclassChoiceSelections),
  ] as const);
  const selectedEquipmentOptionIds = uniquePositiveIds(
    Object.values(data.equipmentSchema?.choiceGroupToId ?? {}).flat(),
  );
  const raceChoiceOptionIds = uniquePositiveIds(Object.values(data.raceChoiceSelections ?? {}));
  const equipmentOptions = selectedEquipmentOptionIds.length
    ? await prisma.classStartingEquipmentOption.findMany({
        where: { optionId: { in: selectedEquipmentOptionIds } },
        include: { equipmentPack: true },
      })
    : [];

  const [classFeatures, raceFeatures, subraceFeatures, subclassFeatures, optionalFeatures, selectedChoiceOptions, choiceOptionFeatures, raceChoiceOptions, raceChoiceTraits, raceTraitFeatures] = await Promise.all([
    prisma.classFeature.findMany({ where: { classId: data.classId, levelGranted: 1 }, select: { featureId: true } }),
    prisma.raceTrait.findMany({ where: { raceId: data.raceId }, select: { featureId: true, level: true } }),
    data.subraceId
      ? prisma.subraceTrait.findMany({ where: { subraceId: data.subraceId }, select: { featureId: true } })
      : [],
    data.subclassId
      ? prisma.subclassFeature.findMany({ where: { subclassId: data.subclassId, levelGranted: 1 }, select: { featureId: true } })
      : [],
    acceptedOptionalFeatureIds.length
      ? prisma.classOptionalFeature.findMany({
          where: { optionalFeatureId: { in: acceptedOptionalFeatureIds } },
          include: { replacesFeatures: true },
        })
      : [],
    selectedChoiceOptionIds.length
      ? prisma.choiceOption.findMany({
          where: { choiceOptionId: { in: selectedChoiceOptionIds } },
          select: {
            choiceOptionId: true,
            effectKind: true,
            effectSkill: true,
            effectAbility: true,
            groupName: true,
            optionNameEng: true,
            prerequisites: true,
          },
        })
      : [],
    selectedChoiceOptionIds.length
      ? prisma.choiceOptionFeature.findMany({
          where: { choiceOptionId: { in: selectedChoiceOptionIds } },
          select: { featureId: true },
        })
      : [],
    raceChoiceOptionIds.length
      ? prisma.raceChoiceOption.findMany({
          where: { optionId: { in: raceChoiceOptionIds } },
          include: {
            traitFeature: { select: { engName: true, name: true } },
            traits: {
              select: {
                feature: { select: { engName: true, name: true, givesSpells: { select: { spellId: true } } } },
              },
            },
            spells: { select: { spellId: true, characterLevel: true } },
          },
        })
      : [],
    raceChoiceOptionIds.length
      ? prisma.raceChoiceOptionTrait.findMany({
          where: { optionId: { in: raceChoiceOptionIds } },
          select: { featureId: true },
        })
      : [],
    prisma.raceTrait.findMany({
      where: { raceId: data.raceId },
      select: { level: true, feature: { select: { engName: true, name: true, givesSpells: { select: { spellId: true } } } } },
    }),
  ] as const);

  const initialFeatureIds = [
    ...classFeatures.map((feature) => feature.featureId),
    // Риса виду може чекати рівня персонажа (Драконячий політ — 5-го): персонаж створюється
    // першим рівнем, тож сюди потрапляють лише ті, що доступні з першого (KR18.5).
    ...findEarnedSpeciesFeatureIds(raceFeatures, CREATION_LEVELS),
    ...subraceFeatures.map((feature) => feature.featureId),
    ...subclassFeatures.map((feature) => feature.featureId),
  ].filter((id) => Number.isFinite(id));
  const optionalGrantedFeatureIds = optionalFeatures
    .map((feature) => feature.featureId)
    .filter((id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0);
  const optionalReplacedFeatureIds = uniquePositiveIds(
    optionalFeatures.flatMap((feature) => feature.replacesFeatures.map((replacement) => replacement.replacedFeatureId)),
  );
  const choiceOptionFeatureIds = choiceOptionFeatures
    .map((feature) => feature.featureId)
    .filter((id) => Number.isFinite(id) && id > 0);
  const raceChoiceTraitFeatureIds = raceChoiceTraits
    .map((feature) => feature.featureId)
    .filter((id) => Number.isFinite(id) && id > 0);
  const allFeatureIds = uniquePositiveIds([
    ...initialFeatureIds,
    ...optionalGrantedFeatureIds,
    ...choiceOptionFeatureIds,
    ...raceChoiceTraitFeatureIds,
  ]);
  const features = allFeatureIds.length
    ? await prisma.feature.findMany({
        where: { featureId: { in: allFeatureIds } },
        select: {
          featureId: true,
          bonusHitPointsPerLevel: true,
          skillProficiencies: true,
          armorProficiencies: true,
          weaponProficiencies: true,
          weaponProficienciesSpecial: true,
          toolProficiencies: true,
          skillExpertises: true,
          givesLanguages: true,
        },
      })
    : [];

  // Рису може дати і вибір класу (бойовий стиль), і вибір виду (друга риса Людини 2024).
  const featGrantingFeatureIds = uniquePositiveIds([...choiceOptionFeatureIds, ...raceChoiceTraitFeatureIds]);
  const featsGrantedByChoiceOptions = featGrantingFeatureIds.length
    ? await prisma.feat.findMany({
        where: {
          ruleset: data.ruleset ?? characterClass?.ruleset ?? ACTIVE_RULESET,
          grantsFeature: { some: { featureId: { in: featGrantingFeatureIds } } },
        },
        select: {
          featId: true,
          name: true,
          category: true,
          isRepeatable: true,
          grantedASI: true,
          grantsFeature: { select: { featureId: true } },
          featChoiceOptions: { include: { choiceOption: { include: { features: { select: { featureId: true } } } } } },
        },
      })
    : [];

  return {
    race,
    variant,
    subrace,
    background,
    characterClass,
    subclass,
    feat,
    backgroundFeat,
    acceptedOptionalFeatureIds,
    selectedChoiceOptionIds,
    selectedEquipmentOptionIds,
    raceChoiceOptionIds,
    initialFeatureIds,
    optionalGrantedFeatureIds,
    optionalReplacedFeatureIds,
    choiceOptionFeatureIds,
    raceChoiceTraitFeatureIds,
    equipmentOptions,
    selectedChoiceOptions,
    raceChoiceOptions,
    raceTraitFeatures,
    features,
    featsGrantedByChoiceOptions,
    featGrantingFeatureIds,
  };
}

function uniquePositiveIds(values: Array<number | number[] | undefined>): number[] {
  return Array.from(new Set(values.flatMap((value) => (Array.isArray(value) ? value : [value]))))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
}
