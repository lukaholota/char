import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { listAssemblyLevelChanges, summarizeClassLevels, type AssemblyLevelChange } from "./assembly-summary";
import { buildAssemblyPlan, type AssemblyIssue } from "./assembly-plan";
import { findExecutableLevels, findProgressionIssues, type ProgressionIssue } from "./build-executable-levels";
import { buildWalkEnvironment, walkProgression, type ProgressionWalkInput } from "./progression-walk";
import type { AssemblyCatalog } from "./assembly-catalog";
import type { BuildRecipe } from "./types";

export type ProgressionReport = { errors: string[]; warnings: string[]; summary: string[] };

const NO_PROGRESSION: ProgressionReport = { errors: [], warnings: [], summary: [] };

export function findProgressionProblems(input: ProgressionWalkInput): ProgressionReport {
  const { recipe } = input;
  const executableLevels = findExecutableLevels(recipe);
  const structural = findProgressionIssues(recipe).map(describeProgressionIssue);
  if (executableLevels.length === 1) return structural.length ? { ...NO_PROGRESSION, errors: structural } : NO_PROGRESSION;
  const env = buildWalkEnvironment(input);
  const walk = walkProgression(env, input.draft);
  const planIssues = findPlanIssues(recipe, executableLevels, env.catalog, walk.openSelections);
  return {
    errors: [...structural, ...walk.errors, ...planIssues],
    warnings: [...walk.warnings, ...findUndeclaredLevelWarnings(recipe, executableLevels)],
    summary: describeProgressionSummary(recipe, executableLevels, env.catalog),
  };
}

function findPlanIssues(recipe: BuildRecipe, executableLevels: readonly number[], catalog: AssemblyCatalog, openSelections: Parameters<typeof buildAssemblyPlan>[0]["openSelections"]): string[] {
  const result = buildAssemblyPlan({ recipe: { ...recipe, supportedLevels: [...executableLevels] }, targetLevel: Math.max(...executableLevels), catalog, openSelections });
  return result.issues.map(describeAssemblyIssue);
}

function describeAssemblyIssue(issue: AssemblyIssue): string {
  const place = issue.characterLevel === null ? "" : `рівень ${issue.characterLevel}: `;
  return `${place}${issue.message}${issue.hint ? `. ${issue.hint}` : ""}`;
}

function describeProgressionIssue(issue: ProgressionIssue): string {
  const place = `рівень ${issue.characterLevel}: `;
  if (issue.code === "level-not-executable") return `${place}заявлений у supportedLevels, але не має безперервного ланцюга кроків із decisions від 2-го рівня`;
  if (issue.code === "class-level-order") return `${place}порядок рівнів класу порушено (${issue.message})`;
  if (issue.code === "subclass-repeated") return `${place}підклас цього класу вже обрано раніше`;
  return `${place}${issue.message}`;
}

function findUndeclaredLevelWarnings(recipe: BuildRecipe, executableLevels: readonly number[]): string[] {
  const undeclared = executableLevels.filter((level) => !recipe.supportedLevels.includes(level));
  return undeclared.length ? [`Рівні ${undeclared.join(", ")} виконувані, але не оголошені в supportedLevels: користувач їх не побачить`] : [];
}

function describeProgressionSummary(recipe: BuildRecipe, executableLevels: readonly number[], catalog: AssemblyCatalog): string[] {
  const lastLevel = Math.max(...executableLevels);
  const classes = summarizeClassLevels(recipe, lastLevel).map((entry) => `${translateValue(entry.classKey)} ${entry.classLevel}`).join(" + ");
  const header = `Виконувані рівні 1–${lastLevel} (supportedLevels: ${recipe.supportedLevels.join(", ")}); на ${lastLevel}-му: ${classes}`;
  return [header, ...listAssemblyLevelChanges(recipe, lastLevel, catalog).map(describeLevelChange)];
}

function describeLevelChange(change: AssemblyLevelChange): string {
  const entry = change.isMulticlassEntry ? " (новий клас)" : "";
  const parts = [
    change.subclassKey ? `підклас ${change.subclassKey}` : null,
    change.abilityScoreIncrease.length ? `підвищення: ${change.abilityScoreIncrease.map((item) => `${translateValue(item.ability)} +${item.amount}`).join(", ")}` : null,
    change.featKey ? `риса ${change.featKey}` : null,
    change.optionNames.length ? `вибори: ${change.optionNames.join(", ")}` : null,
    change.expertise.length ? `експертиза: ${change.expertise.map((skill) => translateValue(skill)).join(", ")}` : null,
    change.skillProficiencies.length ? `навички: ${change.skillProficiencies.map((skill) => translateValue(skill)).join(", ")}` : null,
    change.infusions.length ? `вливання: ${change.infusions.join(", ")}` : null,
    change.spellKeys.length ? `заклинання: ${change.spellKeys.join(", ")}` : null,
    change.featureSpellKeys.length ? `заклинання від уміння: ${change.featureSpellKeys.join(", ")}` : null,
    change.replacements.length ? `заміна: ${change.replacements.join("; ")}` : null,
    ...change.openSpellPicks.map((pick) => `на вибір гравця: ${pick.count} (${pick.category})`),
    change.featureNames.length ? `здібності класу: ${change.featureNames.join(", ")}` : null,
  ].filter((part): part is string => part !== null);
  return `Рівень ${change.characterLevel} · ${translateValue(change.classKey)} ${change.classLevel}${entry}: ${parts.join("; ") || "без виборів"}`;
}
