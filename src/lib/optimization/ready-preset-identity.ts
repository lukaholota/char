import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { CreatorContent } from "@/server/db/creator-content-query";
import { countExpertiseSelections, readExpertiseGrant } from "@/rules/expertise-selections";

type CreatorClass = CreatorContent["classes"][number];
type CreatorRace = CreatorContent["races"][number];
type ChoiceSelections = Record<string, number | number[]>;
type PickableOption = { group: string; name: string; label: string; id: number; skillEffect?: string };
export type ChoiceGroup = { group: string; options: { id: number; label: string }[]; isLocked?: boolean };

const FIRST_LEVEL = 1;

export function hasFirstLevelSubclass(characterClass: Pick<CreatorClass, "subclassLevel">): boolean {
  return characterClass.subclassLevel === FIRST_LEVEL;
}

export function listFirstLevelClassOptions(characterClass: CreatorClass): PickableOption[] {
  return characterClass.classChoiceOptions
    .filter((entry) => entry.levelsGranted.includes(FIRST_LEVEL))
    .map(toClassPickable);
}

function toClassPickable(entry: CreatorClass["classChoiceOptions"][number]): PickableOption {
  return { group: entry.choiceOption.groupName, name: entry.choiceOption.optionNameEng, label: entry.choiceOption.optionName, id: entry.choiceOptionId,
    skillEffect: describeChoiceOptionEffects(entry.choiceOption.features) };
}

type ChoiceOptionFeatures = CreatorClass["classChoiceOptions"][number]["choiceOption"]["features"];
type ChoiceOptionEffects = { expertise: number; languages: number };

export function countChoiceOptionEffects(features: ChoiceOptionFeatures): ChoiceOptionEffects {
  return {
    expertise: countExpertiseSelections(features.flatMap(({ feature }) => readExpertiseGrant(feature.skillExpertises) ?? [])),
    languages: features.reduce((count, { feature }) => count + (feature.languagesToChooseCount ?? 0), 0),
  };
}

function describeChoiceOptionEffects(features: ChoiceOptionFeatures): string | undefined {
  const effects = countChoiceOptionEffects(features);
  return effects.expertise || effects.languages ? JSON.stringify(effects) : undefined;
}

export function listChosenFirstLevelOptionFeatures(characterClass: CreatorClass, subclass: CreatorClass["subclasses"][number] | undefined, draft: Pick<Partial<PersFormData>, "classChoiceSelections" | "subclassChoiceSelections">): ChoiceOptionFeatures {
  const chosenIds = (selections: ChoiceSelections | undefined) => Object.values(selections ?? {}).flat();
  const classIds = chosenIds(draft.classChoiceSelections);
  const subclassIds = chosenIds(draft.subclassChoiceSelections);
  return [
    ...characterClass.classChoiceOptions.filter((entry) => entry.levelsGranted.includes(FIRST_LEVEL) && classIds.includes(entry.choiceOptionId)),
    ...(subclass?.subclassChoiceOptions ?? []).filter((entry) => entry.levelsGranted.includes(FIRST_LEVEL) && subclassIds.includes(entry.choiceOptionId)),
  ].flatMap((entry) => entry.choiceOption.features);
}

export function findPresetClassSelections(characterClass: CreatorClass, names: readonly string[]): ChoiceSelections {
  return pickOptionPerGroup(listFirstLevelClassOptions(characterClass), names, "class options", 1);
}

export function findPresetSubclassSelection(characterClass: CreatorClass, subclassKey: string | undefined, names: readonly string[]): Partial<Pick<PersFormData, "subclassId" | "subclassChoiceSelections">> {
  if (!hasFirstLevelSubclass(characterClass)) {
    if (names.length) throw new Error(`Preset subclass options need a first-level subclass: ${characterClass.name}`);
    return {};
  }
  const subclass = characterClass.subclasses.find((entry) => entry.name === subclassKey);
  if (!subclass) throw new Error(`Missing first-level preset subclass: ${subclassKey}`);
  return { subclassId: subclass.subclassId, subclassChoiceSelections: pickOptionPerGroup(listFirstLevelSubclassOptions(subclass), names, "subclass options") };
}

export function listFirstLevelSubclassOptions(subclass: CreatorClass["subclasses"][number]): PickableOption[] {
  return subclass.subclassChoiceOptions
    .filter((entry) => entry.levelsGranted.includes(FIRST_LEVEL))
    .map((entry) => ({ group: entry.choiceOption.groupName, name: entry.choiceOption.optionNameEng, label: entry.choiceOption.optionName, id: entry.choiceOptionId,
      skillEffect: describeChoiceOptionEffects(entry.choiceOption.features) }));
}

export function listRaceChoiceOptions(race: CreatorRace, subraceId: number | undefined): PickableOption[] {
  return race.raceChoiceOptions
    .filter((entry) => !entry.subraceId || entry.subraceId === subraceId)
    .map((entry) => ({ group: entry.choiceGroupName, name: entry.optionName, label: entry.optionName, id: entry.optionId, skillEffect: JSON.stringify(entry.skillProficiencies) }));
}

export function findPresetRaceSelections(race: CreatorRace, subraceId: number | undefined, names: readonly string[]): Record<string, number> {
  const picked = pickOptionPerGroup(listRaceChoiceOptions(race, subraceId), names, "race options", 1);
  return Object.fromEntries(Object.entries(picked).map(([group, id]) => [group, [id].flat()[0]]));
}

const KNOWLEDGE_GROUP_PICKS = 2;

export function countGroupPicks(group: string): number {
  return group.toLowerCase().startsWith("благословення знань") ? KNOWLEDGE_GROUP_PICKS : 1;
}

export function groupPickableOptions(options: readonly PickableOption[]): ChoiceGroup[] {
  return [...new Set(options.map((option) => option.group))].map((group) => {
    const inGroup = options.filter((option) => option.group === group);
    const changesSkills = new Set(inGroup.map((option) => option.skillEffect)).size > 1;
    return { group, options: inGroup.map(({ id, label }) => ({ id, label })), ...(changesSkills ? { isLocked: true } : {}) };
  });
}

export function isChoiceSelectionValid(current: ChoiceSelections, expected: ChoiceSelections, groups: readonly ChoiceGroup[]): boolean {
  const readIds = (selections: ChoiceSelections, group: string) => [selections[group] ?? []].flat();
  return Object.keys(current).length === groups.length && groups.every(({ group, options, isLocked }) => {
    const ids = readIds(current, group);
    const expectedIds = readIds(expected, group);
    if (isLocked) return ids.length === expectedIds.length && ids.every((id) => expectedIds.includes(id));
    return ids.length === expectedIds.length && new Set(ids).size === ids.length && ids.every((id) => options.some((option) => option.id === id));
  });
}

function pickOptionPerGroup(options: readonly PickableOption[], names: readonly string[], label: string, maxPerGroup = Infinity): ChoiceSelections {
  const groups = [...new Set(options.map((option) => option.group))];
  const selected = names.map((name) => {
    const option = options.find((entry) => entry.name === name);
    if (!option) throw new Error(`Missing preset ${label}: ${name}`);
    return option;
  });
  if (new Set(names).size !== names.length) throw new Error(`Duplicate preset ${label}`);
  const missingGroup = groups.find((group) => !selected.some((option) => option.group === group));
  if (missingGroup) throw new Error(`Incomplete preset ${label}: ${missingGroup}`);
  const crowdedGroup = groups.find((group) => selected.filter((option) => option.group === group).length > maxPerGroup);
  if (crowdedGroup) throw new Error(`Too many preset ${label}: ${crowdedGroup}`);
  return Object.fromEntries(groups.map((group) => {
    const ids = selected.filter((option) => option.group === group).map((option) => option.id);
    return [group, ids.length === 1 ? ids[0] : ids];
  }));
}
