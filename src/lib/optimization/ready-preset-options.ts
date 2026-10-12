import type { CreatorContent } from "@/server/db/creator-content-query";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { Language } from "@/lib/prisma-enums";
import { countOriginLanguageChoices, listChoosableLanguages } from "@/rules/languages";
import { countBackgroundLanguageChoices } from "@/rules/background-customization";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { buildEquipmentLines } from "@/lib/components/characterCreator/equipment-choices";
import { getAllSpells } from "@/lib/spellsData";
import { buildPresetSpellOptions } from "./ready-preset-spells";
import { buildPresetAbilitySources } from "./ready-preset-abilities";
import { countChoiceOptionEffects, groupPickableOptions, listChosenFirstLevelOptionFeatures, listFirstLevelClassOptions, listFirstLevelSubclassOptions, listRaceChoiceOptions } from "./ready-preset-identity";
import { buildSkillSources, type ReadyPresetSkillSources } from "./ready-preset-skill-sources";

export type { ReadyPresetSkillSources };
export type ReadyEquipmentChoice = {
  option: string; optionIds: number[]; label: string; weaponCount: number;
  weapons: { id: number; name: string; label: string }[];
};
export type ReadyEquipmentGroup = { group: string; label: string; choices: ReadyEquipmentChoice[] };

export function buildReadyPresetOptions(draft: Partial<PersFormData>, content: CreatorContent) {
  const characterClass = content.classes.find((entry) => entry.classId === draft.classId)!;
  const race = content.races.find((entry) => entry.raceId === draft.raceId)!;
  const variant = race.raceVariants.find((entry) => entry.raceVariantId === draft.raceVariantId);
  const subrace = race.subraces.find((entry) => entry.subraceId === draft.subraceId);
  const background = content.backgrounds.find((entry) => entry.backgroundId === draft.backgroundId)!;
  const chosenSubclass = characterClass.subclasses.find((entry) => entry.subclassId === draft.subclassId);
  const chosenOptionFeatures = listChosenFirstLevelOptionFeatures(characterClass, chosenSubclass, draft);
  const chosenOptionEffects = countChoiceOptionEffects(chosenOptionFeatures);
  const featureLanguages = [...characterClass.features.map((entry) => entry.feature), ...chosenOptionFeatures.map((entry) => entry.feature)].flatMap((feature) => feature.givesLanguages);
  const knownLanguages = [...new Set([...race.languages, ...characterClass.languages, ...featureLanguages, ...(subrace?.additionalLanguages ?? [])])];
  return {
    className: characterClass.name,
    choiceGroups: {
      classOptions: groupPickableOptions(listFirstLevelClassOptions(characterClass)),
      subclassOptions: groupPickableOptions(chosenSubclass ? listFirstLevelSubclassOptions(chosenSubclass) : []),
      raceOptions: groupPickableOptions(listRaceChoiceOptions(race, draft.subraceId)),
    },
    choiceRows: {
      classOptions: characterClass.classChoiceOptions.filter(isFirstLevelRow),
      subclassOptions: chosenSubclass?.subclassChoiceOptions.filter(isFirstLevelRow) ?? [],
    },
    abilitySources: buildPresetAbilitySources(draft, content),
    skills: buildSkillSources({ characterClass, race, variant, subrace, background, raceChoices: findChosenRaceOptions(race, draft), subclass: chosenSubclass, draft }),
    expertiseCount: characterClass.features.reduce((count, entry) => count + readExpertiseCount(entry.feature.skillExpertises), 0) + chosenOptionEffects.expertise,
    languageCount: countOriginLanguageChoices("RULES_2014", [race.languagesToChooseCount, subrace?.languagesToChooseCount, characterClass.languagesToChooseCount, countBackgroundLanguages(background, draft)],
      [...listFirstLevelFeatureLanguageCounts(characterClass, chosenSubclass), chosenOptionEffects.languages]),
    knownLanguages, languages: listChoosableLanguages("RULES_2014", Object.values(Language), knownLanguages),
    equipmentGroups: buildEquipmentGroups(characterClass.startingEquipmentOption, content.weapons),
    spells: buildPresetSpellOptions(characterClass.name, { race: race.name, subrace: subrace?.name ?? null, chosenRaceOptionNames: findChosenRaceOptionNames(race, draft) }, getAllSpells("RULES_2014").map((spell) => ({
      spellId: spell.spellId, name: spell.name, engName: spell.engName, level: spell.level, school: spell.school,
      ruleset: "RULES_2014", spellLists: spell.spellClasses.map((entry) => entry.className), isRitual: spell.hasRitual === "так",
    })), chosenSubclass?.name ?? null, content.feats.find((entry) => entry.featId === draft.featId)?.name ?? null),
  };
}
export type ReadyPresetOptions = ReturnType<typeof buildReadyPresetOptions>;

const isFirstLevelRow = (row: { levelsGranted: number[] }) => row.levelsGranted.includes(1);

function countBackgroundLanguages(background: CreatorContent["backgrounds"][number], draft: Partial<PersFormData>): number {
  const fixedTools = Array.isArray(background.toolProficiencies) ? background.toolProficiencies.map(String) : [];
  return countBackgroundLanguageChoices({ name: background.name, fixedTools, languageChoiceCount: background.languagesToChooseCount ?? 0 }, draft.backgroundCustomization);
}

function listFirstLevelFeatureLanguageCounts(characterClass: CreatorContent["classes"][number], subclass: CreatorContent["classes"][number]["subclasses"][number] | undefined): number[] {
  const features = [...characterClass.features, ...(subclass?.features ?? [])].filter((entry) => entry.levelGranted === 1);
  return features.map((entry) => entry.feature.languagesToChooseCount);
}

function findChosenRaceOptions(race: CreatorContent["races"][number], draft: Partial<PersFormData>) {
  const chosenIds = Object.values(draft.raceChoiceSelections ?? {});
  return race.raceChoiceOptions.filter((option) => chosenIds.includes(option.optionId));
}

function findChosenRaceOptionNames(race: CreatorContent["races"][number], draft: Partial<PersFormData>): string[] {
  return findChosenRaceOptions(race, draft).map((option) => option.optionName);
}

function readExpertiseCount(raw: unknown): number {
  if (!raw || typeof raw !== "object" || !("count" in raw)) return 0;
  return typeof raw.count === "number" ? raw.count : 0;
}

type EquipmentRows = CreatorContent["classes"][number]["startingEquipmentOption"];

function buildEquipmentGroups(rows: EquipmentRows, weapons: CreatorContent["weapons"]): ReadyEquipmentGroup[] {
  return [...new Set(rows.map((row) => row.choiceGroup))].sort((left, right) => left - right).map((group) => {
    const grouped = rows.filter((row) => row.choiceGroup === group);
    const label = grouped.some((row) => row.equipmentPack) ? "Набір для подорожей" : grouped.some((row) => row.armor) ? "Обладунки й зброя" : "Стартова зброя";
    return { group: String(group), label, choices: [...new Set(grouped.map((row) => row.option))].sort().map((option) => buildEquipmentChoice(grouped.filter((row) => row.option === option), weapons)) };
  });
}

function isMeleeOnlyChoice(row: EquipmentRows[number]): boolean {
  return /рукопашн/i.test(row.description ?? "");
}

function buildEquipmentChoice(rows: EquipmentRows, weapons: CreatorContent["weapons"]): ReadyEquipmentChoice {
  const anyWeapon = rows.find((row) => row.chooseAnyWeapon);
  return {
    option: rows[0].option, optionIds: rows.map((row) => row.optionId),
    label: buildEquipmentLines(rows).belongings.map((line) => line.text).join(", "),
    weaponCount: anyWeapon?.weaponCount ?? 0,
    weapons: anyWeapon ? weapons.filter((weapon) => weapon.weaponType === anyWeapon.weaponType && !(isMeleeOnlyChoice(anyWeapon) && weapon.isRanged)).map((weapon) => ({ id: weapon.weaponId, name: weapon.name, label: translateValue(weapon.name) })) : [],
  };
}
