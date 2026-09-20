import { attributesUkrShort } from "@/lib/refs/translation";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import {
  describeMulticlassEntryProblem,
  describeMulticlassRequirement,
  type MulticlassEntryProblem,
} from "@/rules/multiclass-entry";
import type { ClassRulesLock } from "@/lib/components/characterCreator/ClassesForm";

export function describeMulticlassLock(problem: MulticlassEntryProblem | null, className: string): ClassRulesLock | null {
  if (!problem) return null;
  const requirement = describeMulticlassRequirement(problem, translateAbilityShort);
  const note = problem.className === className
    ? `Проти правил: треба ${requirement}`
    : `Проти правил: ${translateValue(problem.className)} треба ${requirement}`;
  return { note, reason: describeMulticlassEntryProblem(problem, translateValue) };
}

function translateAbilityShort(key: string): string {
  return attributesUkrShort[key as keyof typeof attributesUkrShort] ?? translateValue(key);
}
