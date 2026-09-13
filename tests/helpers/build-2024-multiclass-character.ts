import type { BackgroundCategory, Classes, Feats, Races, Subclasses, WeaponCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type {
  AbilityCode,
  Multiclass2024Fixture,
  MulticlassLevelUpPick,
  NamedPick,
  PactSlots,
} from "../fixtures/2024-multiclass";
import { calculateCasterLevel } from "@/lib/logic/spell-logic";
import { getSpellcastingCountsLines } from "@/lib/logic/spellcasting-progression";
import type { PersWithRelations } from "@/lib/actions/pers";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { getPactMagicSlots, getStandardSpellSlots } from "@/rules/spellcasting";
import { calculateProficiencyBonus } from "@/rules/proficiency";
import { findSpecialFacilityLimit } from "@/rules/bastions";
import { loadPersSpellSources } from "@/server/db/spell-sources";
import { findMaxPreparableSpellLevelByClass } from "@/rules/spell-preparation-2024";
import { findAttacksPerAction } from "@/rules/attacks-per-action";
import { findPersWeaponMasteryOffer } from "@/server/db/weapon-mastery";
import { minimalForm } from "./build-form";
import { minimalLevelUpForm } from "./levelup-form";

/**
 * Мов Origin 2024 дає дві на вибір гравця; десятка O18 бере ту саму пару, і пʼятнадцятка теж —
 * критерій має міряти шлях «форма → серверна дія → персонаж», а не збіг із правилом.
 */
export const ORIGIN_LANGUAGE_PICKS = ["DWARVISH", "ELVISH"] as const;

/** Пропозиція сервера на одному кроці підвищення: чи цей рівень класу дає підвищення характеристик. */
export type LevelUpOffer = {
  className: string;
  classLevel: number;
  isAbilityScoreLevel: boolean;
};

export type Multiclass2024Snapshot = {
  characterLevel: number;
  ruleset: string;
  abilityScores: Record<AbilityCode, number>;
  startingClass: string;
  classLevels: Record<string, number>;
  subclassByClass: Record<string, string | null>;
  /** Мультимножина: повторювана риса має стояти двічі. Сортована, щоб порівняння не залежало від порядку. */
  featNames: string[];
  featChoiceLabels: string[];
  magicInitiateLists: string[];
  featureNames: string[];
  speciesChoiceLabels: string[];
  skills: Array<{ name: string; proficiencyType: string }>;
  proficiencyBonus: number;
  customProficiencies: string;
  hitDiceByType: Record<string, number>;
  casterLevel: number;
  pactLevel: number;
  maxSpellSlots: number[];
  maxSpellSlotLevel: number;
  pactSlots: PactSlots | null;
  spellSources: Array<{ key: string; ability: string | null; kind: string }>;
  spellRows: Array<{ engName: string; origin: string; sourceName: string | null; isPrepared: boolean }>;
  spellNames: string[];
  /** Класи, для яких застосунок малює власний рядок підготовки заклинань. */
  preparedSpellLineKeys: string[];
  spellbookNoteKeys: string[];
  maxPreparableSpellLevelByClass: Record<string, number> | null;
  attacksPerAction: number | null;
  baseArmorClassFormulas: { offered: number; active: number };
  weaponMastery: { capacity: number; weapons: string[] };
  bastionFacilityLimit: number;
};

export type Built2024MulticlassCharacter = {
  fixture: Multiclass2024Fixture;
  persId: number | null;
  creationError: string | null;
  levelUpErrors: string[];
  offers: LevelUpOffer[];
  atLevel1: Multiclass2024Snapshot | null;
  atFinalLevel: Multiclass2024Snapshot | null;
};

type CharacterActions = {
  createCharacter: (input: PersFormData) => Promise<{ persId?: number; error?: string; details?: unknown }>;
  levelUpCharacter: (persId: number, input: unknown) => Promise<{ error?: string } | void>;
  getLevelUpInfo: (persId: number) => Promise<{ isASILevel?: boolean; error?: string } | Record<string, unknown>>;
};

/**
 * Прогін мультикласової фікстури крізь той самий шлях, яким ходить застосунок: серверна дія
 * створення, потім стільки підвищень рівня, скільки просить фікстура — до девʼятнадцяти. Помилки
 * не кидаються, а накопичуються: тест приймання має показати, який критерій упав, а не померти
 * на першому персонажі.
 */
export async function build2024MulticlassCharacter(
  fixture: Multiclass2024Fixture,
  actions: CharacterActions,
): Promise<Built2024MulticlassCharacter> {
  const form = await buildCreationForm(fixture);
  const created = await actions.createCharacter(form);

  if (!created.persId) {
    return {
      fixture,
      persId: null,
      creationError: `${created.error ?? "невідома помилка"} — ${JSON.stringify(created.details ?? null)}`,
      levelUpErrors: [],
      offers: [],
      atLevel1: null,
      atFinalLevel: null,
    };
  }

  const persId = created.persId;

  try {
    const atLevel1 = await readMulticlassSnapshot(persId);
    const { errors, offers } = await raiseThroughEveryClass(fixture, persId, actions);
    const atFinalLevel = await readMulticlassSnapshot(persId);

    return { fixture, persId, creationError: null, levelUpErrors: errors, offers, atLevel1, atFinalLevel };
  } catch (failure) {
    // Кидок тут поклав би весь файл на етапі `beforeAll`, і жоден із 27 критеріїв не був би
    // виміряний — а КR просить, щоб помилки накопичувалися. Тому виняток стає рядком у
    // `levelUpErrors`, і М27 покаже, який саме персонаж не доїхав.
    return {
      fixture,
      persId,
      creationError: null,
      levelUpErrors: [`прогін обірвався: ${failure instanceof Error ? failure.message : String(failure)}`],
      offers: [],
      atLevel1: null,
      atFinalLevel: null,
    };
  }
}

async function buildCreationForm(fixture: Multiclass2024Fixture): Promise<PersFormData> {
  const { input } = fixture;
  const [race, startingClass, background] = await Promise.all([
    findRace2024(input.species),
    findClass2024(input.startingClass),
    findBackground2024(input.background),
  ]);
  const originFeat = await findFeat2024(input.originFeat);
  const speciesFeat = await findSpeciesFeat2024(input.speciesChoices);

  return minimalForm({
    name: fixture.title,
    raceId: race.raceId,
    classId: startingClass.classId,
    backgroundId: background.backgroundId,
    ruleset: "RULES_2024",
    asiSystem: "CUSTOM",
    customAsi: toCustomAsiEntries(input.baseAbilityScores),
    asi: [],
    backgroundFeatChoiceSelections: await buildFeatChoiceSelections(originFeat.featId, input.originFeatChoices),
    speciesFeatChoiceSelections: speciesFeat ? await buildFeatChoiceSelections(speciesFeat.featId, input.speciesFeatChoices) : {},
    classChoiceSelections: await buildClassChoiceSelections(startingClass.classId, 1, input.classChoices),
    raceChoiceSelections: await buildRaceChoiceSelections(race.raceId, input.speciesChoices),
    backgroundAsiChoice: input.backgroundAsi as PersFormData["backgroundAsiChoice"],
    languagesSchema: { languages: [...ORIGIN_LANGUAGE_PICKS] },
    expertiseSchema: { expertises: input.expertise ?? [] },
    skills: input.classSkills ?? [],
    weaponMasteryWeaponIds: await findWeaponIds2024(input.weaponMastery),
  });
}

/**
 * Рівень класу ніде у фікстурі не записаний — він виводиться з порядку кроків, щоб число не
 * могло розійтися з послідовністю. Саме він, а не рівень персонажа, вибирає класові опції,
 * підклас і рису.
 */
async function raiseThroughEveryClass(
  fixture: Multiclass2024Fixture,
  persId: number,
  actions: CharacterActions,
): Promise<{ errors: string[]; offers: LevelUpOffer[] }> {
  const errors: string[] = [];
  const offers: LevelUpOffer[] = [];
  const classLevels = new Map<string, number>([[fixture.input.startingClass, 1]]);

  for (const step of fixture.input.levelUps) {
    const classLevel = step.isNewClass ? 1 : (classLevels.get(step.class) ?? 0) + 1;
    classLevels.set(step.class, classLevel);

    const offer = await readAbilityScoreOffer(persId, fixture.input.startingClass, step, classLevel, actions);
    if (offer) offers.push(offer);

    const form = await buildMulticlassLevelUpForm(step, classLevel);
    const result = await actions.levelUpCharacter(persId, form);
    if (result && "error" in result && result.error) {
      errors.push(`рівень ${step.characterLevel} (${step.class} ${classLevel}): ${result.error}`);
    }
  }

  return { errors, offers };
}

/**
 * `getLevelUpInfo` рахує `isASILevel` за рівнем ПОЧАТКОВОГО класу — так само, як його читає
 * майстер підвищення. Тому пропозиція знімається лише на кроках цього класу; для побічних вона
 * говорила б про чужий лічильник і нічого не міряла б.
 */
async function readAbilityScoreOffer(
  persId: number,
  startingClass: string,
  step: MulticlassLevelUpPick,
  classLevel: number,
  actions: CharacterActions,
): Promise<LevelUpOffer | null> {
  if (step.class !== startingClass || step.isNewClass) return null;

  const info = await actions.getLevelUpInfo(persId);
  if (!info || "error" in info) return null;

  return { className: step.class, classLevel, isAbilityScoreLevel: Boolean(info.isASILevel) };
}

async function buildMulticlassLevelUpForm(step: MulticlassLevelUpPick, classLevel: number) {
  const characterClass = await findClass2024(step.class);
  const subclass = step.subclass ? await findSubclass2024(characterClass.classId, step.subclass) : null;
  const feat = step.feat ? await findFeat2024(step.feat) : null;
  const featPicks = [
    ...(step.featAbility ? [{ choice: "Характеристика", option: step.featAbility }] : []),
    ...(step.featChoices ?? []),
  ];

  return minimalLevelUpForm({
    levelUpPath: step.isNewClass ? "MULTICLASS" : "EXISTING",
    classId: characterClass.classId,
    ...(subclass ? { subclassId: subclass.subclassId } : {}),
    ...(feat ? { featId: feat.featId } : {}),
    featChoiceSelections: feat ? await buildFeatChoiceSelections(feat.featId, featPicks) : {},
    classChoiceSelections: await buildClassChoiceSelections(characterClass.classId, classLevel, step.classChoices),
    subclassChoiceSelections: subclass
      ? await buildSubclassChoiceSelections(subclass.subclassId, classLevel, step.subclassChoices)
      : {},
    levelUpSkillSelections: await buildFeatureSkillSelections(step.skillChoices),
    customAsi: step.asi ?? [],
    expertiseSchema: { expertises: step.expertise ?? [] },
    ...(step.weaponMastery ? { weaponMasteryWeaponIds: await findWeaponIds2024(step.weaponMastery) } : {}),
    featSpellIds: await findSpellIds2024(step.featSpells),
  });
}

/**
 * Вибори всередині підкласу (маневри Майстра бою, Здобич мисливця) приходять тим самим кроком,
 * що й сам підклас, тому харнес бере їх із рядків підкласу на цьому рівні класу.
 */
async function buildSubclassChoiceSelections(
  subclassId: number,
  levelGranted: number,
  picks: NamedPick[] | undefined,
): Promise<Record<string, number | number[]>> {
  if (!picks?.length) return {};

  const available = await prisma.subclassChoiceOption.findMany({
    where: { subclassId, levelsGranted: { has: levelGranted } },
    select: { choiceOptionId: true, choiceOption: { select: { groupName: true, optionNameEng: true } } },
  });

  return groupSelectionsByChoiceGroup(
    picks.map((pick) => findMatchingOption(available, pick, `підкласу ${subclassId} на рівні ${levelGranted}`)),
  );
}

/** Навички, які дає сама риса (Первісне знання варвара), сервер чекає під ключем її featureId. */
async function buildFeatureSkillSelections(
  picks: Array<{ feature: string; skills: string[] }> | undefined,
): Promise<Record<string, string[]>> {
  if (!picks?.length) return {};

  const entries = await Promise.all(picks.map(async ({ feature, skills }) => {
    const row = await prisma.feature.findFirstOrThrow({
      where: { engName: feature, ruleset: "RULES_2024" },
      select: { featureId: true },
    });
    return [String(row.featureId), skills] as const;
  }));

  return Object.fromEntries(entries);
}

/**
 * Фікстура називає опцію так, як її подає референс («Defense», «ARCANA», «Cleric»), а в базі
 * `optionNameEng` несе ще й редакцію — «Fighting Style 2024 (Defense)». Ключ вибору — реальна
 * назва групи з бази: саме її чекає серверна дія.
 */
async function buildFeatChoiceSelections(
  featId: number,
  picks: NamedPick[] | undefined,
): Promise<Record<string, number | number[]>> {
  if (!picks?.length) return {};

  const available = await prisma.featChoiceOption.findMany({
    where: { featId },
    select: { choiceOptionId: true, choiceOption: { select: { groupName: true, optionNameEng: true } } },
  });

  return groupSelectionsByChoiceGroup(picks.map((pick) => findMatchingOption(available, pick, `риси ${featId}`)));
}

/** «Риса походження: Skilled» у виборах виду називає рису її англійською назвою. */
async function findSpeciesFeat2024(speciesChoices: NamedPick[]): Promise<{ featId: number } | null> {
  const pick = speciesChoices.find((choice) => choice.choice === "Риса походження");
  if (!pick) return null;
  return prisma.feat.findFirstOrThrow({ where: { ruleset: "RULES_2024", engName: pick.option }, select: { featId: true } });
}

async function buildRaceChoiceSelections(
  raceId: number,
  picks: NamedPick[] | undefined,
): Promise<Record<string, number>> {
  if (!picks?.length) return {};

  const available = await prisma.raceChoiceOption.findMany({
    where: { raceId, ruleset: "RULES_2024" },
    select: { optionId: true, choiceGroupName: true, optionNameEng: true },
  });

  return Object.fromEntries(
    picks.map((pick) => {
      const matched = available.find((candidate) => candidate.optionNameEng === pick.option);
      if (!matched) throw new Error(`Опції "${pick.option}" (${pick.choice}) немає серед виборів виду ${raceId}`);
      return [matched.choiceGroupName, matched.optionId];
    }),
  );
}

async function buildClassChoiceSelections(
  classId: number,
  classLevel: number,
  picks: NamedPick[] | undefined,
): Promise<Record<string, number | number[]>> {
  if (!picks?.length) return {};

  const available = await prisma.classChoiceOption.findMany({
    where: { classId, levelsGranted: { has: classLevel } },
    select: { choiceOptionId: true, choiceOption: { select: { groupName: true, optionNameEng: true } } },
  });

  return groupSelectionsByChoiceGroup(
    picks.map((pick) => findMatchingOption(available, pick, `класу ${classId} на рівні класу ${classLevel}`)),
  );
}

type AvailableChoiceOption = {
  choiceOptionId: number;
  choiceOption: { groupName: string; optionNameEng: string } | null;
};

function findMatchingOption(available: AvailableChoiceOption[], pick: NamedPick, source: string) {
  const matched = available.find(
    (candidate) =>
      candidate.choiceOption?.optionNameEng === pick.option ||
      candidate.choiceOption?.optionNameEng.replace(/ \((?:2014|2024)\)$/, "") === pick.option ||
      candidate.choiceOption?.optionNameEng.endsWith(`(${pick.option})`),
  );
  if (!matched?.choiceOption) throw new Error(`Опції "${pick.option}" (${pick.choice}) немає серед виборів ${source}`);
  return { groupName: matched.choiceOption.groupName, choiceOptionId: matched.choiceOptionId };
}

function groupSelectionsByChoiceGroup(
  matched: Array<{ groupName: string; choiceOptionId: number }>,
): Record<string, number | number[]> {
  const byGroup = new Map<string, number[]>();
  for (const { groupName, choiceOptionId } of matched) {
    byGroup.set(groupName, [...(byGroup.get(groupName) ?? []), choiceOptionId]);
  }

  return Object.fromEntries(
    Array.from(byGroup, ([groupName, ids]) => [groupName, ids.length === 1 ? ids[0] : ids]),
  );
}

function toCustomAsiEntries(scores: Record<AbilityCode, number>) {
  return Object.entries(scores).map(([ability, value]) => ({ ability, value: String(value) }));
}

export async function readMulticlassSnapshot(persId: number): Promise<Multiclass2024Snapshot> {
  const pers = await prisma.pers.findUniqueOrThrow({
    where: { persId },
    include: {
      class: { select: { name: true, hitDie: true, spellcastingType: true, primaryCastingStat: true } },
      subclass: { select: { name: true, spellcastingType: true, primaryCastingStat: true } },
      multiclasses: {
        include: {
          class: { select: { name: true, hitDie: true, spellcastingType: true, primaryCastingStat: true } },
          subclass: { select: { name: true, spellcastingType: true, primaryCastingStat: true } },
        },
      },
      features: { include: { feature: { select: { engName: true } } } },
      feats: {
        include: {
          feat: { select: { name: true } },
          choices: { select: { choiceOption: { select: { optionNameEng: true, groupName: true } } } },
        },
      },
      raceChoiceOptions: { select: { choiceGroupName: true, optionName: true, optionNameEng: true } },
      skills: { select: { name: true, proficiencyType: true } },
      armors: { select: { equipped: true, armor: { select: { name: true } } } },
      persSpells: {
        select: { origin: true, sourceName: true, isPrepared: true, spell: { select: { engName: true } } },
      },
    },
  });

  const classLevels = buildClassLevels(pers);
  const subclassByClass: Record<string, string | null> = {
    [pers.class.name]: pers.subclass?.name ?? null,
    ...Object.fromEntries(pers.multiclasses.map((entry) => [entry.class.name, entry.subclass?.name ?? null])),
  };
  const { casterLevel, pactLevel } = calculateCasterLevel(pers);
  const maxSpellSlots = getStandardSpellSlots(casterLevel, SPELL_SLOT_PROGRESSION.FULL);
  // Функція читає лише рівні, класи й характеристики — саме те, що вибрав запит вище;
  // повний `PersWithRelations` їй не потрібен, але тип у неї один на застосунок.
  const countsLines = getSpellcastingCountsLines(pers as unknown as PersWithRelations);
  const masteryOffer = await findPersWeaponMasteryOffer(prisma, persId);

  return {
    characterLevel: pers.level,
    ruleset: pers.ruleset,
    abilityScores: { STR: pers.str, DEX: pers.dex, CON: pers.con, INT: pers.int, WIS: pers.wis, CHA: pers.cha },
    startingClass: pers.class.name,
    classLevels,
    subclassByClass,
    featNames: pers.feats.map((entry) => entry.feat.name).sort(),
    featChoiceLabels: pers.feats
      .flatMap((entry) => entry.choices.map((choice) => choice.choiceOption?.optionNameEng ?? ""))
      .filter(Boolean)
      .sort(),
    magicInitiateLists: readMagicInitiateLists(pers.feats),
    featureNames: pers.features.map((entry) => entry.feature.engName).sort(),
    speciesChoiceLabels: pers.raceChoiceOptions
      .map((option) => `${option.choiceGroupName}:${option.optionNameEng ?? option.optionName}`)
      .sort(),
    skills: pers.skills.map((skill) => ({ name: skill.name, proficiencyType: skill.proficiencyType })),
    proficiencyBonus: calculateProficiencyBonus(pers.level),
    customProficiencies: pers.customProficiencies,
    hitDiceByType: buildHitDiceByType(pers, classLevels),
    casterLevel,
    pactLevel,
    maxSpellSlots,
    maxSpellSlotLevel: maxSpellSlots.filter((slots) => slots > 0).length,
    pactSlots: pactLevel > 0 ? getPactMagicSlots(pactLevel, SPELL_SLOT_PROGRESSION.PACT) : null,
    spellSources: (await loadPersSpellSources(persId)).map((source) => ({
      key: source.key,
      ability: source.ability,
      kind: source.kind,
    })),
    spellRows: pers.persSpells.map((entry) => ({
      engName: entry.spell.engName,
      origin: entry.origin,
      sourceName: entry.sourceName,
      isPrepared: entry.isPrepared,
    })),
    spellNames: pers.persSpells.map((entry) => entry.spell.engName).sort(),
    preparedSpellLineKeys: countsLines.map((line) => line.key),
    spellbookNoteKeys: countsLines.filter((line) => line.spellsNote).map((line) => line.key),
    maxPreparableSpellLevelByClass: findMaxPreparableSpellLevelByClass(classLevels, subclassByClass),
    attacksPerAction: findAttacksPerAction(pers.ruleset, pers.features.map((entry) => entry.feature.engName)),
    baseArmorClassFormulas: {
      offered: pers.armors.length,
      active: pers.armors.filter((row) => row.equipped).length,
    },
    weaponMastery: {
      capacity: masteryOffer.capacity,
      weapons: masteryOffer.selectedWeaponIds.length
        ? masteryOffer.options
            .filter((weapon) => masteryOffer.selectedWeaponIds.includes(weapon.weaponId))
            .map((weapon) => weapon.name)
        : [],
    },
    bastionFacilityLimit: findSpecialFacilityLimit(pers.level),
  };
}

type SnapshotPers = {
  level: number;
  class: { name: string; hitDie: number };
  multiclasses: Array<{ classLevel: number; class: { name: string; hitDie: number } }>;
};

function buildClassLevels(pers: SnapshotPers): Record<string, number> {
  const takenByMulticlasses = pers.multiclasses.reduce((total, entry) => total + entry.classLevel, 0);

  return {
    [pers.class.name]: Math.max(1, pers.level - takenByMulticlasses),
    ...Object.fromEntries(pers.multiclasses.map((entry) => [entry.class.name, entry.classLevel])),
  };
}

function buildHitDiceByType(pers: SnapshotPers, classLevels: Record<string, number>): Record<string, number> {
  const dieByClass = new Map<string, number>([
    [pers.class.name, pers.class.hitDie],
    ...pers.multiclasses.map((entry) => [entry.class.name, entry.class.hitDie] as const),
  ]);

  const byDie: Record<string, number> = {};
  for (const [className, classLevel] of Object.entries(classLevels)) {
    const die = `d${dieByClass.get(className)}`;
    byDie[die] = (byDie[die] ?? 0) + classLevel;
  }

  return byDie;
}

type PersFeatRow = {
  feat: { name: string };
  choices: Array<{ choiceOption: { optionNameEng: string; groupName: string } | null }>;
};

/** «Посвячений у магію» законний удруге лише з іншим списком — тому список, а не назва риси. */
function readMagicInitiateLists(feats: PersFeatRow[]): string[] {
  return feats
    .filter((entry) => entry.feat.name === "MAGIC_INITIATE")
    .flatMap((entry) => entry.choices.map((choice) => choice.choiceOption?.optionNameEng ?? ""))
    .map((label) => label.match(/\(([^)]+)\)\s*$/)?.[1] ?? label)
    .filter(Boolean)
    .sort();
}

/** Заклинання, яке гравець обирає в рисі (Доторк феї), фікстура називає англійською назвою. */
async function findSpellIds2024(engNames: string[] | undefined): Promise<number[]> {
  if (!engNames?.length) return [];

  const spells = await prisma.spell.findMany({
    where: { ruleset: "RULES_2024", engName: { in: engNames } },
    select: { spellId: true, engName: true },
  });

  return engNames.map((engName) => {
    const matched = spells.find((spell) => spell.engName === engName);
    if (!matched) throw new Error(`Заклинання "${engName}" немає серед заклинань 2024`);
    return matched.spellId;
  });
}

async function findWeaponIds2024(engNames: string[] | undefined): Promise<number[]> {
  if (!engNames?.length) return [];

  const codes = engNames.map(toWeaponCode);
  const weapons = await prisma.weapon.findMany({
    where: { ruleset: "RULES_2024", name: { in: codes as WeaponCategory[] } },
    select: { weaponId: true, name: true },
  });

  return codes.map((code) => {
    const matched = weapons.find((weapon) => weapon.name === code);
    if (!matched) throw new Error(`Зброї "${code}" немає серед каталогу 2024`);
    return matched.weaponId;
  });
}

export const toWeaponCode = (engName: string) =>
  engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");

export const findRace2024 = (name: string) =>
  prisma.race.findFirstOrThrow({ where: { name: name as Races, ruleset: "RULES_2024" } });

export const findClass2024 = (name: string) =>
  prisma.class.findFirstOrThrow({ where: { name: name as Classes, ruleset: "RULES_2024" } });

export const findBackground2024 = (name: string) =>
  prisma.background.findFirstOrThrow({ where: { name: name as BackgroundCategory, ruleset: "RULES_2024" } });

export const findFeat2024 = (name: string) =>
  prisma.feat.findFirstOrThrow({ where: { name: name as Feats, ruleset: "RULES_2024" } });

export const findSubclass2024 = (classId: number, name: string) =>
  prisma.subclass.findFirstOrThrow({ where: { classId, name: name as Subclasses } });
