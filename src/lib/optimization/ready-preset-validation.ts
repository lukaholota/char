import { fullCharacterSchema, type PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { buildDetailsSchema } from "./schema";
import { countRemainingBuildPoints } from "./build-draft";
import { buildReadyPresetSkillChoices, listAvailableSkillPicks } from "./ready-preset-skills";
import { isPresetEquipmentValid } from "./ready-preset-equipment";
import type { ReadyPresetOptions } from "./ready-preset-options";
import { findPresetSpellProblem, listPresetPreparedPool } from "./ready-preset-spells";
import { findInitialPreparedSelectionProblem } from "@/rules/initial-prepared-spells-2014";
import { buildPresetAbilityScores } from "./ready-preset-abilities";
import { isChoiceSelectionValid } from "./ready-preset-identity";

export function isSavedPresetValid(draft: Partial<PersFormData>, expected: PersFormData, options: ReadyPresetOptions): boolean {
  return findSavedPresetProblem(draft, expected, options) === null;
}

export function findSavedPresetProblem(draft: Partial<PersFormData>, expected: PersFormData, options: ReadyPresetOptions): string | null {
  const parsed = fullCharacterSchema.safeParse(draft);
  if (!parsed.success) return "Чернетка пошкоджена — почніть пресет заново.";
  const current = parsed.data;
  const fixedFields = ["ruleset", "classId", "raceId", "raceVariantId", "subraceId", "subclassId", "backgroundId", "featId", "asiSystem", "isDefaultASI", "levelUpPath"] as const;
  const checks: [() => boolean | string | null, string][] = [
    [() => fixedFields.every((key) => (current[key] ?? undefined) === (expected[key] ?? undefined)), "Чернетка належить іншому пресету — почніть заново."],
    [() => buildDetailsSchema.shape.abilityScores.safeParse(draft.asi).success && countRemainingBuildPoints(current.asi) >= 0, "Характеристики: витрачено забагато очок."],
    [() => isSameChoiceMap(current.featChoiceSelections, expected.featChoiceSelections), "Вибори риси не збігаються з пресетом — почніть заново."],
    [() => areChoiceGroupsValid(current, expected, options), "Завершіть вибори класу й раси."],
    [() => hasSameRacialChoiceGroups(current.racialBonusChoiceSchema, expected.racialBonusChoiceSchema) && areRacialChoicesComplete(current.racialBonusChoiceSchema), "Характеристики: розподіліть усі расові бонуси."],
    [() => JSON.stringify(current.backgroundCustomization?.tools ?? null) === JSON.stringify(expected.backgroundCustomization?.tools ?? null), "Інструменти передісторії не збігаються з пресетом — почніть заново."],
    [() => arePresetSkillsValid(current, expected, options), "Навички: оберіть усі навички білда без повторів."],
    [() => hasDistinctChoices(current.languagesSchema?.languages ?? [], options.languageCount, options.languages), "Мови: оберіть усі мови без повторів."],
    [() => hasDistinctChoices(current.expertiseSchema?.expertises ?? [], options.expertiseCount, current.skills), "Експертиза: оберіть навички з тих, якими ви володієте."],
    [() => findPresetSpellProblem(current, options.spells), ""],
    [() => !(options.spells.usesSpellbook && !current.initialPreparedSpellIds?.length), "Заклинання: підготуйте заклинання з книги."],
    [() => findPresetPreparedProblem(current, options), ""],
    [() => !!current.equipmentSchema && isPresetEquipmentValid(current.equipmentSchema, options.equipmentGroups), "Спорядження: завершіть вибір."],
  ];
  for (const [check, message] of checks) {
    const result = check();
    if (result === false) return message;
    if (typeof result === "string") return result;
  }
  return null;
}

export function findPresetPreparedProblem(draft: Partial<PersFormData>, options: ReadyPresetOptions): string | null {
  return findInitialPreparedSelectionProblem({ ruleset: draft.ruleset ?? "RULES_2014", className: options.className, spellbookIds: draft.classSpells?.spellbookIds ?? [],
    preparedIds: draft.initialPreparedSpellIds, listSpellIds: listPresetPreparedPool(options.spells).map((spell) => spell.spellId),
    scores: buildPresetAbilityScores(draft, options.abilitySources) });
}

export function isSavedPresetCompatible(draft: Partial<PersFormData>, expected: PersFormData): boolean {
  const parsed = fullCharacterSchema.safeParse(draft);
  if (!parsed.success) return false;
  const fixedFields = ["ruleset", "classId", "raceId", "raceVariantId", "subraceId", "subclassId", "backgroundId", "featId", "asiSystem", "isDefaultASI", "levelUpPath"] as const;
  const sections = ["skillsSchema", "expertiseSchema", "languagesSchema", "equipmentSchema"] as const;
  return fixedFields.every((key) => (draft[key] ?? undefined) === (expected[key] ?? undefined))
    && sections.every((key) => !expected[key] || !!draft[key])
    && isSameChoiceMap(parsed.data.featChoiceSelections, expected.featChoiceSelections)
    && hasSameRacialChoiceGroups(draft.racialBonusChoiceSchema, expected.racialBonusChoiceSchema)
    && JSON.stringify(draft.backgroundCustomization?.tools ?? null) === JSON.stringify(expected.backgroundCustomization?.tools ?? null);
}

type RacialChoices = PersFormData["racialBonusChoiceSchema"];

function hasSameRacialChoiceGroups(actual: RacialChoices, expected: RacialChoices): boolean {
  const describeShape = (choices: RacialChoices) => JSON.stringify([choices?.basicChoices ?? [], choices?.tashaChoices ?? []]
    .map((groups) => groups.map((group) => [group.groupIndex, group.choiceCount])));
  return describeShape(actual) === describeShape(expected);
}

function areRacialChoicesComplete(choices: RacialChoices): boolean {
  return [...(choices?.basicChoices ?? []), ...(choices?.tashaChoices ?? [])]
    .every((group) => group.selectedAbilities.length === group.choiceCount && new Set(group.selectedAbilities).size === group.choiceCount);
}

function areChoiceGroupsValid(current: PersFormData, expected: PersFormData, options: ReadyPresetOptions): boolean {
  const { classOptions, subclassOptions, raceOptions } = options.choiceGroups;
  return isChoiceSelectionValid(current.classChoiceSelections, expected.classChoiceSelections, classOptions)
    && isChoiceSelectionValid(current.subclassChoiceSelections, expected.subclassChoiceSelections, subclassOptions)
    && isChoiceSelectionValid(current.raceChoiceSelections, expected.raceChoiceSelections, raceOptions);
}

function arePresetSkillsValid(draft: PersFormData, expected: PersFormData, options: ReadyPresetOptions): boolean {
  const schema = draft.skillsSchema;
  if (!schema || schema.isTasha !== (expected.skillsSchema?.isTasha ?? false) || schema.tashaChoices.length || Object.keys(schema.choiceOptions).length) return false;
  const choices = schema.basicChoices;
  const sources = options.skills;
  const available = listAvailableSkillPicks(choices, sources);
  const reconciled = buildReadyPresetSkillChoices(choices, sources);
  return hasDistinctChoices(choices.selectedClass, sources.classCount, available.selectedClass)
    && hasDistinctChoices(choices.race, sources.raceCount, available.race)
    && hasDistinctChoices(choices.subclass ?? [], sources.subclassCount, available.subclass)
    && hasDistinctChoices(choices.background, reconciled.choices.background.length, reconciled.choices.background)
    && isBackgroundCustomizationConsistent(draft, choices.background)
    && hasDistinctChoices(draft.skills, reconciled.skills.length, reconciled.skills);
}

function isBackgroundCustomizationConsistent(draft: PersFormData, backgroundSkills: readonly string[]): boolean {
  const customization = draft.backgroundCustomization;
  return !customization || JSON.stringify([...customization.skills].sort()) === JSON.stringify([...backgroundSkills].sort());
}

function hasDistinctChoices(selected: string[], count: number, available: readonly string[]): boolean {
  return selected.length === count && new Set(selected).size === count && selected.every((choice) => available.includes(choice));
}

function isSameChoiceMap(actual: Record<string, number | number[]>, expected: Record<string, number | number[]>): boolean {
  const normalize = (selections: Record<string, number | number[]>) => Object.entries(selections).sort(([left], [right]) => left.localeCompare(right)).map(([group, selected]) => [group, [selected].flat().sort((left, right) => left - right)]);
  return JSON.stringify(normalize(actual)) === JSON.stringify(normalize(expected));
}
