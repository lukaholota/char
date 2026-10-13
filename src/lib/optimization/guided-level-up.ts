import type { LevelUpInput } from "@/lib/zod/schemas/levelUpSchema";
import { buildSingleAssemblyStep } from "./assembly-plan";
import { listExecutableSteps } from "./build-executable-levels";
import type { AssemblyCatalog } from "./assembly-catalog";
import type { BuildProgressionStep, BuildRecipe, LevelDecisions } from "./types";

type Ability = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";
export type GuidedPersClass = { classKey: string; classLevel: number; subclassKey: string | null };
export type GuidedPersState = {
  level: number;
  classes: readonly GuidedPersClass[];
  abilityScores: Readonly<Record<Ability, number>>;
  nonRepeatableFeatIds: readonly number[];
  choiceOptionIds: readonly number[];
};
export type GuidedStepPlan =
  | { status: "ready"; nextLevel: number; classKey: string; classLevel: number; isMulticlassEntry: boolean; input: LevelUpInput; skipped: string[]; open: string[] }
  | { status: "unavailable"; reason: string };
export type GuidedBuildLink = { title: string; href: string };
export type GuidedLevelUp =
  | { status: "ready"; build: GuidedBuildLink; nextLevel: number; classLabel: string; classLevel: number; input: LevelUpInput; skipped: string[]; open: string[] }
  | { status: "unavailable"; build: GuidedBuildLink | null; reason: string };

const MAX_LEVEL = 20;
const MAX_ABILITY_SCORE = 20;
const OPEN_SPELL_LABELS: Record<string, string> = { cantrips: "замовляння", knownSpells: "нові заклинання", spellbook: "заклинання до книги" };

export function planGuidedLevelUp(recipe: BuildRecipe, catalog: AssemblyCatalog, pers: GuidedPersState): GuidedStepPlan {
  const nextLevel = pers.level + 1;
  if (nextLevel > MAX_LEVEL) return { status: "unavailable", reason: "Персонаж уже на 20-му рівні." };
  const steps = listExecutableSteps(recipe);
  const step = steps.find((candidate) => candidate.characterLevel === nextLevel);
  if (!step) return { status: "unavailable", reason: `План пресета закінчився: рекомендацій для ${nextLevel}-го рівня немає.` };

  const plannedClasses = collectPlannedClasses(recipe, steps, pers.level);
  const mismatch = findCompositionMismatch(plannedClasses, pers.classes);
  if (mismatch) return { status: "unavailable", reason: mismatch };

  const { step: assembled, issues } = buildSingleAssemblyStep(step, catalog, buildLiveClassContext(pers.classes, plannedClasses));
  const fitted = fitToCharacter(assembled.input, step, pers);
  return {
    status: "ready",
    nextLevel,
    classKey: step.classKey,
    classLevel: step.classLevel,
    isMulticlassEntry: assembled.isMulticlassEntry,
    input: fitted.input,
    skipped: [...issues.filter((issue) => issue.code !== "unresolved-choice").map((issue) => issue.message), ...fitted.skipped],
    open: listOpenChoices(step.decisions ?? {}),
  };
}

type PlannedClass = { classLevel: number; subclassKey: string | null };

function collectPlannedClasses(recipe: BuildRecipe, steps: readonly BuildProgressionStep[], level: number): Map<string, PlannedClass> {
  const startingSubclass = recipe.progression.find((step) => step.characterLevel === 1)?.subclassKey ?? null;
  const planned = new Map<string, PlannedClass>([[recipe.startingClassKey, { classLevel: 1, subclassKey: startingSubclass }]]);
  for (const step of steps.filter((candidate) => candidate.characterLevel <= level)) {
    planned.set(step.classKey, { classLevel: step.classLevel, subclassKey: step.subclassKey ?? planned.get(step.classKey)?.subclassKey ?? null });
  }
  return planned;
}

function findCompositionMismatch(planned: ReadonlyMap<string, PlannedClass>, classes: readonly GuidedPersClass[]): string | null {
  const sameClasses = classes.length === planned.size && classes.every((entry) => planned.get(entry.classKey)?.classLevel === entry.classLevel);
  if (!sameClasses) return "Рівні класів персонажа відрізняються від плану пресета.";
  const otherSubclass = classes.some((entry) => {
    const plannedSubclass = planned.get(entry.classKey)?.subclassKey;
    return entry.subclassKey && plannedSubclass && entry.subclassKey !== plannedSubclass;
  });
  return otherSubclass ? "Підклас персонажа відрізняється від плану пресета." : null;
}

function buildLiveClassContext(classes: readonly GuidedPersClass[], planned: ReadonlyMap<string, PlannedClass>) {
  const subclassByClass = new Map<string, string>();
  for (const [classKey, entry] of planned) if (entry.subclassKey) subclassByClass.set(classKey, entry.subclassKey);
  for (const entry of classes) if (entry.subclassKey) subclassByClass.set(entry.classKey, entry.subclassKey);
  return { ownedClassKeys: new Set(classes.map((entry) => entry.classKey)), subclassByClass };
}

type FittedFields = { fields: Partial<LevelUpInput>; skipped: string | null };

function fitToCharacter(input: LevelUpInput, step: BuildProgressionStep, pers: GuidedPersState): { input: LevelUpInput; skipped: string[] } {
  const parts = [keepNewSubclass(input, step, pers), keepUnownedFeat(input, pers), keepAsiUnderCap(input, pers), keepUnownedOptions(input, pers)];
  const { subclassId: _subclassId, ...rest } = input;
  return {
    input: Object.assign({ ...rest }, ...parts.map((part) => part.fields)),
    skipped: parts.flatMap((part) => (part.skipped ? [part.skipped] : [])),
  };
}

function keepNewSubclass(input: LevelUpInput, step: BuildProgressionStep, pers: GuidedPersState): FittedFields {
  const hasSubclass = pers.classes.some((entry) => entry.classKey === step.classKey && entry.subclassKey);
  return { fields: input.subclassId !== undefined && !hasSubclass ? { subclassId: input.subclassId } : {}, skipped: null };
}

function keepUnownedFeat(input: LevelUpInput, pers: GuidedPersState): FittedFields {
  if (input.featId === undefined || !pers.nonRepeatableFeatIds.includes(input.featId)) return { fields: {}, skipped: null };
  return { fields: { featId: undefined, featChoiceSelections: {} }, skipped: "Рису з плану персонаж уже має — оберіть іншу рису або підвищення характеристик." };
}

function keepAsiUnderCap(input: LevelUpInput, pers: GuidedPersState): FittedFields {
  const isOverCap = input.customAsi.some((increase) => pers.abilityScores[increase.ability as Ability] + Number(increase.value) > MAX_ABILITY_SCORE);
  return isOverCap ? { fields: { customAsi: [] }, skipped: "Підвищення характеристик із плану перевищило б 20 — розподіліть його самі." } : { fields: {}, skipped: null };
}

function keepUnownedOptions(input: LevelUpInput, pers: GuidedPersState): FittedFields {
  const classChoiceSelections = dropOwnedOptions(input.classChoiceSelections, pers.choiceOptionIds);
  const subclassChoiceSelections = dropOwnedOptions(input.subclassChoiceSelections, pers.choiceOptionIds);
  const hasDropped = countSelections(classChoiceSelections) + countSelections(subclassChoiceSelections) < countSelections(input.classChoiceSelections) + countSelections(input.subclassChoiceSelections);
  return { fields: { classChoiceSelections, subclassChoiceSelections }, skipped: hasDropped ? "Частину опцій класу з плану персонаж уже має — оберіть замість них інші." : null };
}

function dropOwnedOptions(selections: LevelUpInput["classChoiceSelections"], ownedIds: readonly number[]): LevelUpInput["classChoiceSelections"] {
  const entries = Object.entries(selections).flatMap(([group, value]) => {
    const kept = (Array.isArray(value) ? value : [value]).filter((id) => !ownedIds.includes(id));
    if (!kept.length) return [];
    return [[group, kept.length === 1 && !Array.isArray(value) ? kept[0] : kept] as const];
  });
  return Object.fromEntries(entries);
}

function countSelections(selections: LevelUpInput["classChoiceSelections"]): number {
  return Object.values(selections).flat().length;
}

function listOpenChoices(decisions: LevelDecisions): string[] {
  return [
    ...(decisions.openSpellPicks ?? []).map((pick) => `${capitalize(OPEN_SPELL_LABELS[pick.category] ?? "заклинання")}: оберіть ${pick.count}.`),
    ...(decisions.openAdvancement ? ["Риса або підвищення характеристик — на ваш вибір."] : []),
    ...(decisions.openClassOptions ? ["Опції класу цього рівня — на ваш вибір."] : []),
  ];
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
