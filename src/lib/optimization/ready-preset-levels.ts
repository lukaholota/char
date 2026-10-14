import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { SpellSchoolLimit } from "@/rules/spell-choice-filter";
import type { ReadyPresetOptions } from "./ready-preset-options";
import { findFeatSpellRule2014 } from "@/rules/feat-spells-2014";
import { buildSpellSlug } from "@/lib/spell-link";
import { findWizardPreparedLimit, findWizardPreparedSelectionProblem } from "@/rules/wizard-prepared-spells-2014";
import { findListPreparedAbility2014, findListPreparedLimit } from "@/rules/initial-prepared-spells-2014";
import { findSpellKnowledge2014 } from "@/rules/spell-knowledge-2014";
import { filterBySchoolAllowance, findSchoolLimitForSlot, findSchoolLimitMessage } from "./ready-preset-school-limit";
import {
  buildAdvancementSelections, findAdvancementProblem, listAbilityScoresBeforeLevel, listFeatKeysBeforeLevel,
  type AbilityGain, type AdvancementAbility, type AdvancementChoice, type AdvancementChoices, type FeatPoolEntry,
} from "./ready-preset-advancements";
import {
  buildClassOptionSelections, findClassOptionProblem,
  type ClassOptionChoices, type ClassOptionPoolEntry, type LevelOptionPick, type OptionReplacement,
} from "./ready-preset-class-options";

export const WIZARD_CLASS_KEY = "WIZARD_2014";
export const OPEN_PICK_CATEGORIES = ["cantrips", "knownSpells", "spellbook"] as const;
export type OpenPickCategory = (typeof OPEN_PICK_CATEGORIES)[number];

export const ABILITY_LABELS: Record<string, string> = { STR: "Сила", DEX: "Спритність", CON: "Статура", INT: "Інтелект", WIS: "Мудрість", CHA: "Харизма" };
export const OPEN_PICK_LABELS: Record<OpenPickCategory, string> = { cantrips: "Замовляння", knownSpells: "Відомі заклинання", spellbook: "Заклинання до книги" };

const REQUEST_KEY_BY_CATEGORY = { cantrips: "cantripKeys", knownSpells: "knownSpellKeys", spellbook: "spellbookKeys" } as const;

export type LevelSpell = { key: string; name: string; engName: string; level: number; spellId?: number; school?: string; score?: number; castingTime?: string; isRitual?: boolean; isConcentration?: boolean };
export type LevelOpenPick = { category: OpenPickCategory; count: number; poolId: string; schoolLimitedSubclassKey?: string };
export type LevelAdvancement = { default: AdvancementChoice; defaultFeat: FeatPoolEntry | null };
export type LevelStep = {
  characterLevel: number;
  classKey: string;
  className: string;
  classLevel: number;
  isMulticlassEntry: boolean;
  subclassName: string | null;
  featName: string | null;
  featKey: string | null;
  optionNames: string[];
  abilityIncreases: { ability: string; amount: number }[];
  fixedGains: AbilityGain[];
  advancement: LevelAdvancement | null;
  classOptionNames: string[];
  replacedOptions: OptionReplacement[];
  optionPick: LevelOptionPick | null;
  newSpells: Record<OpenPickCategory, LevelSpell[]>;
  openPicks: LevelOpenPick[];
  grantedSpellKeys: string[];
  replacedSpell: LevelSpell | null;
  fixedClassOptionIds: number[];
};
export type LevelClassLevel = { className: string; classLevel: number };
export type ReadyPresetLevels = {
  startingClassKey: string;
  targetLevels: number[];
  steps: LevelStep[];
  classLevelsByTarget: Record<number, LevelClassLevel[]>;
  spellPools: Record<string, LevelSpell[]>;
  featPool: FeatPoolEntry[];
  classOptionPools: Record<string, ClassOptionPoolEntry[]>;
  wizardSpellScores: Record<string, number>;
  listPreparationPool: LevelSpell[];
};

export type OpenPickChoices = Record<string, string[]>;
export type OpenPickSlot = LevelOpenPick & { id: string; characterLevel: number; className: string; classKey: string; classLevel: number };
export type AssemblyStartState = { spellKeys: string[]; bookKeys: string[]; preparedKeys: string[]; abilities: Record<AdvancementAbility, number>; featKeys: string[]; classOptionIds: number[] };
export type AssemblyChoiceContext = {
  levels: ReadyPresetLevels;
  targetLevel: number;
  choices: OpenPickChoices;
  advancements: AdvancementChoices;
  classOptionChoices: ClassOptionChoices;
  preparedSpellKeys: string[] | null;
  start: AssemblyStartState;
};
export type SpellPreparation = { kind: "book" | "list"; className: string; classLevel: number; ability: "INT" | "WIS"; abilityScore: number; limit: number; poolKeys: string[] };
export type OpenSpellSelectionRequest = { characterLevel: number; cantripKeys?: string[]; knownSpellKeys?: string[]; spellbookKeys?: string[] };

export function buildOpenPickId(characterLevel: number, category: OpenPickCategory): string {
  return `${characterLevel}:${category}`;
}

export function listLevelOptions(levels: ReadyPresetLevels): number[] {
  return [1, ...levels.targetLevels];
}

export function isSelectableTargetLevel(levels: ReadyPresetLevels, level: number): boolean {
  return listLevelOptions(levels).includes(level);
}

export function listStepsUpTo(levels: ReadyPresetLevels, targetLevel: number): LevelStep[] {
  return levels.steps.filter((step) => step.characterLevel <= targetLevel);
}

export function listStepsAfter(levels: ReadyPresetLevels, targetLevel: number): LevelStep[] {
  return levels.steps.filter((step) => step.characterLevel > targetLevel);
}

export function listFixedSpells(step: LevelStep): LevelSpell[] {
  return OPEN_PICK_CATEGORIES.flatMap((category) => step.newSpells[category]);
}

export function listOpenPickSlots(levels: ReadyPresetLevels, targetLevel: number): OpenPickSlot[] {
  return listStepsUpTo(levels, targetLevel).flatMap((step) => step.openPicks.map((pick) => ({
    ...pick, id: buildOpenPickId(step.characterLevel, pick.category), characterLevel: step.characterLevel, className: step.className, classKey: step.classKey, classLevel: step.classLevel,
  })));
}

export function listChosenKeys(choices: OpenPickChoices, slotId: string): string[] {
  return choices[slotId] ?? [];
}

function listFixedSpellKeys(context: AssemblyChoiceContext): string[] {
  return listStepsUpTo(context.levels, context.targetLevel).flatMap((step) => listFixedSpells(step).map((spell) => spell.key));
}

function listOwnedWithoutPickKeys(context: AssemblyChoiceContext): string[] {
  const granted = listStepsUpTo(context.levels, context.targetLevel).flatMap((step) => step.grantedSpellKeys);
  const fromFeats = listFeatKeysBeforeLevel(context, context.targetLevel + 1).flatMap((featKey) => (findFeatSpellRule2014(featKey)?.namedSpellEngNames ?? []).map(buildSpellSlug));
  return [...context.start.spellKeys, ...listFixedSpellKeys(context), ...granted, ...fromFeats];
}

export function listTakenSpellKeys(context: AssemblyChoiceContext): string[] {
  const chosen = listOpenPickSlots(context.levels, context.targetLevel).flatMap((slot) => listChosenKeys(context.choices, slot.id));
  return [...listOwnedWithoutPickKeys(context), ...chosen];
}

export function listOpenPickCandidates(context: AssemblyChoiceContext, slot: OpenPickSlot, currentKey: string): LevelSpell[] {
  const taken = new Set(listTakenSpellKeys(context));
  const candidates = (context.levels.spellPools[slot.poolId] ?? []).filter((spell) => spell.key === currentKey || !taken.has(spell.key));
  const limit = findSlotSchoolLimit(context, slot);
  return limit ? filterBySchoolAllowance(limit, listSpellsPickedInStep(context, slot, currentKey), candidates) : candidates;
}

export function findSlotSchoolLimit(context: AssemblyChoiceContext, slot: OpenPickSlot): SpellSchoolLimit | null {
  return findSchoolLimitForSlot(slot, listSpellsOwnedBeforeStep(context, slot));
}

function listSpellsOwnedBeforeStep(context: AssemblyChoiceContext, slot: OpenPickSlot): LevelSpell[] {
  const earlierSteps = listStepsUpTo(context.levels, slot.characterLevel - 1).filter((step) => step.classKey === slot.classKey);
  const chosenKeys = earlierSteps.flatMap((step) => OPEN_PICK_CATEGORIES.flatMap((category) => listChosenKeys(context.choices, buildOpenPickId(step.characterLevel, category))));
  return addPoolSchools(context, slot, [...earlierSteps.flatMap(listFixedSpells), ...findPoolSpells(context, slot, chosenKeys)]);
}

function listSpellsPickedInStep(context: AssemblyChoiceContext, slot: OpenPickSlot, ignoredKey: string): LevelSpell[] {
  const step = context.levels.steps.find((entry) => entry.characterLevel === slot.characterLevel);
  const chosenKeys = listChosenKeys(context.choices, slot.id).filter((key) => key && key !== ignoredKey);
  return addPoolSchools(context, slot, [...(step ? listFixedSpells(step) : []), ...findPoolSpells(context, slot, chosenKeys)]);
}

function findPoolSpells(context: AssemblyChoiceContext, slot: OpenPickSlot, keys: readonly string[]): LevelSpell[] {
  const pool = context.levels.spellPools[slot.poolId] ?? [];
  return keys.flatMap((key) => pool.find((spell) => spell.key === key) ?? []);
}

function addPoolSchools(context: AssemblyChoiceContext, slot: OpenPickSlot, spells: readonly LevelSpell[]): LevelSpell[] {
  const schoolByKey = new Map((context.levels.spellPools[slot.poolId] ?? []).map((spell) => [spell.key, spell.school]));
  return spells.map((spell) => ({ ...spell, school: schoolByKey.get(spell.key) }));
}

export function findOpenPickProblem(context: AssemblyChoiceContext): string | null {
  const taken = new Set(listOwnedWithoutPickKeys(context));
  const chosenSoFar = new Set<string>();
  for (const slot of listOpenPickSlots(context.levels, context.targetLevel)) {
    const problem = findSlotProblem(context, slot, taken, chosenSoFar);
    if (problem) return problem;
    listChosenKeys(context.choices, slot.id).forEach((key) => chosenSoFar.add(key));
  }
  return null;
}

function findSlotProblem(context: AssemblyChoiceContext, slot: OpenPickSlot, taken: Set<string>, chosenSoFar: Set<string>): string | null {
  const keys = listChosenKeys(context.choices, slot.id);
  const prefix = `Рівень ${slot.characterLevel}, ${slot.className}`;
  if (keys.length !== slot.count || keys.some((key) => !key)) return `${prefix}: ${OPEN_PICK_LABELS[slot.category].toLowerCase()} — обрано ${keys.filter(Boolean).length} з ${slot.count}.`;
  if (new Set(keys).size !== keys.length || keys.some((key) => chosenSoFar.has(key))) return `${prefix}: те саме заклинання обрано двічі.`;
  const pool = new Set((context.levels.spellPools[slot.poolId] ?? []).map((spell) => spell.key));
  if (keys.some((key) => !pool.has(key))) return `${prefix}: обране заклинання недоступне на цьому рівні.`;
  if (keys.some((key) => taken.has(key))) return `${prefix}: таке заклинання персонаж уже має.`;
  return findSlotSchoolProblem(context, slot, prefix);
}

function findSlotSchoolProblem(context: AssemblyChoiceContext, slot: OpenPickSlot, prefix: string): string | null {
  const limit = findSlotSchoolLimit(context, slot);
  const message = limit ? findSchoolLimitMessage(limit, listSpellsPickedInStep(context, slot, "")) : null;
  return message ? `${prefix}: ${message}` : null;
}

export function findWizardLevelAt(levels: ReadyPresetLevels, targetLevel: number): number {
  return findClassLevelAt(levels, targetLevel, WIZARD_CLASS_KEY);
}

function findClassLevelAt(levels: ReadyPresetLevels, targetLevel: number, classKey: string): number {
  const classSteps = listStepsUpTo(levels, targetLevel).filter((step) => step.classKey === classKey);
  if (classSteps.length) return classSteps[classSteps.length - 1].classLevel;
  return levels.startingClassKey === classKey ? 1 : 0;
}

function findClassName(levels: ReadyPresetLevels, classKey: string): string {
  return levels.steps.find((step) => step.classKey === classKey)?.className ?? classKey;
}

export function findIntelligenceAt(context: AssemblyChoiceContext): number {
  return listAbilityScoresBeforeLevel(context, context.targetLevel + 1).INT;
}

export function findSpellPreparation(context: AssemblyChoiceContext): SpellPreparation | null {
  if (context.targetLevel === 1) return null;
  return findWizardPreparation(context) ?? findListPreparation(context);
}

function findWizardPreparation(context: AssemblyChoiceContext): SpellPreparation | null {
  const wizardLevel = findWizardLevelAt(context.levels, context.targetLevel);
  if (wizardLevel === 0) return null;
  const intelligence = findIntelligenceAt(context);
  const addedToBook = listStepsUpTo(context.levels, context.targetLevel).filter((step) => step.classKey === WIZARD_CLASS_KEY).flatMap((step) => [
    ...step.newSpells.spellbook.map((spell) => spell.key),
    ...listChosenKeys(context.choices, buildOpenPickId(step.characterLevel, "spellbook")),
  ]);
  return {
    kind: "book", className: findClassName(context.levels, WIZARD_CLASS_KEY), classLevel: wizardLevel, ability: "INT", abilityScore: intelligence,
    limit: findWizardPreparedLimit(intelligence, wizardLevel), poolKeys: [...new Set([...context.start.bookKeys, ...addedToBook])],
  };
}

// shortcut: only the starting class prepares from its list; a list-prepared multiclass keeps its level-1 picks until preparation is done on the sheet.
function findListPreparation(context: AssemblyChoiceContext): SpellPreparation | null {
  const classKey = context.levels.startingClassKey;
  const ability = findListPreparedAbility2014(classKey);
  if (!ability || !context.levels.listPreparationPool.length) return null;
  const classLevel = findClassLevelAt(context.levels, context.targetLevel, classKey);
  const scores = listAbilityScoresBeforeLevel(context, context.targetLevel + 1);
  const maxSpellLevel = findSpellKnowledge2014(classKey, classLevel)?.maxSpellLevel ?? 0;
  const taken = new Set(listTakenSpellKeys(context));
  const poolKeys = context.levels.listPreparationPool.filter((spell) => spell.level <= maxSpellLevel && !taken.has(spell.key)).map((spell) => spell.key);
  return { kind: "list", className: findClassName(context.levels, classKey), classLevel, ability, abilityScore: scores[ability], limit: findListPreparedLimit(classKey, scores, classLevel), poolKeys };
}

export function resolvePreparedKeys(preparation: SpellPreparation, context: AssemblyChoiceContext): string[] {
  if (context.preparedSpellKeys) return context.preparedSpellKeys.filter((key) => preparation.poolKeys.includes(key));
  return fillDefaultPreparedKeys(preparation, context);
}

function fillDefaultPreparedKeys(preparation: SpellPreparation, context: AssemblyChoiceContext): string[] {
  const authorKeys = context.start.preparedKeys.filter((key) => preparation.poolKeys.includes(key));
  const listSpellByKey = new Map(context.levels.listPreparationPool.map((spell) => [spell.key, spell]));
  const scoreOf = (key: string) => context.levels.wizardSpellScores[key] ?? listSpellByKey.get(key)?.score ?? 0;
  const levelOf = (key: string) => listSpellByKey.get(key)?.level ?? 0;
  const byScore = preparation.poolKeys.filter((key) => !authorKeys.includes(key)).sort((first, second) => scoreOf(second) - scoreOf(first) || levelOf(second) - levelOf(first));
  return [...authorKeys, ...byScore].slice(0, preparation.limit);
}

export function findPreparedKeysProblem(preparation: SpellPreparation, preparedKeys: readonly string[]): string | null {
  const idByKey = new Map(preparation.poolKeys.map((key, index) => [key, index + 1]));
  const preparedIds = preparedKeys.map((key) => idByKey.get(key) ?? 0);
  if (preparation.kind === "book") {
    return findWizardPreparedSelectionProblem({ intelligence: preparation.abilityScore, wizardLevel: preparation.classLevel, spellbookSpellIds: [...idByKey.values()], preparedIds });
  }
  if (new Set(preparedIds).size !== preparedIds.length) return "Підготовлене заклинання обрано двічі";
  if (preparedIds.includes(0)) return "Підготувати можна лише заклинання доступних рівнів зі списку свого класу";
  return preparedIds.length > preparation.limit ? "Забагато підготовлених заклинань для вашої характеристики" : null;
}

function findStartConflictProblem(context: AssemblyChoiceContext): string | null {
  const startKeys = new Set(context.start.spellKeys);
  const startOptionIds = new Set(context.start.classOptionIds);
  const ownedBefore = new Set(context.start.spellKeys);
  for (const step of listStepsUpTo(context.levels, context.targetLevel)) {
    const prefix = `Рівень ${step.characterLevel}, ${step.className}`;
    const repeated = listFixedSpells(step).find((spell) => startKeys.has(spell.key));
    if (repeated) return `${prefix}: план додає «${repeated.name}», а його вже обрано на 1-му рівні — замініть його на кроці «Стартові заклинання».`;
    if (step.fixedClassOptionIds.some((id) => startOptionIds.has(id))) return `${prefix}: план бере ту саму опцію, що вже обрана на 1-му рівні, — оберіть іншу на кроці «Вибори класу й раси».`;
    if (step.replacedSpell && !ownedBefore.has(step.replacedSpell.key)) return `${prefix}: план замінює «${step.replacedSpell.name}», а на кроці «Стартові заклинання» його прибрано — поверніть його або оберіть рівень нижче ${step.characterLevel}.`;
    [...listFixedSpells(step).map((spell) => spell.key), ...step.grantedSpellKeys, ...OPEN_PICK_CATEGORIES.flatMap((category) => listChosenKeys(context.choices, buildOpenPickId(step.characterLevel, category)))].forEach((key) => ownedBefore.add(key));
  }
  return null;
}

export function excludeLaterPlanPicks(options: ReadyPresetOptions, levels: ReadyPresetLevels | null): ReadyPresetOptions {
  if (!levels) return options;
  const plannedKeys = new Set(levels.steps.flatMap((step) => [...listFixedSpells(step).map((spell) => spell.key), ...step.grantedSpellKeys]));
  const plannedOptionIds = new Set(levels.steps.filter((step) => step.classKey === levels.startingClassKey).flatMap((step) => step.fixedClassOptionIds));
  const classOptions = options.choiceGroups.classOptions.map((group) => ({ ...group, options: group.options.filter((option) => !plannedOptionIds.has(option.id)) }));
  const plannedSpellIds = options.spells.candidates.filter((spell) => plannedKeys.has(buildSpellSlug(spell.engName))).map((spell) => spell.spellId);
  return { ...options, choiceGroups: { ...options.choiceGroups, classOptions }, spells: { ...options.spells, plannedSpellIds } };
}

export function findAssemblyChoiceProblem(context: AssemblyChoiceContext): string | null {
  const openProblem = findStartConflictProblem(context) ?? findAdvancementProblem(context) ?? findClassOptionProblem(context) ?? findOpenPickProblem(context);
  if (openProblem) return openProblem;
  const preparation = findSpellPreparation(context);
  if (!preparation) return null;
  const preparedKeys = resolvePreparedKeys(preparation, context);
  return preparedKeys.length ? findPreparedKeysProblem(preparation, preparedKeys) : `Підготуйте хоча б одне заклинання${preparation.kind === "book" ? " з книги" : ""}.`;
}

export function buildOpenSpellSelections(levels: ReadyPresetLevels, targetLevel: number, choices: OpenPickChoices): OpenSpellSelectionRequest[] {
  const slots = listOpenPickSlots(levels, targetLevel);
  return [...new Set(slots.map((slot) => slot.characterLevel))].map((characterLevel) => ({
    characterLevel,
    ...Object.fromEntries(slots.filter((slot) => slot.characterLevel === characterLevel).map((slot) => [REQUEST_KEY_BY_CATEGORY[slot.category], listChosenKeys(choices, slot.id)])),
  }));
}

export function buildAssemblyCreationRequest(input: {
  preset: { buildId: string; revisionId: string };
  requestId: string;
  start: PersFormData;
  context: AssemblyChoiceContext;
}) {
  const { preset, requestId, start, context } = input;
  const preparation = findSpellPreparation(context);
  const preparedSpellKeys = preparation ? resolvePreparedKeys(preparation, context) : null;
  return {
    buildId: preset.buildId,
    revisionId: preset.revisionId,
    targetLevel: context.targetLevel,
    requestId,
    start: omitReadyPresetRequestId(start),
    openSelections: buildOpenSpellSelections(context.levels, context.targetLevel, context.choices),
    openAdvancements: buildAdvancementSelections(context.levels, context.targetLevel, context.advancements),
    openClassOptions: buildClassOptionSelections(context.levels, context.targetLevel, context.classOptionChoices),
    ...(preparedSpellKeys ? { preparedSpellKeys } : {}),
  };
}

function omitReadyPresetRequestId(start: PersFormData): PersFormData {
  const withoutRequestId = { ...start };
  delete withoutRequestId.readyPresetRequestId;
  return withoutRequestId;
}
