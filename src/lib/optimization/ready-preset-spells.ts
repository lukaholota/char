import { z } from "zod";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { SpellChoiceOption } from "@/rules/spell-choice-filter";
import { isSpellChoiceCandidate, type SpellChoiceFilter } from "@/rules/spell-choice-filter";
import { buildClassSpellFilters2014, findCreationSpellAllowance2014, findSpellLists2014, usesSpellbook2014 } from "@/rules/class-spell-choices-2014";
import { findClassSpellSelectionProblem } from "@/rules/class-spell-choices-2024";
import { findSubclassFeatureSpellChoice, type ClassOptionSpellChoice } from "@/rules/class-option-spell-choices-2024";
import { findRaceSpellChoice2014, type RaceAtCreation2014 } from "@/rules/race-spell-choices-2014";
import { findSpellKnowledge2014 } from "@/rules/spell-knowledge-2014";
import { buildFeatSpellFilter, findFeatSpellSelectionProblem, type FeatSpellPickRule } from "@/rules/feat-spell-choices";
import { findCommonSpellLists2014, findFeatSpellRule2014, findFeatSpellSelectionProblem2014, listFeatSpellFilters2014, listFeatSpellListChoices2014, type FeatSpellRule2014 } from "@/rules/feat-spells-2014";
import { spellSchoolTranslations } from "@/lib/refs/translation";
import { buildSpellSlug } from "@/lib/spell-link";
import { idSchema } from "./schema";

export const PRESET_SPELL_GROUPS = ["classCantrips", "knownSpells", "spellbook", "raceSpells", "classOptionSpells", "preparedSpells", "featSpells"] as const;
export type PresetSpellGroup = (typeof PRESET_SPELL_GROUPS)[number];

export const readyPresetSpellsSchema = z.strictObject({
  classCantripKeys: z.array(idSchema), knownSpellKeys: z.array(idSchema), spellbookKeys: z.array(idSchema),
  raceSpellKeys: z.array(idSchema), sectionId: idSchema, explanation: z.string().min(1),
  preparedSpellKeys: z.array(idSchema).default([]),
  classOptionSpellKeys: z.array(idSchema).optional(),
  featSpellKeys: z.array(idSchema).optional(),
  platformChoices: z.array(z.enum(PRESET_SPELL_GROUPS)).optional(),
});
export type ReadyPresetSpells = z.infer<typeof readyPresetSpellsSchema>;

export type PresetSpellPreparation = "none" | "spellbook" | "known" | "list";

type SpellSelectionDraft = Pick<Partial<PersFormData>, "classSpells" | "raceSpellIds" | "classOptionSpellIds" | "featSpellSelections">;

export type PresetFeatSpellChoice = { rule: FeatSpellRule2014; namedSpells: { name: string; engName: string }[] };

export function buildPresetSpellOptions(className: string, race: RaceAtCreation2014, candidates: readonly SpellChoiceOption[], subclassName: string | null = null, featName: string | null = null) {
  const caster = { className, subclassName };
  const allowance = findCreationSpellAllowance2014(caster);
  const filters = allowance ? buildClassSpellFilters2014({ lists: findSpellLists2014(caster), quota: allowance.quota, schoolLimit: null }) : null;
  const raceChoice = findRaceSpellChoice2014(race);
  const classOptionChoice = findFirstLevelSubclassSpellChoice(subclassName);
  const featChoice = findPresetFeatSpellChoice(featName, candidates);
  return {
    allowance, filters, raceChoice, classOptionChoice, featChoice,
    usesSpellbook: usesSpellbook2014(className),
    preparation: findPresetSpellPreparation(className, subclassName),
    candidates: collectPresetSpellCandidates({ filters, raceChoice, classOptionChoice, featChoice, candidates }),
  };
}
export type ReadyPresetSpellOptions = ReturnType<typeof buildPresetSpellOptions>;

function findPresetFeatSpellChoice(featName: string | null, candidates: readonly SpellChoiceOption[]): PresetFeatSpellChoice | null {
  const rule = findFeatSpellRule2014(featName);
  if (!rule) return null;
  const namedSpells = candidates.filter((spell) => spell.ruleset !== "RULES_2024" && rule.namedSpellEngNames.includes(spell.engName)).map(({ name, engName }) => ({ name, engName }));
  return { rule, namedSpells };
}

function findFirstLevelSubclassSpellChoice(subclassName: string | null): ClassOptionSpellChoice | null {
  return subclassName ? findSubclassFeatureSpellChoice({ ruleset: "RULES_2014", subclassName, classLevel: 1 }) : null;
}

export function findPresetSpellPreparation(className: string, subclassName: string | null): PresetSpellPreparation {
  const knowledge = findSpellKnowledge2014(className, 1, subclassName);
  if (!knowledge || knowledge.maxSpellLevel === 0) return "none";
  if (usesSpellbook2014(className)) return "spellbook";
  return knowledge.known === null ? "list" : "known";
}

export function listPresetPreparedPool(options: Pick<ReadyPresetSpellOptions, "preparation" | "filters" | "candidates">): SpellChoiceOption[] {
  const filter = options.filters?.spells;
  if (options.preparation !== "list" || !filter) return [];
  return options.candidates.filter((spell) => spell.level > 0 && isSpellChoiceCandidate(filter, spell));
}

type CandidateSources = {
  filters: ReturnType<typeof buildClassSpellFilters2014> | null;
  raceChoice: ReturnType<typeof findRaceSpellChoice2014>;
  classOptionChoice: ClassOptionSpellChoice | null;
  featChoice: PresetFeatSpellChoice | null;
  candidates: readonly SpellChoiceOption[];
};

function collectPresetSpellCandidates({ filters, raceChoice, classOptionChoice, featChoice, candidates }: CandidateSources): SpellChoiceOption[] {
  const optionPicks = classOptionChoice?.rule.picks ?? [];
  const featFilters = featChoice ? listFeatSpellFilters2014(featChoice.rule) : [];
  const racePicks = raceChoice?.rule.picks ?? [];
  const extraLists = [...racePicks, ...optionPicks].flatMap((pick) => pick.extraList ? [pick.extraList] : []);
  return candidates.filter((spell) => spell.ruleset === "RULES_2014").map((spell) => ({
    ...spell,
    school: findSchoolKey(spell.school),
    spellLists: [...(spell.spellLists ?? []), ...extraLists.filter((list) => list.spellEngNames.includes(spell.engName)).map((list) => list.name)],
  })).filter((spell) => (filters && (isSpellChoiceCandidate(filters.cantrips, spell) || isSpellChoiceCandidate(filters.spells, spell)))
    || raceChoice?.rule.picks.some((pick) => isSpellChoiceCandidate(buildFeatSpellFilter(pick), spell))
    || optionPicks.some((pick) => isSpellChoiceCandidate(buildFeatSpellFilter(pick), spell))
    || featFilters.some((filter) => isSpellChoiceCandidate(filter, spell)));
}

export function findSchoolKey(school: string | null): string | null {
  return Object.entries(spellSchoolTranslations).find(([, name]) => name === school)?.[0] ?? school;
}

export function buildPresetSpellSelection(preset: ReadyPresetSpells | undefined, options: ReadyPresetSpellOptions): Pick<PersFormData, "classSpells" | "raceSpellIds" | "classOptionSpellIds" | "initialPreparedSpellIds" | "featSpellSelections"> {
  const resolve = (keys: string[]) => keys.map((key) => {
    const spell = options.candidates.find((candidate) => buildSpellSlug(candidate.engName) === key);
    if (!spell) throw new Error(`Missing preset spell: ${key}`);
    return spell.spellId;
  });
  const selection = {
    ...(preset || options.allowance ? { classSpells: { cantripIds: resolve(preset?.classCantripKeys ?? []), preparedIds: resolve(preset?.knownSpellKeys ?? []), spellbookIds: resolve(preset?.spellbookKeys ?? []) } } : {}),
    ...(preset || options.raceChoice ? { raceSpellIds: resolve(preset?.raceSpellKeys ?? []) } : {}),
    ...(preset?.classOptionSpellKeys?.length ? { classOptionSpellIds: resolve(preset.classOptionSpellKeys) } : {}),
    ...(options.featChoice ? { featSpellSelections: { CLASS_ASI: resolve(preset?.featSpellKeys ?? []) } } : {}),
    ...(preset?.preparedSpellKeys.length ? { initialPreparedSpellIds: resolve(preset.preparedSpellKeys) } : {}),
  };
  const problem = findPresetSpellProblem(selection, options);
  if (problem) throw new Error(`Incomplete preset spells: ${problem}`);
  return selection;
}

export function findPresetSpellProblem(draft: SpellSelectionDraft, options: ReadyPresetSpellOptions): string | null {
  const selection = draft.classSpells ?? { cantripIds: [], preparedIds: [], spellbookIds: [] };
  const classIds = [...selection.cantripIds, ...selection.preparedIds, ...selection.spellbookIds];
  const raceIds = draft.raceSpellIds ?? [];
  const optionIds = draft.classOptionSpellIds ?? [];
  const featIds = draft.featSpellSelections?.CLASS_ASI;
  if (selection.cantripSwap || selection.preparedSwap) return "Під час створення не можна замінювати заклинання";
  const classProblem = findPresetClassSpellProblem(selection, classIds, [...raceIds, ...optionIds, ...(featIds ?? [])], options);
  if (classProblem) return classProblem;
  if (new Set([...classIds, ...raceIds, ...optionIds, ...(featIds ?? [])]).size !== classIds.length + raceIds.length + optionIds.length + (featIds?.length ?? 0)) return "Одне заклинання обрано двічі";
  return findPresetRaceSpellProblem(raceIds, options) ?? findPresetClassOptionSpellProblem(optionIds, options) ?? findPresetFeatSpellProblem(featIds, options);
}

function findPresetClassSpellProblem(selection: NonNullable<SpellSelectionDraft["classSpells"]>, classIds: number[], unavailableSpellIds: number[], options: ReadyPresetSpellOptions) {
  if (options.allowance && options.filters) {
    return findClassSpellSelectionProblem({ quota: options.allowance.quota, catchUp: options.allowance.catchUp, filters: options.filters, selection,
      candidates: options.candidates, usesSpellbook: options.usesSpellbook, bookSpellIds: [], unavailableSpellIds });
  }
  return classIds.length ? "Клас не дає обрати стартові заклинання" : null;
}

function findPresetRaceSpellProblem(raceIds: number[], options: ReadyPresetSpellOptions) {
  if (options.raceChoice) return findFeatSpellSelectionProblem(options.raceChoice.rule, raceIds, options.candidates, options.raceChoice.label);
  return raceIds.length ? "Раса не дає обрати стартові заклинання" : null;
}

function findPresetClassOptionSpellProblem(optionIds: number[], options: ReadyPresetSpellOptions) {
  const choice = options.classOptionChoice;
  if (choice) return findFeatSpellSelectionProblem(choice.rule, optionIds, options.candidates, choice.label);
  return optionIds.length ? "Підклас не дає обрати стартові заклинання" : null;
}

function findPresetFeatSpellProblem(featIds: number[] | undefined, options: ReadyPresetSpellOptions) {
  const choice = options.featChoice;
  if (!choice) return featIds?.length ? "Риса не дає обрати стартові заклинання" : null;
  if (!featIds) return `Оберіть заклинання: ${choice.rule.label}`;
  return findFeatSpellSelectionProblem2014(choice.rule, featIds, options.candidates);
}

export function buildFeatSpellsForList(rule: FeatSpellRule2014, list: string, candidates: readonly SpellChoiceOption[], takenSpellIds: readonly number[]): number[] {
  if (!rule.sharedSpellLists?.includes(list)) return [];
  const choice = listFeatSpellListChoices2014({ ...rule, sharedSpellLists: rule.sharedSpellLists?.filter((entry) => entry === list) ?? null })[0];
  const chosen: number[] = [];
  for (const pick of choice.picks) {
    const filter = buildFeatSpellFilter(pick);
    const options = candidates.filter((spell) => isSpellChoiceCandidate(filter, spell) && !takenSpellIds.includes(spell.spellId) && !chosen.includes(spell.spellId));
    chosen.push(...options.slice(0, pick.count).map((spell) => spell.spellId));
  }
  return chosen;
}

type PresetSpellField = "cantripIds" | "preparedIds" | "spellbookIds" | "raceSpellIds" | "classOptionSpellIds" | "featSpellIds";
export type PresetSpellGroupState = { id: PresetSpellGroup; field: PresetSpellField; label: string; selected: number[]; filters: SpellChoiceFilter[] };

export function buildPresetSpellGroups(options: ReadyPresetSpellOptions, draft: Partial<PersFormData>): PresetSpellGroupState[] {
  const classFilters = (filter: SpellChoiceFilter | undefined) => filter ? [filter] : [];
  const pickFilters = (picks: FeatSpellPickRule[] | undefined) => (picks ?? []).map(buildFeatSpellFilter);
  return [
    { id: "classCantrips", field: "cantripIds", label: "Замовляння класу", selected: draft.classSpells?.cantripIds ?? [], filters: classFilters(options.filters?.cantrips) },
    { id: "knownSpells", field: "preparedIds", label: "Відомі заклинання", selected: draft.classSpells?.preparedIds ?? [], filters: classFilters(options.filters?.spells) },
    { id: "spellbook", field: "spellbookIds", label: "Заклинання книги", selected: draft.classSpells?.spellbookIds ?? [], filters: classFilters(options.filters?.spells) },
    { id: "raceSpells", field: "raceSpellIds", label: options.raceChoice?.label ?? "Расові заклинання", selected: draft.raceSpellIds ?? [], filters: pickFilters(options.raceChoice?.rule.picks) },
    { id: "classOptionSpells", field: "classOptionSpellIds", label: options.classOptionChoice?.label ?? "Заклинання підкласу", selected: draft.classOptionSpellIds ?? [], filters: pickFilters(options.classOptionChoice?.rule.picks) },
    { id: "featSpells", field: "featSpellIds", label: options.featChoice ? `Заклинання риси: ${options.featChoice.rule.label}` : "Заклинання риси", selected: draft.featSpellSelections?.CLASS_ASI ?? [], filters: options.featChoice ? listFeatSpellFilters2014(options.featChoice.rule) : [] },
  ];
}

export function listPresetSpellGroupCandidates(options: ReadyPresetSpellOptions, group: PresetSpellGroupState, takenSpellIds: readonly number[]): SpellChoiceOption[] {
  const selectedSpells = options.candidates.filter((spell) => group.selected.includes(spell.spellId));
  const sharedListRule = group.id === "featSpells" && options.featChoice?.rule.sharedSpellLists ? options.featChoice.rule : null;
  return options.candidates.filter((spell) => group.filters.some((filter) => isSpellChoiceCandidate(filter, spell))
    && (group.selected.includes(spell.spellId) || !takenSpellIds.includes(spell.spellId))
    && (!sharedListRule || findCommonSpellLists2014(sharedListRule, [...selectedSpells, spell]).length > 0));
}

export function isPresetSpellLevelOpen(options: ReadyPresetSpellOptions, group: PresetSpellGroupState, original: PresetSpellGroupState, level: number): boolean {
  const countAtLevel = (ids: readonly number[]) => options.candidates.filter((spell) => ids.includes(spell.spellId) && spell.level === level).length;
  return countAtLevel(group.selected) < countAtLevel(original.selected);
}

export function buildPresetSpellChoicePatch(draft: Partial<PersFormData>, group: Pick<PresetSpellGroupState, "field">, ids: number[]): Partial<PersFormData> {
  if (group.field === "featSpellIds") return { featSpellSelections: { ...draft.featSpellSelections, CLASS_ASI: ids } };
  if (group.field === "raceSpellIds" || group.field === "classOptionSpellIds") return { [group.field]: ids };
  return { classSpells: { ...draft.classSpells!, [group.field]: ids }, ...(group.field === "spellbookIds" ? { initialPreparedSpellIds: draft.initialPreparedSpellIds?.filter((id) => ids.includes(id)) } : {}) };
}
