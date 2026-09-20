/**
 * KR27.2 / KR31.9 — передумова входу в новий клас: підказка, не заборона.
 *
 * Книга вимагає 13+ у базовій характеристиці класу, **який береш**, і (2024) у базових
 * характеристиках **усіх, які вже маєш** (SRD 2024, Multiclassing → Prerequisites).
 *
 * `multiclassReqs` у даних має три форми: `required` (усі перелічені — так записані класи 2014),
 * `and` (усі перелічені — монах, паладин і слідопит 2024) і `choice` (досить однієї — решта 2024).
 * У 2014 перевіряється лише новий клас і лише форма `required` (Fighter 2014 записаний формою
 * `choice`, тож для нього перевірка мовчки не спрацьовує — задокументований виняток, не баг).
 *
 * **Результат — попередження, не блок (рішення власника, 2026-09-06).** Характеристика могла
 * впасти вже після того, як клас узятий — прокляття, знятий магічний предмет — а книга при цьому
 * не забирає клас назад. Гейт на вході в новий клас однаково фрагільний: сервер більше не
 * відхиляє мультиклас (`executeLevelUp` цю функцію не викликає), лише форма підвищення показує
 * `describeMulticlassEntryProblem` як попередження біля вибору класу — та сама політика «правила
 * підказують, не забороняють», що вже стоїть на рисах (Р26/Р39, KR18.3).
 */
import type { AbilityKey } from "./types";

export type MulticlassRuleset = "RULES_2014" | "RULES_2024";

export type MulticlassAbilityRequirement = {
  score?: number | null;
  required?: readonly AbilityKey[] | null;
  and?: readonly AbilityKey[] | null;
  choice?: readonly AbilityKey[] | null;
};

export type MulticlassEntryClass = {
  name: string;
  multiclassReqs?: MulticlassAbilityRequirement | null;
};

export type MulticlassEntryProblem = {
  className: string;
  score: number;
  needsAll: boolean;
  requiredAbilities: AbilityKey[];
  unmetAbilities: Array<{ ability: AbilityKey; actual: number }>;
};

const DEFAULT_REQUIRED_SCORE = 13;

export function findMulticlassEntryProblem(args: {
  ruleset: MulticlassRuleset;
  abilityScores: Readonly<Partial<Record<AbilityKey, number>>>;
  currentClasses: readonly MulticlassEntryClass[];
  newClass: MulticlassEntryClass;
}): MulticlassEntryProblem | null {
  const classesToCheck = args.ruleset === "RULES_2024"
    ? [args.newClass, ...args.currentClasses]
    : [args.newClass];

  for (const characterClass of classesToCheck) {
    const problem = findUnmetRequirement(characterClass, args.ruleset, args.abilityScores);
    if (problem) return problem;
  }

  return null;
}

function findUnmetRequirement(
  characterClass: MulticlassEntryClass,
  ruleset: MulticlassRuleset,
  abilityScores: Readonly<Partial<Record<AbilityKey, number>>>,
): MulticlassEntryProblem | null {
  const requirement = readRequirement(characterClass.multiclassReqs, ruleset);
  if (!requirement) return null;

  const { abilities, needsAll, score } = requirement;
  const shortfalls = abilities
    .map((ability) => ({ ability, actual: abilityScores[ability] ?? 0 }))
    .filter((entry) => entry.actual < score);

  const isMet = needsAll ? shortfalls.length === 0 : shortfalls.length < abilities.length;
  if (isMet) return null;

  return {
    className: characterClass.name,
    score,
    needsAll,
    requiredAbilities: [...abilities],
    unmetAbilities: shortfalls,
  };
}

/** «Монах вимагає Спритність 13 і Мудрість 13; у персонажа Мудрість 8.» */
export function describeMulticlassEntryProblem(
  problem: MulticlassEntryProblem,
  translate: (key: string) => string,
): string {
  const demanded = describeMulticlassRequirement(problem, translate);
  const owned = problem.unmetAbilities
    .map((unmet) => `${translate(unmet.ability)} ${unmet.actual}`)
    .join(", ");

  return `${translate(problem.className)} вимагає ${demanded}; у персонажа ${owned}.`;
}

/** «Спритність 13 і Мудрість 13» */
export function describeMulticlassRequirement(
  problem: MulticlassEntryProblem,
  translate: (key: string) => string,
): string {
  return problem.requiredAbilities
    .map((ability) => `${translate(ability)} ${problem.score}`)
    .join(problem.needsAll ? " і " : " або ");
}

function readRequirement(
  reqs: MulticlassAbilityRequirement | null | undefined,
  ruleset: MulticlassRuleset,
): { abilities: AbilityKey[]; needsAll: boolean; score: number } | null {
  if (!reqs) return null;
  const score = typeof reqs.score === "number" && Number.isFinite(reqs.score) ? reqs.score : DEFAULT_REQUIRED_SCORE;

  const everyOf = reqs.and?.length ? reqs.and : reqs.required;
  if (everyOf?.length) return { abilities: [...everyOf], needsAll: true, score };

  if (ruleset === "RULES_2024" && reqs.choice?.length) {
    return { abilities: [...reqs.choice], needsAll: false, score };
  }

  return null;
}
