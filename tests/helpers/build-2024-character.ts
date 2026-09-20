import type { BackgroundCategory, Classes, Feats, Races, Subclasses, WeaponCategory } from "@prisma/client";
import { withCreationSpells, withLevelUpSpells } from "./creation-spells";
import { prisma } from "@/lib/prisma";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type {
  Acceptance2024Fixture,
  AbilityCode,
  LevelUpPick,
  NamedPick,
} from "../fixtures/2024-acceptance";
import { loadPersSpellSources } from "@/server/db/spell-sources";
import { findPersWeaponMasteryOffer } from "@/server/db/weapon-mastery";
import { minimalForm } from "./build-form";
import { minimalLevelUpForm } from "./levelup-form";

/**
 * Референс §15 мов не називає — Origin 2024 дає дві на вибір гравця. Фікстури беруть однакову
 * пару, щоб критерій міряв шлях «форма → серверна дія → персонаж», а не збіг із правилом.
 */
export const ORIGIN_LANGUAGE_PICKS = ["DWARVISH", "ELVISH"] as const;

export type Acceptance2024Snapshot = {
  level: number;
  ruleset: string;
  abilityScores: Record<AbilityCode, number>;
  maxHp: number;
  species: string;
  className: string;
  subclass: string | null;
  background: string;
  featureNames: string[];
  featNames: string[];
  speciesChoiceLabels: string[];
  skills: Array<{ name: string; proficiencyType: string }>;
  spellNames: string[];
  grantedSpells: Array<{ engName: string; sourceName: string | null; origin: string; isPrepared: boolean }>;
  spellSources: Array<{ key: string; ability: string | null; kind: string }>;
  customLanguages: string;
  customEquipment: string;
  gold: number;
  weaponMastery: { capacity: number; weapons: string[] };
};

export type Built2024Character = {
  fixture: Acceptance2024Fixture;
  persId: number | null;
  creationError: string | null;
  levelUpErrors: string[];
  atLevel1: Acceptance2024Snapshot | null;
  atLevel5: Acceptance2024Snapshot | null;
};

type CharacterActions = {
  createCharacter: (input: PersFormData) => Promise<{ persId?: number; error?: string; details?: unknown }>;
  levelUpCharacter: (persId: number, input: unknown) => Promise<{ error?: string } | void>;
};

/**
 * Прогін фікстури §15 крізь той самий шлях, яким ходить застосунок: серверна дія створення,
 * потім чотири підвищення рівня. Помилки не кидаються — вони накопичуються у результаті, щоб
 * тест приймання показав, який саме критерій упав, а не помер на першому ж персонажі.
 */
export async function build2024Character(
  fixture: Acceptance2024Fixture,
  actions: CharacterActions,
): Promise<Built2024Character> {
  const form = await buildCreationForm(fixture);
  const created = await actions.createCharacter(form);

  if (!created.persId) {
    return {
      fixture,
      persId: null,
      creationError: `${created.error ?? "невідома помилка"} — ${JSON.stringify(created.details ?? null)}`,
      levelUpErrors: [],
      atLevel1: null,
      atLevel5: null,
    };
  }

  const persId = created.persId;
  const atLevel1 = await readAcceptanceSnapshot(persId);
  const levelUpErrors = await raiseToFifthLevel(fixture, persId, actions);
  const atLevel5 = await readAcceptanceSnapshot(persId);

  return { fixture, persId, creationError: null, levelUpErrors, atLevel1, atLevel5 };
}

async function buildCreationForm(fixture: Acceptance2024Fixture): Promise<PersFormData> {
  const { input } = fixture;
  const [race, characterClass, background] = await Promise.all([
    findRace2024(input.species),
    findClass2024(input.class),
    findBackground2024(input.background),
  ]);
  const speciesFeat = input.speciesFeat ? await findFeat2024(input.speciesFeat) : null;
  const originFeat = await findFeat2024(input.originFeat);

  const form = minimalForm({
    name: fixture.title,
    raceId: race.raceId,
    classId: characterClass.classId,
    backgroundId: background.backgroundId,
    ruleset: "RULES_2024",
    asiSystem: "CUSTOM",
    customAsi: toCustomAsiEntries(input.baseAbilityScores),
    asi: [],
    ...(speciesFeat ? { featId: speciesFeat.featId } : {}),
    backgroundFeatChoiceSelections: await buildFeatChoiceSelections(originFeat.featId, input.originFeatChoices),
    classChoiceSelections: await buildClassChoiceSelections(characterClass.classId, 1, input.classChoices),
    raceChoiceSelections: await buildRaceChoiceSelections(race.raceId, input.speciesChoices),
    backgroundAsiChoice: input.backgroundAsi as PersFormData["backgroundAsiChoice"],
    expertiseSchema: { expertises: input.expertise ?? [] },
    languagesSchema: { languages: [...ORIGIN_LANGUAGE_PICKS] },
    weaponMasteryWeaponIds: await findWeaponIds2024(input.weaponMastery),
    equipmentSchema: {
      choiceGroupToId: await findClassEquipmentIds2024(characterClass.classId, input.classEquipment),
      anyWeaponSelection: {},
    },
  });
  return withCreationSpells(form, input.creationSpells);
}

/**
 * Літера книги → рядки `class_starting_equipment_option`, які застосунок отримав би від кроку
 * «Спорядження». Усі рядки 2024 лежать в одній групі вибору, тож ключ завжди `1`.
 */
async function findClassEquipmentIds2024(
  classId: number,
  letter: string | undefined,
): Promise<Record<number, number[]>> {
  if (!letter) return {};

  const rows = await prisma.classStartingEquipmentOption.findMany({
    where: { classId, ruleset: "RULES_2024", option: letter },
    select: { optionId: true },
  });
  if (rows.length === 0) throw new Error(`клас ${classId}: немає рядків спорядження під літерою «${letter}»`);

  return { 1: rows.map((row) => row.optionId) };
}

async function raiseToFifthLevel(
  fixture: Acceptance2024Fixture,
  persId: number,
  actions: CharacterActions,
): Promise<string[]> {
  const errors: string[] = [];

  for (const pick of fixture.input.levelUps) {
    const result = await actions.levelUpCharacter(persId, await withLevelUpSpells(persId, await buildLevelUpForm(fixture, pick)));
    if (result && "error" in result && result.error) {
      errors.push(`рівень ${pick.level}: ${result.error}`);
    }
  }

  return errors;
}

async function buildLevelUpForm(fixture: Acceptance2024Fixture, pick: LevelUpPick) {
  const characterClass = await findClass2024(fixture.input.class);
  const subclass = pick.subclass ? await findSubclass2024(characterClass.classId, pick.subclass) : null;
  const feat = pick.feat ? await findFeat2024(pick.feat) : null;
  const featAbilityPick = pick.featAbility ? [{ choice: "Характеристика", option: pick.featAbility }] : [];

  return minimalLevelUpForm({
    classId: characterClass.classId,
    ...(subclass ? { subclassId: subclass.subclassId } : {}),
    ...(feat ? { featId: feat.featId } : {}),
    featChoiceSelections: feat ? await buildFeatChoiceSelections(feat.featId, featAbilityPick) : {},
    classChoiceSelections: await buildClassChoiceSelections(characterClass.classId, pick.level, pick.classChoices),
    subclassChoiceSelections: subclass
      ? await buildSubclassChoiceSelections(subclass.subclassId, pick.level, pick.subclassChoices)
      : {},
    levelUpSkillSelections: await buildFeatureSkillSelections(pick.skillChoices),
    customAsi: pick.asi ?? [],
    expertiseSchema: { expertises: pick.expertise ?? [] },
    ...(pick.weaponMastery ? { weaponMasteryWeaponIds: await findWeaponIds2024(pick.weaponMastery) } : {}),
  });
}

/**
 * Фікстура називає опцію так, як її видно в референсі («Defense», «ARCANA», «Druid»), а в базі
 * `optionNameEng` несе ще й редакцію — «Fighting Style 2024 (Defense)». Ключ вибору — реальна
 * назва групи з бази, бо саме її чекає серверна дія.
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

  return groupSelectionsByChoiceGroup(
    picks.map((pick) => findMatchingOption(available, pick, `риси ${featId}`)),
  );
}

/**
 * Вибори виду резолвляться по `option_name_eng` — англійському ключу, який DDL KR18.4 додав
 * саме для цього. Фікстура називає опцію так, як її подає референс: «Red», «High Elf», «INT».
 */
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
      if (!matched) {
        throw new Error(`Опції "${pick.option}" (${pick.choice}) немає серед виборів виду ${raceId}`);
      }
      return [matched.choiceGroupName, matched.optionId];
    }),
  );
}

/**
 * Вибори всередині підкласу (Здобич мисливця, маневри Майстра бою) приходять тим самим кроком,
 * що й сам підклас, тому харнес читає рядки підкласу на цьому рівні класу.
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

async function buildClassChoiceSelections(
  classId: number,
  levelGranted: number,
  picks: NamedPick[] | undefined,
): Promise<Record<string, number | number[]>> {
  if (!picks?.length) return {};

  const available = await prisma.classChoiceOption.findMany({
    where: { classId, levelsGranted: { has: levelGranted } },
    select: { choiceOptionId: true, choiceOption: { select: { groupName: true, optionNameEng: true } } },
  });

  return groupSelectionsByChoiceGroup(
    picks.map((pick) => findMatchingOption(available, pick, `класу ${classId} на рівні ${levelGranted}`)),
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
  if (!matched?.choiceOption) {
    throw new Error(`Опції "${pick.option}" (${pick.choice}) немає серед виборів ${source}`);
  }
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

async function readAcceptanceSnapshot(persId: number): Promise<Acceptance2024Snapshot> {
  const featNamedSpellIds = await findFeatNamedSpellIds(persId);
  const pers = await prisma.pers.findUniqueOrThrow({
    where: { persId },
    include: {
      race: { select: { name: true } },
      class: { select: { name: true } },
      subclass: { select: { name: true } },
      background: { select: { name: true } },
      features: { include: { feature: { select: { engName: true } } } },
      feats: { include: { feat: { select: { name: true } } } },
      raceChoiceOptions: { select: { choiceGroupName: true, optionName: true } },
      skills: { select: { name: true, proficiencyType: true } },
      persSpells: {
        select: { origin: true, sourceName: true, isPrepared: true, excludeFromPreparedCount: true, spellId: true, spell: { select: { engName: true } } },
      },
      pers_weapon_mastery: {
        select: { weapon: { select: { name: true } } },
        orderBy: { pers_weapon_mastery_id: "asc" },
      },
    },
  });
  const masteryOffer = await findPersWeaponMasteryOffer(prisma, persId);

  return {
    level: pers.level,
    ruleset: pers.ruleset,
    abilityScores: { STR: pers.str, DEX: pers.dex, CON: pers.con, INT: pers.int, WIS: pers.wis, CHA: pers.cha },
    maxHp: pers.maxHp,
    species: pers.race.name,
    className: pers.class.name,
    subclass: pers.subclass?.name ?? null,
    background: pers.background.name,
    featureNames: pers.features.map((entry) => entry.feature.engName).sort(),
    featNames: pers.feats.map((entry) => entry.feat.name).sort(),
    speciesChoiceLabels: pers.raceChoiceOptions
      .map((option) => `${option.choiceGroupName}:${option.optionName}`)
      .sort(),
    skills: pers.skills.map((skill) => ({ name: skill.name, proficiencyType: skill.proficiencyType })),
    spellNames: pers.persSpells.map((entry) => entry.spell.engName).sort(),
    // Заклинання, які гравець обрав кроком «Заклинання» чи «Заклинання риси», дарованими правилом не є.
    grantedSpells: pers.persSpells.filter((entry) => isGrantedByRule(entry, featNamedSpellIds)).map((entry) => ({
      engName: entry.spell.engName,
      sourceName: entry.sourceName,
      origin: entry.origin,
      isPrepared: entry.isPrepared,
    })),
    spellSources: (await loadPersSpellSources(persId)).map((source) => ({
      key: source.key,
      ability: source.ability,
      kind: source.kind,
    })),
    customLanguages: pers.customLanguagesKnown,
    customEquipment: pers.customEquipment,
    gold: Number(pers.gp ?? 0),
    weaponMastery: {
      capacity: masteryOffer.capacity,
      weapons: pers.pers_weapon_mastery.map((entry) => entry.weapon.name),
    },
  };
}

/**
 * Фікстура називає зброю так, як її подає книга («Greatsword»), а серверна дія чекає id рядка.
 * `weapon.name` — enum-код, у який ту саму назву переводить сід.
 */
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

const toWeaponCode = (engName: string) =>
  engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const findRace2024 = (name: string) =>
  prisma.race.findFirstOrThrow({ where: { name: name as Races, ruleset: "RULES_2024" } });

const findClass2024 = (name: string) =>
  prisma.class.findFirstOrThrow({ where: { name: name as Classes, ruleset: "RULES_2024" } });

const findBackground2024 = (name: string) =>
  prisma.background.findFirstOrThrow({ where: { name: name as BackgroundCategory, ruleset: "RULES_2024" } });

const findFeat2024 = (name: string) =>
  prisma.feat.findFirstOrThrow({ where: { name: name as Feats, ruleset: "RULES_2024" } });

const findSubclass2024 = (classId: number, name: string) =>
  prisma.subclass.findFirstOrThrow({ where: { classId, name: name as Subclasses } });

async function findFeatNamedSpellIds(persId: number): Promise<Set<number>> {
  const feats = await prisma.persFeat.findMany({
    where: { persId },
    select: { feat: { select: { grantsFeature: { select: { givesSpells: { select: { spellId: true } } } } } } },
  });
  return new Set(feats.flatMap((row) => row.feat.grantsFeature.flatMap((feature) => feature.givesSpells.map((spell) => spell.spellId))));
}

function isGrantedByRule(entry: { origin: string; excludeFromPreparedCount: boolean; spellId: number }, featNamedSpellIds: Set<number>): boolean {
  if (entry.origin === "CLASS") return entry.excludeFromPreparedCount;
  if (entry.origin === "FEAT") return featNamedSpellIds.has(entry.spellId);
  return true;
}
