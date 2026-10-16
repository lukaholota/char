import { getAllClasses, type ClassData } from "@/lib/classesData";
import { listExecutableSteps } from "./build-executable-levels";
import type { BuildProgressionStep, BuildRecipe } from "./types";

type BuildStep = Pick<BuildProgressionStep, "characterLevel" | "classKey" | "subclassKey">;
type SubclassChoice = { classKey: string; subclassKey: string; characterLevel: number | null };

export function findReadyPresetClass(recipe: BuildRecipe) {
  const classes = getAllClasses(recipe.ruleset);
  const steps = listBuildSteps(recipe);
  const characterClass = findCatalogClass(classes, recipe.startingClassKey, recipe);
  const first = resolveSubclassChoice(classes, findFirstSubclassChoice(recipe, steps), recipe);
  const mainClass = findCatalogClass(classes, findMainClassKey(steps), recipe);
  const main = resolveSubclassChoice(classes, findMainSubclassChoice(recipe, steps, mainClass.key), recipe);
  return {
    characterClass, subclassClass: first.ownerClass, subclass: first.subclass, subclassLevel: first.characterLevel,
    mainClass, mainSubclass: main.subclass, mainSubclassLevel: main.characterLevel,
    startingClassLevels: countStartingClassLevels(recipe, steps),
  };
}

function listBuildSteps(recipe: BuildRecipe): BuildStep[] {
  const start = recipe.progression.find((step) => step.characterLevel === 1) ?? { characterLevel: 1, classKey: recipe.startingClassKey };
  return [start, ...listExecutableSteps(recipe)];
}

function findFirstSubclassChoice(recipe: BuildRecipe, steps: readonly BuildStep[]): SubclassChoice | undefined {
  const planned = recipe.details?.subclassKey;
  const plannedStep = planned ? steps.find((step) => step.classKey === recipe.startingClassKey && step.subclassKey === planned) : undefined;
  const reached = plannedStep ?? steps.find((step) => step.subclassKey);
  if (reached) return toSubclassChoice(reached);
  return planned ? { classKey: recipe.startingClassKey, subclassKey: planned, characterLevel: null } : undefined;
}

function findMainClassKey(steps: readonly BuildStep[]): string {
  const levelsByClass = new Map<string, number>();
  for (const step of steps) levelsByClass.set(step.classKey, (levelsByClass.get(step.classKey) ?? 0) + 1);
  const mostLevels = Math.max(...levelsByClass.values());
  return [...levelsByClass].find(([, levels]) => levels === mostLevels)![0];
}

function findMainSubclassChoice(recipe: BuildRecipe, steps: readonly BuildStep[], mainClassKey: string): SubclassChoice | undefined {
  const reached = steps.find((step) => step.classKey === mainClassKey && step.subclassKey);
  if (reached) return toSubclassChoice(reached);
  const planned = mainClassKey === recipe.startingClassKey ? recipe.details?.subclassKey : undefined;
  return planned ? { classKey: mainClassKey, subclassKey: planned, characterLevel: null } : undefined;
}

function toSubclassChoice(step: BuildStep): SubclassChoice {
  return { classKey: step.classKey, subclassKey: step.subclassKey!, characterLevel: step.characterLevel };
}

function resolveSubclassChoice(classes: readonly ClassData[], choice: SubclassChoice | undefined, recipe: BuildRecipe) {
  const ownerClass = choice && classes.find((entry) => entry.key === choice.classKey);
  const subclass = ownerClass?.subclasses.find((entry) => entry.key === choice!.subclassKey);
  if (!ownerClass || !subclass) throw new Error(`Missing ready preset class: ${recipe.buildId}`);
  return { ownerClass, subclass, characterLevel: choice!.characterLevel ?? ownerClass.subclassLevel };
}

function findCatalogClass(classes: readonly ClassData[], classKey: string, recipe: BuildRecipe): ClassData {
  const characterClass = classes.find((entry) => entry.key === classKey);
  if (!characterClass) throw new Error(`Missing ready preset class: ${recipe.buildId}`);
  return characterClass;
}

function countStartingClassLevels(recipe: BuildRecipe, steps: readonly BuildStep[]): number {
  const switchIndex = steps.findIndex((step) => step.classKey !== recipe.startingClassKey);
  return switchIndex === -1 ? steps.length : switchIndex;
}
