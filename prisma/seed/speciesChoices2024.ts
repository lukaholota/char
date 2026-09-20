/**
 * KR18.4 — вибори видів 2024 у наявній таблиці `race_choice_option`.
 *
 * Ту саму таблицю 2014 використовує для Дракононародженого; діри були рівно дві — жодного
 * рядка `RULES_2024` і ніде зберегти обрану характеристику замовляння родоводу. Друге закрив
 * DDL 2026-08-29 (`option_name_eng`, `spellcasting_ability`, `trait_feature_id`).
 *
 * Джерело чисел — SRD 5.2.1 (`data/2024/srd/character-origins.md`); українські назви взяті з
 * уже перекладеної прози `data/2024/normalized/species.json` і з `dictionary.json`, нових
 * термінів тут не коіновано.
 */

import { Ability, FeatureDisplayType, Prisma, PrismaClient, Races, Ruleset, Skills } from "@prisma/client";
import { featTranslations } from "../../src/lib/refs/translation";

const RULESET: Ruleset = "RULES_2024";

const SPELLCASTING_ABILITY_GROUP = "Базова характеристика заклинань";
const ORIGIN_FEAT_GROUP = "Риса походження";

type ChoiceOptionSeed = {
  optionNameEng: string;
  optionName: string;
  description: string;
  grantsFeature?: { engName: string; name: string; description: string; givesSpells?: string[] };
  reusesFeature?: { engName: string; addsSpells?: string[] };
  spellcastingAbility?: Ability;
  modifiesSpeed?: number;
  skillProficiencies?: { options: Skills[]; choiceCount: number };
};

type ChoiceGroupSeed = {
  race: Races;
  traitEngName: string;
  groupName: string;
  options: ChoiceOptionSeed[];
};

const DRAGON_ANCESTORS: Array<[eng: string, uk: string, damage: string]> = [
  ["Black", "Чорний дракон", "кислотою"],
  ["Blue", "Синій дракон", "блискавкою"],
  ["Brass", "Латунний дракон", "вогнем"],
  ["Bronze", "Бронзовий дракон", "блискавкою"],
  ["Copper", "Мідний дракон", "кислотою"],
  ["Gold", "Золотий дракон", "вогнем"],
  ["Green", "Зелений дракон", "отрутою"],
  ["Red", "Червоний дракон", "вогнем"],
  ["Silver", "Срібний дракон", "холодом"],
  ["White", "Білий дракон", "холодом"],
];

const GIANT_ANCESTRY_BOONS: Array<{ eng: string; uk: string; description: string }> = [
  { eng: "Cloud's Jaunt", uk: "Стрибок хмар", description: "<a href=\"/2024/rules/combat#bonus-action--bonus-action\">Бонусною дією</a> ви магічно телепортуєтеся на відстань до 30 футів у незайнятий простір, який бачите." },
  { eng: "Fire's Burn", uk: "Палючий вогонь", description: "Коли ви влучаєте атакою і завдаєте шкоди, ви можете додати цілі +1к10 шкоди вогнем." },
  { eng: "Frost's Chill", uk: "Морозний холод", description: "Коли ви влучаєте атакою і завдаєте шкоди, ви можете додати цілі +1к6 шкоди холодом і зменшити її швидкість на 10 футів до початку вашого наступного ходу." },
  { eng: "Hill's Tumble", uk: "Збиття пагорбів", description: "Коли ви влучаєте атакою по істоті розміру Великий або менше і завдаєте їй шкоди, ви можете надати їй стан <a href=\"/2024/rules/conditions#condition-prone\">Повалений</a>." },
  { eng: "Stone's Endurance", uk: "Камʼяна стійкість", description: "<a href=\"/2024/rules/combat#reaction--reaction\">Реакцією</a>, коли ви отримуєте шкоду, ви кидаєте 1к12, додаєте свій модифікатор Статури і зменшуєте шкоду на цю суму." },
  { eng: "Storm's Thunder", uk: "Грім бурі", description: "<a href=\"/2024/rules/combat#reaction--reaction\">Реакцією</a>, коли ви отримуєте шкоду від істоти в межах 60 футів, яку ви бачите, ви завдаєте їй +1к8 шкоди громом." },
];

const SPELLCASTING_ABILITY_OPTIONS: Array<[Ability, string]> = [
  ["INT", "Інтелект"],
  ["WIS", "Мудрість"],
  ["CHA", "Харизма"],
];

const CHOICE_GROUPS: ChoiceGroupSeed[] = [
  {
    race: "DRAGONBORN_2024",
    traitEngName: "Dragonborn: Draconic Ancestry (2024)",
    groupName: "Драконяче походження",
    options: DRAGON_ANCESTORS.map(([eng, uk, damage]) => ({
      optionNameEng: eng,
      optionName: uk,
      description: `Ваш Подих завдає шкоди ${damage}, і ви маєте <a href="/2024/rules/combat#resistance--resistance">опір</a> до шкоди ${damage}.`,
      grantsFeature: {
        engName: `Draconic Ancestry: ${eng} (2024)`,
        name: `Драконяче походження (${uk})`,
        description: `Ваш Подих завдає шкоди ${damage}. Ви також маєте <a href="/2024/rules/combat#resistance--resistance">опір</a> до шкоди ${damage}.`,
      },
    })),
  },
  {
    race: "ELF_2024",
    traitEngName: "Elf: Elven Lineage (2024)",
    groupName: "Ельфійський родовід",
    options: [
      {
        optionNameEng: "Drow",
        optionName: "Дроу",
        description: "Дальність вашого темнозору зростає до 120 футів. Ви також знаєте замовляння <a href=\"/2024/spells/dancing-lights\">Мерехтливі вогники [Dancing Lights]</a>.",
        grantsFeature: {
          engName: "Elven Lineage: Drow (2024)",
          name: "Ельфійський родовід (Дроу)",
          description: "Дальність вашого темнозору зростає до 120 футів. Ви також знаєте замовляння <a href=\"/2024/spells/dancing-lights\">Мерехтливі вогники [Dancing Lights]</a>.",
          givesSpells: ["Dancing Lights"],
        },
      },
      {
        optionNameEng: "High Elf",
        optionName: "Високий ельф",
        description: "Ви знаєте замовляння <a href=\"/2024/spells/prestidigitation\">Штукарство [Prestidigitation]</a>. Щоразу, завершуючи довгий відпочинок, ви можете замінити його на інше замовляння зі списку заклинань чарівника.",
        grantsFeature: {
          engName: "Elven Lineage: High Elf (2024)",
          name: "Ельфійський родовід (Високий ельф)",
          description: "Ви знаєте замовляння <a href=\"/2024/spells/prestidigitation\">Штукарство [Prestidigitation]</a>. Щоразу, завершуючи довгий відпочинок, ви можете замінити його на інше замовляння зі списку заклинань чарівника.",
          givesSpells: ["Prestidigitation"],
        },
      },
      {
        optionNameEng: "Wood Elf",
        optionName: "Лісовий ельф",
        description: "Ваша швидкість зростає до 35 футів. Ви також знаєте замовляння <a href=\"/2024/spells/druidcraft\">Ремесло друїдів [Druidcraft]</a>.",
        modifiesSpeed: 5,
        grantsFeature: {
          engName: "Elven Lineage: Wood Elf (2024)",
          name: "Ельфійський родовід (Лісовий ельф)",
          description: "Ваша швидкість зростає до 35 футів. Ви також знаєте замовляння <a href=\"/2024/spells/druidcraft\">Ремесло друїдів [Druidcraft]</a>.",
          givesSpells: ["Druidcraft"],
        },
      },
    ],
  },
  {
    race: "ELF_2024",
    traitEngName: "Elf: Keen Senses (2024)",
    groupName: "Гострі чуття",
    options: [
      {
        optionNameEng: "Insight",
        optionName: "Аналіз поведінки",
        description: "Ви маєте володіння навичкою Аналіз поведінки.",
        skillProficiencies: { options: ["INSIGHT"], choiceCount: 1 },
      },
      {
        optionNameEng: "Perception",
        optionName: "Уважність",
        description: "Ви маєте володіння навичкою Уважність.",
        skillProficiencies: { options: ["PERCEPTION"], choiceCount: 1 },
      },
      {
        optionNameEng: "Survival",
        optionName: "Виживання",
        description: "Ви маєте володіння навичкою Виживання.",
        skillProficiencies: { options: ["SURVIVAL"], choiceCount: 1 },
      },
    ],
  },
  {
    race: "GNOME_2024",
    traitEngName: "Gnome: Gnomish Lineage (2024)",
    groupName: "Гномський родовід",
    options: [
      {
        optionNameEng: "Forest Gnome",
        optionName: "Лісовий гном",
        description: "Ви знаєте замовляння <a href=\"/2024/spells/minor-illusion\">Мала ілюзія [Minor Illusion]</a> і завжди маєте підготовленим заклинання <a href=\"/2024/spells/speak-with-animals\">Розмова з тваринами [Speak with Animals]</a>.",
        reusesFeature: { engName: "Gnome: Forest Gnome (2024)", addsSpells: ["Minor Illusion", "Speak with Animals"] },
      },
      {
        optionNameEng: "Rock Gnome",
        optionName: "Скельний гном",
        description: "Ви знаєте замовляння <a href=\"/2024/spells/mending\">Лагодження [Mending]</a> та <a href=\"/2024/spells/prestidigitation\">Штукарство [Prestidigitation]</a>.",
        reusesFeature: { engName: "Gnome: Rock Gnome (2024)", addsSpells: ["Mending", "Prestidigitation"] },
      },
    ],
  },
  {
    race: "GOLIATH_2024",
    traitEngName: "Goliath: Giant Ancestry (2024)",
    groupName: "Велетенське походження",
    options: GIANT_ANCESTRY_BOONS.map(({ eng, uk, description }) => ({
      optionNameEng: eng,
      optionName: uk,
      description,
      grantsFeature: {
        engName: `Giant Ancestry: ${eng} (2024)`,
        name: `Велетенське походження (${uk})`,
        description: `${description} Ви можете робити це кількість разів, що дорівнює вашому бонусу майстерності, і відновлюєте всі витрачені використання після завершення довгого відпочинку.`,
      },
    })),
  },
  {
    race: "TIEFLING_2024",
    traitEngName: "Tiefling: Fiendish Legacy (2024)",
    groupName: "Почварна спадщина",
    options: [
      {
        optionNameEng: "Abyssal",
        optionName: "Безодня",
        description: "Ви маєте <a href=\"/2024/rules/combat#resistance--resistance\">опір</a> до шкоди отрутою. Ви також знаєте замовляння <a href=\"/2024/spells/poison-spray\">Отруйні бризки [Poison Spray]</a>.",
        grantsFeature: {
          engName: "Fiendish Legacy: Abyssal (2024)",
          name: "Почварна спадщина (Безодня)",
          description: "Ви маєте <a href=\"/2024/rules/combat#resistance--resistance\">опір</a> до шкоди отрутою. Ви також знаєте замовляння <a href=\"/2024/spells/poison-spray\">Отруйні бризки [Poison Spray]</a>.",
          givesSpells: ["Poison Spray"],
        },
      },
      {
        optionNameEng: "Chthonic",
        optionName: "Хтонічна",
        description: "Ви маєте <a href=\"/2024/rules/combat#resistance--resistance\">опір</a> до некротичної шкоди. Ви також знаєте замовляння <a href=\"/2024/spells/chill-touch\">Моторошний дотик [Chill Touch]</a>.",
        grantsFeature: {
          engName: "Fiendish Legacy: Chthonic (2024)",
          name: "Почварна спадщина (Хтонічна)",
          description: "Ви маєте <a href=\"/2024/rules/combat#resistance--resistance\">опір</a> до некротичної шкоди. Ви також знаєте замовляння <a href=\"/2024/spells/chill-touch\">Моторошний дотик [Chill Touch]</a>.",
          givesSpells: ["Chill Touch"],
        },
      },
      {
        optionNameEng: "Infernal",
        optionName: "Пекельна",
        description: "Ви маєте <a href=\"/2024/rules/combat#resistance--resistance\">опір</a> до шкоди вогнем. Ви також знаєте замовляння <a href=\"/2024/spells/fire-bolt\">Вогняний заряд [Fire Bolt]</a>.",
        grantsFeature: {
          engName: "Fiendish Legacy: Infernal (2024)",
          name: "Почварна спадщина (Пекельна)",
          description: "Ви маєте <a href=\"/2024/rules/combat#resistance--resistance\">опір</a> до шкоди вогнем. Ви також знаєте замовляння <a href=\"/2024/spells/fire-bolt\">Вогняний заряд [Fire Bolt]</a>.",
          givesSpells: ["Fire Bolt"],
        },
      },
    ],
  },
];

/**
 * Фічі, які species.json перелічує як риси виду, хоча PHB 2024 робить із них варіанти вибору.
 * Безумовною рисою вони бути не можуть — гном не буває і лісовим, і скельним водночас.
 */
export const LINEAGE_OPTION_FEATURE_ENG_NAMES = ["Gnome: Forest Gnome (2024)", "Gnome: Rock Gnome (2024)"];

/** Родоводи, що дають заклинання, змушують обрати характеристику, якою ці заклинання чаклуються. */
const SPELLCASTING_ABILITY_TRAITS: Array<{ race: Races; traitEngName: string }> = [
  { race: "ELF_2024", traitEngName: "Elf: Elven Lineage (2024)" },
  { race: "GNOME_2024", traitEngName: "Gnome: Gnomish Lineage (2024)" },
  { race: "TIEFLING_2024", traitEngName: "Tiefling: Fiendish Legacy (2024)" },
];

/** Риса, яку заклинання отримують без вибору — Дивотворство тифлінга йде від Потойбічної присутності. */
const TRAIT_SPELLS: Array<{ traitEngName: string; spells: string[] }> = [
  { traitEngName: "Tiefling: Otherworldly Presence (2024)", spells: ["Thaumaturgy"] },
  { traitEngName: "Aasimar: Light Bearer (2024)", spells: ["Light"] },
];

export const seedSpeciesChoices2024 = async (prisma: PrismaClient) => {
  console.log("🧬 Вибори видів 2024…");

  await grantSpellsToTraits(prisma);
  await releaseLineageOptionsFromRaceTraits(prisma);

  let optionCount = 0;
  for (const group of CHOICE_GROUPS) {
    optionCount += await seedChoiceGroup(prisma, group);
  }
  optionCount += await seedSpellcastingAbilityGroups(prisma);
  optionCount += await seedHumanOriginFeatGroup(prisma);

  console.log(`  • ${optionCount} варіантів вибору видів 2024`);
};

/** Сід видів заводить родоводи гнома як безумовні риси — тут вони знімаються з виду. */
async function releaseLineageOptionsFromRaceTraits(prisma: PrismaClient) {
  const { count } = await prisma.raceTrait.deleteMany({
    where: { ruleset: RULESET, feature: { engName: { in: LINEAGE_OPTION_FEATURE_ENG_NAMES } } },
  });
  if (count) console.log(`  • ${count} родоводів знято з безумовних рис виду`);
}

async function grantSpellsToTraits(prisma: PrismaClient) {
  for (const { traitEngName, spells } of TRAIT_SPELLS) {
    await connectSpells(prisma, traitEngName, spells);
  }
}

async function seedChoiceGroup(prisma: PrismaClient, group: ChoiceGroupSeed): Promise<number> {
  const race = await findRace(prisma, group.race);
  if (!race) return 0;

  const trait = await findFeature(prisma, group.traitEngName);
  if (!trait) {
    console.warn(`  ⚠️ Риси "${group.traitEngName}" немає в базі — група "${group.groupName}" пропущена`);
    return 0;
  }

  /// Лише фічі, заведені самим вибором: родоводи гнома перевикористовують риси виду, і
  /// лічильник «Лісового гнома» не має розповзатися на «Скельного».
  const ownFeatureIds: number[] = [];
  for (const option of group.options) {
    const featureId = await resolveOptionFeatureId(prisma, option);
    if (featureId && option.grantsFeature) ownFeatureIds.push(featureId);
    await upsertRaceChoiceOption(prisma, {
      raceId: race.raceId,
      choiceGroupName: group.groupName,
      optionName: option.optionName,
      optionNameEng: option.optionNameEng,
      description: option.description,
      traitFeatureId: trait.featureId,
      modifiesSpeed: option.modifiesSpeed ?? null,
      skillProficiencies: option.skillProficiencies ?? null,
      spellcastingAbility: option.spellcastingAbility ?? null,
      featureId,
    });
  }

  await moveTraitUsesToChosenOptions(prisma, trait.featureId, ownFeatureIds);

  return group.options.length;
}

/**
 * Лічильник переїжджає з риси-меню на обране благословення.
 *
 * У книзі число використань стоїть у тексті самої риси («Велетенське походження», «Ельфійський
 * родовід», «Почварна спадщина»), бо там це один абзац із переліком. На листі так не можна:
 * витрачає використання **обраний** варіант, а меню перелічує ще пʼять чужих. Гном 2024 уже
 * влаштований правильно — там лічильник несе «Лісовий гном», а не «Гномський родовід».
 *
 * `species.json` лишається дзеркалом книги — його гейти читають окремо; переносить лише сід.
 * Лічильник шукається і на меню, і на варіантах, бо `upsertFeature` вище щоразу переписує
 * варіантам `displayType`: без другого джерела повторний прогін лишав би їх без `CLASS_RESOURCE`.
 */
async function moveTraitUsesToChosenOptions(prisma: PrismaClient, traitFeatureId: number, optionFeatureIds: number[]) {
  if (!optionFeatureIds.length) return;

  const trait = await readFeatureUses(prisma, { featureId: traitFeatureId });
  const uses = trait?.limitedUsesPer
    ? trait
    : await readFeatureUses(prisma, { featureId: { in: optionFeatureIds }, limitedUsesPer: { not: null } });
  if (!uses?.limitedUsesPer) return;

  await prisma.feature.updateMany({
    where: { featureId: { in: optionFeatureIds } },
    data: {
      limitedUsesPer: uses.limitedUsesPer,
      usesCount: uses.usesCount,
      usesCountDependsOnProficiencyBonus: uses.usesCountDependsOnProficiencyBonus,
      usesCountSpecial: uses.usesCountSpecial ?? Prisma.DbNull,
      displayType: withClassResource(uses.displayType),
    },
  });

  if (!trait?.limitedUsesPer) return;

  await prisma.feature.update({
    where: { featureId: traitFeatureId },
    data: {
      limitedUsesPer: null,
      usesCount: null,
      usesCountDependsOnProficiencyBonus: false,
      usesCountSpecial: Prisma.DbNull,
      displayType: withoutClassResource(trait.displayType),
    },
  });

  console.log(`  • лічильник «${trait.name}» перенесено на ${optionFeatureIds.length} варіантів`);
}

function readFeatureUses(prisma: PrismaClient, where: Prisma.FeatureWhereInput) {
  return prisma.feature.findFirst({
    where,
    select: {
      name: true,
      limitedUsesPer: true,
      usesCount: true,
      usesCountDependsOnProficiencyBonus: true,
      usesCountSpecial: true,
      displayType: true,
    },
  });
}

function withClassResource(displayType: FeatureDisplayType[]): FeatureDisplayType[] {
  return displayType.includes(FeatureDisplayType.CLASS_RESOURCE)
    ? displayType
    : [...displayType, FeatureDisplayType.CLASS_RESOURCE];
}

function withoutClassResource(displayType: FeatureDisplayType[]): FeatureDisplayType[] {
  const rest = displayType.filter((type) => type !== FeatureDisplayType.CLASS_RESOURCE);
  return rest.length ? rest : [FeatureDisplayType.PASSIVE];
}

async function seedSpellcastingAbilityGroups(prisma: PrismaClient): Promise<number> {
  let count = 0;
  for (const { race: raceName, traitEngName } of SPELLCASTING_ABILITY_TRAITS) {
    const race = await findRace(prisma, raceName);
    const trait = await findFeature(prisma, traitEngName);
    if (!race || !trait) continue;

    for (const [ability, optionName] of SPELLCASTING_ABILITY_OPTIONS) {
      await upsertRaceChoiceOption(prisma, {
        raceId: race.raceId,
        choiceGroupName: SPELLCASTING_ABILITY_GROUP,
        optionName,
        optionNameEng: ability,
        description: `Заклинання цієї риси ви чаклуєте характеристикою ${optionName}.`,
        traitFeatureId: trait.featureId,
        modifiesSpeed: null,
        skillProficiencies: null,
        spellcastingAbility: ability,
        featureId: null,
      });
      count += 1;
    }
  }
  return count;
}

/**
 * «Ви отримуєте одну рису походження на ваш вибір». Опція зчіплюється з рисою тим самим
 * ланцюгом, що й бойовий стиль у KR18.3: опція дає фічу, і та сама фіча висить на рисі.
 */
async function seedHumanOriginFeatGroup(prisma: PrismaClient): Promise<number> {
  const race = await findRace(prisma, "HUMAN_2024");
  const trait = await findFeature(prisma, "Human: Versatile (2024)");
  if (!race || !trait) return 0;

  const originFeats = await prisma.feat.findMany({
    where: { ruleset: RULESET, category: "ORIGIN" },
    select: { featId: true, name: true, engName: true, description: true, shortDescription: true },
    orderBy: { engName: "asc" },
  });

  for (const feat of originFeats) {
    const featureName = `${ORIGIN_FEAT_GROUP}: ${featTranslations[feat.name] ?? feat.engName}`;
    const feature = await upsertFeature(prisma, {
      engName: `Origin Feat: ${feat.engName} (2024)`,
      name: featureName,
      description: feat.description,
      shortDescription: feat.shortDescription,
    });
    await prisma.feat.update({
      where: { featId: feat.featId },
      data: { grantsFeature: { connect: { featureId: feature.featureId } } },
    });

    await upsertRaceChoiceOption(prisma, {
      raceId: race.raceId,
      choiceGroupName: ORIGIN_FEAT_GROUP,
      optionName: featTranslations[feat.name] ?? feat.engName,
      optionNameEng: feat.engName,
      description: feat.shortDescription,
      traitFeatureId: trait.featureId,
      modifiesSpeed: null,
      skillProficiencies: null,
      spellcastingAbility: null,
      featureId: feature.featureId,
    });
  }

  return originFeats.length;
}

async function resolveOptionFeatureId(prisma: PrismaClient, option: ChoiceOptionSeed): Promise<number | null> {
  if (option.reusesFeature) {
    const existing = await findFeature(prisma, option.reusesFeature.engName);
    if (!existing) {
      console.warn(`  ⚠️ Фічі "${option.reusesFeature.engName}" немає в базі`);
      return null;
    }
    if (option.reusesFeature.addsSpells) {
      await connectSpells(prisma, option.reusesFeature.engName, option.reusesFeature.addsSpells);
    }
    return existing.featureId;
  }

  if (!option.grantsFeature) return null;

  const feature = await upsertFeature(prisma, {
    engName: option.grantsFeature.engName,
    name: option.grantsFeature.name,
    description: option.grantsFeature.description,
    shortDescription: option.description,
  });
  if (option.grantsFeature.givesSpells) {
    await connectSpells(prisma, option.grantsFeature.engName, option.grantsFeature.givesSpells);
  }
  return feature.featureId;
}

async function connectSpells(prisma: PrismaClient, featureEngName: string, spellEngNames: string[]) {
  const spells = await prisma.spell.findMany({
    where: { ruleset: RULESET, engName: { in: spellEngNames } },
    select: { spellId: true, engName: true },
  });
  const missing = spellEngNames.filter((engName) => !spells.some((spell) => spell.engName === engName));
  if (missing.length) {
    console.warn(`  ⚠️ Заклинань 2024 немає в базі: ${missing.join(", ")}`);
  }
  if (!spells.length) return;

  await prisma.feature.update({
    where: { engName: featureEngName },
    data: { givesSpells: { connect: spells.map((spell) => ({ spellId: spell.spellId })) } },
  });
}

type FeatureSeed = { engName: string; name: string; description: string; shortDescription: string | null };

async function upsertFeature(prisma: PrismaClient, feature: FeatureSeed) {
  const data = {
    name: feature.name,
    description: feature.description,
    shortDescription: feature.shortDescription,
    displayType: [FeatureDisplayType.PASSIVE],
    ruleset: RULESET,
  };

  return prisma.feature.upsert({
    where: { engName: feature.engName },
    update: data,
    create: { ...data, engName: feature.engName },
  });
}

type RaceChoiceOptionSeed = {
  raceId: number;
  choiceGroupName: string;
  optionName: string;
  optionNameEng: string;
  description: string | null;
  traitFeatureId: number;
  modifiesSpeed: number | null;
  skillProficiencies: { options: Skills[]; choiceCount: number } | null;
  spellcastingAbility: Ability | null;
  featureId: number | null;
};

/**
 * Складений унікальний ключ таблиці містить nullable `subrace_id`, тому Postgres не вважає
 * два однакові рядки з NULL дублікатами — upsert по ньому ненадійний, як і в сіді 2014.
 */
async function upsertRaceChoiceOption(prisma: PrismaClient, option: RaceChoiceOptionSeed) {
  const data = {
    raceId: option.raceId,
    subraceId: null,
    choiceGroupName: option.choiceGroupName,
    optionName: option.optionName,
    optionNameEng: option.optionNameEng,
    description: option.description,
    selectMultiple: false,
    maxSelection: 1,
    modifiesSpeed: option.modifiesSpeed,
    skillProficiencies: option.skillProficiencies ?? undefined,
    spellcastingAbility: option.spellcastingAbility,
    traitFeatureId: option.traitFeatureId,
    ruleset: RULESET,
  };
  const traits = option.featureId ? { create: [{ featureId: option.featureId, ruleset: RULESET }] } : undefined;

  const existing = await prisma.raceChoiceOption.findFirst({
    where: {
      raceId: option.raceId,
      subraceId: null,
      choiceGroupName: option.choiceGroupName,
      optionName: option.optionName,
    },
    select: { optionId: true },
  });

  if (existing) {
    await prisma.raceChoiceOption.update({
      where: { optionId: existing.optionId },
      data: { ...data, traits: { deleteMany: {}, ...(traits ?? {}) } },
    });
    return;
  }

  await prisma.raceChoiceOption.create({ data: { ...data, ...(traits ? { traits } : {}) } });
}

const findRace = async (prisma: PrismaClient, name: Races) => {
  const race = await prisma.race.findFirst({ where: { name, ruleset: RULESET }, select: { raceId: true } });
  if (!race) console.warn(`  ⚠️ Виду ${name} немає в базі`);
  return race;
};

const findFeature = (prisma: PrismaClient, engName: string) =>
  prisma.feature.findUnique({ where: { engName }, select: { featureId: true } });
