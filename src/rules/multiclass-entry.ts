/**
 * KR27.2 — передумова входу в новий клас.
 *
 * Книга 2024 вимагає 13+ у базовій характеристиці класу, **який береш**, і в базових
 * характеристиках **усіх, які вже маєш** (SRD 2024, Multiclassing → Prerequisites). До цього
 * правило жило тільки у формі підвищення рівня й дивилося лише на новий клас, тому сервер
 * приймав персонажа, якого книга не дозволяє.
 *
 * `multiclassReqs` у даних має три форми: `required` (усі перелічені — так записані класи 2014),
 * `and` (усі перелічені — монах, паладин і слідопит 2024) і `choice` (досить однієї — решта 2024).
 *
 * Редакція звужує перевірку навмисно. У 2024 діє повне правило. У 2014 перевіряється лише новий
 * клас і лише форма `required` — рівно те, що сьогодні робить форма підвищення рівня для
 * 9 394 живих персонажів (705 із них мультикласові). Двостороння перевірка в 2014 — та сама
 * книжкова норма, але вона забирає підвищення в персонажів, які вже існують, тож вмикати її —
 * окреме рішення власника, а не побічний ефект цього KR.
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
