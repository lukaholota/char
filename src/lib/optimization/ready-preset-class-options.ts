import { checkPrerequisite } from "@/lib/logic/prerequisiteUtils";
import type { AssemblyChoiceContext, LevelStep, ReadyPresetLevels } from "./ready-preset-levels";

export type OptionRef = { optionNameEng: string; groupName?: string };
export type ClassOptionPoolEntry = { id: number; nameEng: string; name: string; groupName: string; levelsGranted: number[]; prerequisites: unknown };
export type LevelOptionPick = { defaults: { nameEng: string; groupName: string }[] };
export type OptionReplacement = { drop: string; add: string };
export type ClassOptionChoices = Record<string, string[]>;

export type OpenClassOptionRequest = { characterLevel: number; classOptions: OptionRef[] };

export function buildOptionKey(characterLevel: number): string {
  return String(characterLevel);
}

export function listOpenOptionSteps(levels: ReadyPresetLevels, targetLevel: number): LevelStep[] {
  return levels.steps.filter((step) => step.characterLevel <= targetLevel && step.optionPick);
}

export function listEffectiveOptionNames(step: LevelStep, choices: ClassOptionChoices): string[] {
  if (!step.optionPick) return step.classOptionNames;
  return choices[buildOptionKey(step.characterLevel)] ?? step.optionPick.defaults.map((entry) => entry.nameEng);
}

export function listOwnedOptionNamesBeforeLevel(context: AssemblyChoiceContext, step: LevelStep): string[] {
  const pool = context.levels.classOptionPools[step.classKey] ?? [];
  const startNames = step.classKey === context.levels.startingClassKey ? pool.filter((entry) => context.start.classOptionIds.includes(entry.id)).map((entry) => entry.nameEng) : [];
  const owned = new Set(startNames);
  const earlierSteps = context.levels.steps.filter((entry) => entry.classKey === step.classKey && entry.characterLevel < step.characterLevel && entry.characterLevel <= context.targetLevel);
  for (const earlier of earlierSteps) {
    earlier.replacedOptions.forEach((replacement) => owned.delete(replacement.drop));
    listEffectiveOptionNames(earlier, context.classOptionChoices).forEach((name) => owned.add(name));
    earlier.replacedOptions.forEach((replacement) => owned.add(replacement.add));
  }
  return [...owned];
}

export function listOptionCandidates(context: AssemblyChoiceContext, step: LevelStep, position: number): ClassOptionPoolEntry[] {
  const pick = step.optionPick!;
  const pool = context.levels.classOptionPools[step.classKey] ?? [];
  const chosen = listEffectiveOptionNames(step, context.classOptionChoices);
  const owned = new Set([...listOwnedOptionNamesBeforeLevel(context, step), ...chosen.filter((_name, index) => index !== position)]);
  const pact = [...owned].find((name) => name.startsWith("Pact of")) ?? undefined;
  const ownedIds = pool.filter((entry) => owned.has(entry.nameEng)).map((entry) => entry.id);
  return pool.filter((entry) => entry.groupName === pick.defaults[position].groupName
    && entry.levelsGranted.includes(step.classLevel)
    && !owned.has(entry.nameEng)
    && checkPrerequisite(entry.prerequisites, { classLevel: step.classLevel, pact, existingChoiceOptionIds: ownedIds }).met);
}

export function findClassOptionProblem(context: AssemblyChoiceContext): string | null {
  for (const step of listOpenOptionSteps(context.levels, context.targetLevel)) {
    const chosen = listEffectiveOptionNames(step, context.classOptionChoices);
    if (new Set(chosen).size !== chosen.length) return `Рівень ${step.characterLevel}, ${step.className}: той самий вибір обрано двічі.`;
    const rejected = chosen.findIndex((name, position) => !listOptionCandidates(context, step, position).some((entry) => entry.nameEng === name));
    if (rejected >= 0) return `Рівень ${step.characterLevel}, ${step.className}: «${chosen[rejected]}» недоступний на цьому рівні.`;
  }
  return null;
}

export function buildClassOptionSelections(levels: ReadyPresetLevels, targetLevel: number, choices: ClassOptionChoices): OpenClassOptionRequest[] {
  return listOpenOptionSteps(levels, targetLevel).flatMap((step) => {
    const chosen = choices[buildOptionKey(step.characterLevel)];
    if (!chosen) return [];
    return [{ characterLevel: step.characterLevel, classOptions: chosen.map((name, position) => ({ optionNameEng: name, groupName: step.optionPick!.defaults[position].groupName })) }];
  });
}
