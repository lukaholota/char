import type { RulesetId } from "./strategies/types";

/** SRD 5.2, «Choose Languages»: кожен персонаж знає Загальну плюс дві мови зі стандартної таблиці. */
export const ORIGIN_LANGUAGE_2024 = "COMMON";

export const STANDARD_LANGUAGES_2024: readonly string[] = [
  "COMMON",
  "COMMON_SIGN_LANGUAGE",
  "DRACONIC",
  "DWARVISH",
  "ELVISH",
  "GIANT",
  "GNOMISH",
  "GOBLIN",
  "HALFLING",
  "ORC",
];

const ORIGIN_LANGUAGE_CHOICES_2024 = 2;

/**
 * 2014 складає лічильники виду, підвиду, класу, походження й рис. 2024 їх не складає — Origin
 * дає рівно дві мови незалежно від того, скільки джерел щось обіцяють.
 */
export function countOriginLanguageChoices(
  ruleset: RulesetId,
  sourceCounts: ReadonlyArray<number | null | undefined>,
): number {
  if (ruleset === "RULES_2024") return ORIGIN_LANGUAGE_CHOICES_2024;
  return sourceCounts.reduce<number>((total, count) => total + toCount(count), 0);
}

export function collectOriginLanguages(ruleset: RulesetId, granted: readonly string[]): string[] {
  const languages = ruleset === "RULES_2024" ? [ORIGIN_LANGUAGE_2024, ...granted] : granted;
  return Array.from(new Set(languages.filter(Boolean)));
}

export function listChoosableLanguages(
  ruleset: RulesetId,
  allLanguages: readonly string[],
  known: readonly string[],
): string[] {
  const knownLanguages = new Set(known);
  const pool = ruleset === "RULES_2024" ? STANDARD_LANGUAGES_2024 : allLanguages;
  return pool.filter((language) => !knownLanguages.has(language));
}

function toCount(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}
