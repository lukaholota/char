import type { BuildProgressionStep, BuildRecipe } from "./types";

export type ProgressionIssue = { characterLevel: number; code: string; message: string };

export function listExecutableSteps(recipe: BuildRecipe): BuildProgressionStep[] {
  return scanExecutableSteps(recipe).steps;
}

export function findExecutableLevels(recipe: BuildRecipe): number[] {
  const { steps } = scanExecutableSteps(recipe);
  return [1, ...steps.map((step) => step.characterLevel)];
}

export function findProgressionIssues(recipe: BuildRecipe): ProgressionIssue[] {
  const { issues } = scanExecutableSteps(recipe);
  const executable = new Set(findExecutableLevels(recipe));
  const unsupported = recipe.supportedLevels
    .filter((level) => !executable.has(level))
    .map((level) => ({ characterLevel: level, code: "level-not-executable", message: `Level ${level} has no executable progression` }));
  return [...issues, ...unsupported];
}

type ScanState = {
  levelsByClass: Map<string, number>;
  subclassChosen: Set<string>;
};

function scanExecutableSteps(recipe: BuildRecipe): { steps: BuildProgressionStep[]; issues: ProgressionIssue[] } {
  const state: ScanState = { levelsByClass: new Map([[recipe.startingClassKey, 1]]), subclassChosen: new Set() };
  const steps: BuildProgressionStep[] = [];
  for (let characterLevel = 2; characterLevel <= 20; characterLevel++) {
    const step = recipe.progression.find((candidate) => candidate.characterLevel === characterLevel);
    if (!step?.decisions) break;
    const issue = findStepIssue(step, state);
    if (issue) return { steps, issues: [issue] };
    recordStep(step, state);
    steps.push(step);
  }
  return { steps, issues: [] };
}

function findStepIssue(step: BuildProgressionStep, state: ScanState): ProgressionIssue | null {
  const expectedClassLevel = (state.levelsByClass.get(step.classKey) ?? 0) + 1;
  if (step.classLevel !== expectedClassLevel) {
    return { characterLevel: step.characterLevel, code: "class-level-order", message: `${step.classKey} must be level ${expectedClassLevel}, not ${step.classLevel}` };
  }
  if (step.subclassKey && state.subclassChosen.has(step.classKey)) {
    return { characterLevel: step.characterLevel, code: "subclass-repeated", message: `${step.classKey} already has a subclass` };
  }
  return null;
}

function recordStep(step: BuildProgressionStep, state: ScanState): void {
  state.levelsByClass.set(step.classKey, step.classLevel);
  if (step.subclassKey) state.subclassChosen.add(step.classKey);
}
