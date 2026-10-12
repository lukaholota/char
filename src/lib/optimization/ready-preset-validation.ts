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
  const parsed = fullCharacterSchema.safeParse(draft);
  if (!parsed.success || !buildDetailsSchema.shape.abilityScores.safeParse(draft.asi).success) return false;
  const current = parsed.data;
  const fixedFields = ["ruleset", "classId", "raceId", "raceVariantId", "subraceId", "subclassId", "backgroundId", "featId", "asiSystem", "isDefaultASI", "levelUpPath"] as const;
  return fixedFields.every((key) => (current[key] ?? undefined) === (expected[key] ?? undefined))
    && countRemainingBuildPoints(current.asi) >= 0
    && isSameChoiceMap(current.featChoiceSelections, expected.featChoiceSelections)
    && areChoiceGroupsValid(current, expected, options)
    && JSON.stringify(current.racialBonusChoiceSchema) === JSON.stringify(expected.racialBonusChoiceSchema)
    && JSON.stringify(current.backgroundCustomization?.tools ?? null) === JSON.stringify(expected.backgroundCustomization?.tools ?? null)
    && arePresetSkillsValid(current, expected, options)
    && hasDistinctChoices(current.languagesSchema?.languages ?? [], options.languageCount, options.languages)
    && hasDistinctChoices(current.expertiseSchema?.expertises ?? [], options.expertiseCount, current.skills)
    && findPresetSpellProblem(current, options.spells) === null
    && !(options.spells.usesSpellbook && !current.initialPreparedSpellIds?.length)
    && findInitialPreparedSelectionProblem({ ruleset: current.ruleset ?? "RULES_2014", className: options.className, spellbookIds: current.classSpells?.spellbookIds ?? [],
      preparedIds: current.initialPreparedSpellIds, listSpellIds: listPresetPreparedPool(options.spells).map((spell) => spell.spellId),
      scores: buildPresetAbilityScores(current, options.abilitySources) }) === null
    && !!current.equipmentSchema && isPresetEquipmentValid(current.equipmentSchema, options.equipmentGroups);
}

export function isSavedPresetCompatible(draft: Partial<PersFormData>, expected: PersFormData): boolean {
  const parsed = fullCharacterSchema.safeParse(draft);
  if (!parsed.success) return false;
  const fixedFields = ["ruleset", "classId", "raceId", "raceVariantId", "subraceId", "subclassId", "backgroundId", "featId", "asiSystem", "isDefaultASI", "levelUpPath"] as const;
  const sections = ["skillsSchema", "expertiseSchema", "languagesSchema", "equipmentSchema"] as const;
  return fixedFields.every((key) => (draft[key] ?? undefined) === (expected[key] ?? undefined))
    && sections.every((key) => !expected[key] || !!draft[key])
    && isSameChoiceMap(parsed.data.featChoiceSelections, expected.featChoiceSelections)
    && JSON.stringify(draft.racialBonusChoiceSchema) === JSON.stringify(expected.racialBonusChoiceSchema)
    && JSON.stringify(draft.backgroundCustomization?.tools ?? null) === JSON.stringify(expected.backgroundCustomization?.tools ?? null);
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
