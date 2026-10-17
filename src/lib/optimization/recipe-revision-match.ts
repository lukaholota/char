import { listExecutableSteps } from "./build-executable-levels";
import type { BuildProgressionStep, BuildRecipe } from "./types";

const MAX_CHARACTER_LEVEL = 20;

export const UNKNOWN_REVISION_REASON = "Автор оновив пресет після створення персонажа. Продовження для вашої версії плану недоступне.";

export function findRevisionMismatchReason(current: BuildRecipe, createdFrom: BuildRecipe | null, persLevel: number): string | null {
  if (!createdFrom || createdFrom.buildId !== current.buildId) return UNKNOWN_REVISION_REASON;
  const sharedLevel = findSharedPlanLevel(createdFrom, current);
  if (persLevel <= sharedLevel) return null;
  return `Автор змінив план пресета з ${sharedLevel + 1}-го рівня, а персонаж уже ${persLevel}-го. Підвищуйте рівень вручну.`;
}

export function findSharedPlanLevel(previous: BuildRecipe, next: BuildRecipe): number {
  if (describeStart(previous) !== describeStart(next)) return 0;
  const nextSteps = new Map(listExecutableSteps(next).map((step) => [step.characterLevel, step]));
  const firstChange = listExecutableSteps(previous).find((step) => {
    const nextStep = nextSteps.get(step.characterLevel);
    return !nextStep || describeStep(previous, step) !== describeStep(next, nextStep);
  });
  return firstChange ? firstChange.characterLevel - 1 : MAX_CHARACTER_LEVEL;
}

function describeStart(recipe: BuildRecipe): string {
  const firstStep = recipe.progression.find((step) => step.characterLevel === 1);
  return toComparableJson({
    startingClassKey: recipe.startingClassKey,
    origin: describeOrigin(recipe),
    initialChoices: listChoices(recipe, recipe.initialChoices),
    firstStep: firstStep ? describeStep(recipe, firstStep) : null,
  });
}

function describeOrigin({ details }: BuildRecipe) {
  if (!details) return null;
  const { raceKey, variantKey, backgroundKey, featKey, subclassKey, abilityScores } = details;
  return { raceKey, variantKey, backgroundKey, featKey, subclassKey, abilityScores };
}

function describeStep(recipe: BuildRecipe, step: BuildProgressionStep): string {
  return toComparableJson({ ...step, choices: listChoices(recipe, step.choiceIds) });
}

function listChoices(recipe: BuildRecipe, choiceIds: string[]) {
  return choiceIds.map((choiceId) => recipe.choices.find((choice) => choice.choiceId === choiceId) ?? choiceId);
}

function toComparableJson(value: unknown): string {
  return JSON.stringify(dropPresentationFields(value));
}

function dropPresentationFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(dropPresentationFields);
  if (!value || typeof value !== "object") return value;
  const entries = Object.entries(value)
    .filter(([key, field]) => key !== "sourceRefs" && field !== undefined && !(Array.isArray(field) && field.length === 0))
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([key, field]) => [key, dropPresentationFields(field)]);
  return Object.fromEntries(entries);
}
