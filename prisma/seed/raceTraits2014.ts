import { FeatureDisplayType, PrismaClient, Races, Ruleset, Variants } from "@prisma/client";

/// Три записи конструктора 2014 стоять без жодної риси: базова людина, Своя раса і варіант
/// людини. У каталозі й на кроці «Раса» видно назву й порожнечу під нею — механіка живе в
/// колонках (ASI, розмір, швидкість, мови), а тексту з книги немає.
///
/// Текст для людини і Своєї раси приїхав із `db/changes/2026-08-28-race-traits-custom-lineage-and-human.sql`,
/// який написали 28.08, але так і не прогнали: файл навіть не потрапив у git, і в проді його
/// немає. Разовий SQL для контенту суперечить [Р17](../../docs/DECISIONS.md), тож він переїхав
/// сюди сідом.
///
/// **Варіанта людини в тому SQL не було, і книжкового тексту для нього в репозиторії немає** —
/// PHB у `data/2014/srd/` не входить. Тому його три риси виведені з власних даних проєкту, а не
/// з памʼяті, і кожну можна перевірити в коді:
/// `prisma/seed/raceVariantSeed.ts` (`overridesRaceASI` — «+1 до Двох»),
/// `SkillsForm.tsx` (`HUMAN_VARIANT` → одна навичка на вибір),
/// `MultiStepForm.tsx` (`hasFeatChoice = raceVariant?.name === 'HUMAN_VARIANT'`).
///
/// Розмір, швидкість і мови рисами навмисно не заводяться: вони вже малюються окремими
/// комірками картки, і жодна інша раса не тримає їх удвічі (рішення власника 2026-08-28).

const ACTIVE_RULESET: Ruleset = "RULES_2014";

export type RaceTraitFeature = {
  engName: string;
  name: string;
  description: string;
  shortDescription: string;
};

/// `engName` глобально унікальний, тому назви з книги («Тип істоти», «Риса») несуть префікс
/// раси — так само, як це зроблено для видів 2024 («Aasimar: Darkvision (2024)»).
export const RACE_TRAIT_FEATURES_2014: RaceTraitFeature[] = [
  {
    engName: "Custom Lineage: Creature Type",
    name: "Тип істоти",
    description:
      "Ви гуманоїд. Ви визначаєте свою зовнішність і те, чи схожі ви на когось із родичів.",
    shortDescription: "Ви гуманоїд.",
  },
  {
    engName: "Custom Lineage: Ability Score Increase",
    name: "Покращення характеристик",
    description: "Одна характеристика на ваш вибір збільшується на 2.",
    shortDescription: "+2 до однієї характеристики на ваш вибір.",
  },
  {
    engName: "Custom Lineage: Feat",
    name: "Риса",
    description: "Ви отримуєте одну рису на ваш вибір, вимогам якої ви відповідаєте.",
    shortDescription: "Одна риса на ваш вибір.",
  },
  {
    engName: "Custom Lineage: Variable Trait",
    name: "Змінна особливість",
    description:
      "Ви отримуєте один із таких варіантів на ваш вибір:\n\nТемнозір на відстань 60 футів.\n\nВолодіння однією навичкою на ваш вибір.",
    shortDescription: "Темнозір 60 футів або володіння однією навичкою.",
  },
  {
    engName: "Human: Ability Score Increase",
    name: "Покращення характеристик",
    description: "Кожна ваша характеристика збільшується на 1.",
    shortDescription: "+1 до кожної характеристики.",
  },
  {
    engName: "Human: Age",
    name: "Вік",
    description:
      "Люди досягають повноліття наприкінці підліткового віку й живуть менше століття.",
    shortDescription: "Повноліття — наприкінці підліткового віку, життя — менше століття.",
  },
  {
    engName: "Human: Alignment",
    name: "Світогляд",
    description:
      "Люди не тяжіють до жодного конкретного світогляду. Серед них трапляються і найкращі, і найгірші.",
    shortDescription: "Без тяжіння до конкретного світогляду.",
  },
  {
    engName: "Human Variant: Ability Score Increase",
    name: "Покращення характеристик",
    description: "Дві характеристики на ваш вибір збільшуються на 1.",
    shortDescription: "+1 до двох характеристик на ваш вибір.",
  },
  {
    engName: "Human Variant: Skills",
    name: "Навички",
    description: "Ви отримуєте володіння однією навичкою на ваш вибір.",
    shortDescription: "Володіння однією навичкою на ваш вибір.",
  },
  {
    engName: "Human Variant: Feat",
    name: "Риса",
    description: "Ви отримуєте одну рису на ваш вибір, вимогам якої ви відповідаєте.",
    shortDescription: "Одна риса на ваш вибір.",
  },
];

/// Порядок у списку — це порядок на картці: сортувального стовпця в `race_trait` немає, тож
/// рядки читаються за `race_trait_id`, тобто в порядку вставки.
export const RACE_TRAITS_2014: Array<{ raceName: Races; featureEngNames: string[] }> = [
  {
    raceName: Races.CUSTOM_LINEAGE_TCE,
    featureEngNames: [
      "Custom Lineage: Creature Type",
      "Custom Lineage: Ability Score Increase",
      "Custom Lineage: Feat",
      "Custom Lineage: Variable Trait",
    ],
  },
  {
    raceName: Races.HUMAN_2014,
    featureEngNames: ["Human: Ability Score Increase", "Human: Age", "Human: Alignment"],
  },
];

export const RACE_VARIANT_TRAITS_2014: Array<{ variantName: Variants; featureEngNames: string[] }> = [
  {
    variantName: Variants.HUMAN_VARIANT,
    featureEngNames: [
      "Human Variant: Ability Score Increase",
      "Human Variant: Skills",
      "Human Variant: Feat",
    ],
  },
];

/// Ратифікований термін — «Темнозір» (`dictionary.json`, `darkvision`). «Темний зір» у словнику
/// існує, але це назва **заклинання** Darkvision — інша сутність. Опція шукається і за старою
/// назвою, і за новою, щоб сід лишався ідемпотентним.
export type RaceChoiceOptionText = {
  raceName: Races;
  choiceGroupName: string;
  legacyOptionName: string;
  optionName: string;
  description: string;
};

export const RACE_CHOICE_OPTION_TEXTS_2014: RaceChoiceOptionText[] = [
  {
    raceName: Races.CUSTOM_LINEAGE_TCE,
    choiceGroupName: "Своя раса",
    legacyOptionName: "Темний зір",
    optionName: "Темнозір",
    description: "Ви маєте темнозір на відстані 60 футів.",
  },
];

export type RaceTraitDrift = {
  staleFeatures: RaceTraitFeature[];
  missingRaceTraits: Array<{ raceName: Races; featureEngNames: string[] }>;
  missingVariantTraits: Array<{ variantName: Variants; featureEngNames: string[] }>;
  staleOptionTexts: RaceChoiceOptionText[];
};

export function countRaceTraitDrift(drift: RaceTraitDrift): number {
  return (
    drift.staleFeatures.length +
    drift.missingRaceTraits.length +
    drift.missingVariantTraits.length +
    drift.staleOptionTexts.length
  );
}

export async function findRaceTraitDrift(prisma: PrismaClient): Promise<RaceTraitDrift> {
  return {
    staleFeatures: await findStaleFeatures(prisma),
    missingRaceTraits: await findMissingRaceTraits(prisma),
    missingVariantTraits: await findMissingVariantTraits(prisma),
    staleOptionTexts: await findStaleOptionTexts(prisma),
  };
}

export async function syncRaceTraitsFromSeed(prisma: PrismaClient): Promise<RaceTraitDrift> {
  const drift = await findRaceTraitDrift(prisma);

  await upsertTraitFeatures(prisma);
  await relinkRaceTraits(prisma, drift.missingRaceTraits);
  await relinkVariantTraits(prisma, drift.missingVariantTraits);
  await rewriteOptionTexts(prisma, drift.staleOptionTexts);

  return drift;
}

/// Текст риси теж належить сіду, інакше `--apply` мовчки переписував би описи, про які показ без
/// запису не сказав ані слова.
async function findStaleFeatures(prisma: PrismaClient): Promise<RaceTraitFeature[]> {
  const stale: RaceTraitFeature[] = [];

  for (const feature of RACE_TRAIT_FEATURES_2014) {
    const stored = await prisma.feature.findUnique({
      where: { engName: feature.engName },
      select: { name: true, description: true, shortDescription: true },
    });

    if (
      !stored ||
      stored.name !== feature.name ||
      stored.description !== feature.description ||
      stored.shortDescription !== feature.shortDescription
    ) {
      stale.push(feature);
    }
  }

  return stale;
}

async function findMissingRaceTraits(prisma: PrismaClient): Promise<RaceTraitDrift["missingRaceTraits"]> {
  const missing: RaceTraitDrift["missingRaceTraits"] = [];

  for (const entry of RACE_TRAITS_2014) {
    const stored = await readRaceTraitNames(prisma, entry.raceName);
    if (!sameOrder(stored, entry.featureEngNames)) missing.push(entry);
  }

  return missing;
}

async function findMissingVariantTraits(
  prisma: PrismaClient
): Promise<RaceTraitDrift["missingVariantTraits"]> {
  const missing: RaceTraitDrift["missingVariantTraits"] = [];

  for (const entry of RACE_VARIANT_TRAITS_2014) {
    const stored = await readVariantTraitNames(prisma, entry.variantName);
    if (!sameOrder(stored, entry.featureEngNames)) missing.push(entry);
  }

  return missing;
}

async function findStaleOptionTexts(prisma: PrismaClient): Promise<RaceChoiceOptionText[]> {
  const stale: RaceChoiceOptionText[] = [];

  for (const text of RACE_CHOICE_OPTION_TEXTS_2014) {
    const option = await findChoiceOption(prisma, text);
    if (!option) continue;
    if (option.optionName !== text.optionName || option.description !== text.description) {
      stale.push(text);
    }
  }

  return stale;
}

async function upsertTraitFeatures(prisma: PrismaClient): Promise<void> {
  for (const feature of RACE_TRAIT_FEATURES_2014) {
    const payload = {
      name: feature.name,
      description: feature.description,
      shortDescription: feature.shortDescription,
      displayType: [FeatureDisplayType.PASSIVE],
      ruleset: ACTIVE_RULESET,
    };

    await prisma.feature.upsert({
      where: { engName: feature.engName },
      update: payload,
      create: { engName: feature.engName, ...payload },
    });
  }
}

/// Звʼязки перескладаються цілком, а не доливаються: порядок рис на картці — це порядок
/// `race_trait_id`, сортувального стовпця в таблиці немає. Видалення безпечне — на `race_trait`
/// ніщо не посилається, персонаж тримає фічу через `pers_feature`.
async function relinkRaceTraits(
  prisma: PrismaClient,
  entries: RaceTraitDrift["missingRaceTraits"]
): Promise<void> {
  for (const entry of entries) {
    const race = await findRace(prisma, entry.raceName);
    if (!race) continue;

    await prisma.raceTrait.deleteMany({ where: { raceId: race.raceId } });
    for (const engName of entry.featureEngNames) {
      const feature = await findFeature(prisma, engName);
      if (!feature) continue;

      await prisma.raceTrait.create({
        data: { raceId: race.raceId, featureId: feature.featureId, ruleset: ACTIVE_RULESET },
      });
    }
  }
}

async function relinkVariantTraits(
  prisma: PrismaClient,
  entries: RaceTraitDrift["missingVariantTraits"]
): Promise<void> {
  for (const entry of entries) {
    const variant = await findVariant(prisma, entry.variantName);
    if (!variant) continue;

    await prisma.raceVariantTrait.deleteMany({ where: { raceVariantId: variant.raceVariantId } });
    for (const engName of entry.featureEngNames) {
      const feature = await findFeature(prisma, engName);
      if (!feature) continue;

      await prisma.raceVariantTrait.create({
        data: {
          raceVariantId: variant.raceVariantId,
          featureId: feature.featureId,
          ruleset: ACTIVE_RULESET,
        },
      });
    }
  }
}

async function rewriteOptionTexts(
  prisma: PrismaClient,
  texts: RaceChoiceOptionText[]
): Promise<void> {
  for (const text of texts) {
    const option = await findChoiceOption(prisma, text);
    if (!option) continue;

    await prisma.raceChoiceOption.update({
      where: { optionId: option.optionId },
      data: { optionName: text.optionName, description: text.description },
    });
  }
}

async function readRaceTraitNames(prisma: PrismaClient, raceName: Races): Promise<string[]> {
  const race = await findRace(prisma, raceName);
  if (!race) return [];

  const traits = await prisma.raceTrait.findMany({
    where: { raceId: race.raceId },
    orderBy: { raceTraitId: "asc" },
    select: { feature: { select: { engName: true } } },
  });

  return traits.map((trait) => trait.feature.engName);
}

async function readVariantTraitNames(prisma: PrismaClient, variantName: Variants): Promise<string[]> {
  const variant = await findVariant(prisma, variantName);
  if (!variant) return [];

  const traits = await prisma.raceVariantTrait.findMany({
    where: { raceVariantId: variant.raceVariantId },
    orderBy: { raceVariantTraitId: "asc" },
    select: { feature: { select: { engName: true } } },
  });

  return traits.map((trait) => trait.feature.engName);
}

async function findRace(prisma: PrismaClient, raceName: Races) {
  return prisma.race.findFirst({
    where: { name: raceName, ruleset: ACTIVE_RULESET },
    select: { raceId: true },
  });
}

async function findVariant(prisma: PrismaClient, variantName: Variants) {
  return prisma.raceVariant.findFirst({
    where: { name: variantName, ruleset: ACTIVE_RULESET },
    select: { raceVariantId: true },
  });
}

async function findFeature(prisma: PrismaClient, engName: string) {
  return prisma.feature.findUnique({ where: { engName }, select: { featureId: true } });
}

async function findChoiceOption(prisma: PrismaClient, text: RaceChoiceOptionText) {
  const race = await findRace(prisma, text.raceName);
  if (!race) return null;

  return prisma.raceChoiceOption.findFirst({
    where: {
      raceId: race.raceId,
      choiceGroupName: text.choiceGroupName,
      optionName: { in: [text.legacyOptionName, text.optionName] },
    },
    select: { optionId: true, optionName: true, description: true },
  });
}

function sameOrder(stored: string[], wanted: string[]): boolean {
  return stored.length === wanted.length && stored.every((name, index) => name === wanted[index]);
}
