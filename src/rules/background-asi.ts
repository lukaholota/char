import { getRulesStrategy } from "./strategies";
import type { RulesetId } from "./strategies/types";
import { STANDARD_ABILITY_SCORE_CEILING, raiseAbilityScore } from "./ability-score-ceiling";
import type { AbilityKey, AbilityScores, BackgroundASIChoice } from "./types";

export type BackgroundAsiMode = BackgroundASIChoice["mode"];

/** Незавершений вибір на екрані: користувач уже обрав режим, але ще не всі характеристики. */
export type BackgroundAsiDraft =
  | { mode: "+2/+1"; plusTwo?: AbilityKey; plusOne?: AbilityKey }
  | { mode: "+1/+1/+1"; abilities: AbilityKey[] };

export type BackgroundAsiStep = {
  allowedAbilities: AbilityKey[];
  modes: BackgroundAsiMode[];
};

export const BACKGROUND_ASI_MODES: BackgroundAsiMode[] = ["+2/+1", "+1/+1/+1"];

const SPREAD_SIZE = 3;

const MISSING_CHOICE = "Оберіть бонуси характеристик від походження.";
const WRONG_CHOICE = "Розподіл бонусів не відповідає характеристикам обраного походження.";

/**
 * Крок розподілу характеристик походження. У 2014 такого кроку немає — бонуси дає раса,
 * тому функція повертає null і екран лишається на расових бонусах.
 */
export function findBackgroundAsiStep(
  ruleset: RulesetId,
  abilityOptions: readonly string[] | null | undefined,
): BackgroundAsiStep | null {
  if (ruleset !== "RULES_2024") return null;

  const allowedAbilities = collectAllowedAbilities(abilityOptions);
  if (allowedAbilities.length === 0) return null;

  return { allowedAbilities, modes: [...BACKGROUND_ASI_MODES] };
}

/**
 * Чернетка на старті режиму. Коли походження дає рівно три характеристики, режим «+1 кожній»
 * не лишає вибору — розподіл відомий наперед, тому характеристики проставлені одразу.
 */
export function startBackgroundAsiDraft(
  mode: BackgroundAsiMode,
  allowedAbilities: readonly AbilityKey[],
): BackgroundAsiDraft {
  if (mode === "+2/+1") return { mode };

  return { mode, abilities: allowedAbilities.length === SPREAD_SIZE ? [...allowedAbilities] : [] };
}

/** Додає або знімає характеристику в режимі «+1 кожній», не пускаючи набір понад три. */
export function toggleBackgroundAsiSpread(
  draft: BackgroundAsiDraft & { mode: "+1/+1/+1" },
  ability: AbilityKey,
): BackgroundAsiDraft {
  const abilities = draft.abilities.includes(ability)
    ? draft.abilities.filter((candidate) => candidate !== ability)
    : [...draft.abilities, ability].slice(0, SPREAD_SIZE);

  return { mode: "+1/+1/+1", abilities };
}

/** Повний і дозволений вибір із чернетки екрана, або null — тоді крок ще не завершений. */
export function findCompleteBackgroundAsi(
  step: BackgroundAsiStep,
  draft: BackgroundAsiDraft | null | undefined,
): BackgroundASIChoice | null {
  if (!draft) return null;

  const choice: BackgroundASIChoice | null =
    draft.mode === "+2/+1"
      ? draft.plusTwo && draft.plusOne
        ? { mode: "+2/+1", plusTwo: draft.plusTwo, plusOne: draft.plusOne }
        : null
      : { mode: "+1/+1/+1", abilities: draft.abilities };

  if (!choice) return null;
  return getRulesStrategy("RULES_2024").validateBackgroundASI(step.allowedAbilities, choice) ? choice : null;
}

/** Повідомлення про проблему з розподілом, або null, якщо розподіл повний і дозволений. */
export function findBackgroundAsiProblem(
  ruleset: RulesetId,
  abilityOptions: readonly string[] | null | undefined,
  choice: BackgroundASIChoice | null | undefined,
): string | null {
  const step = findBackgroundAsiStep(ruleset, abilityOptions);
  if (!step) return null;
  if (!choice) return MISSING_CHOICE;

  return getRulesStrategy(ruleset).validateBackgroundASI(step.allowedAbilities, choice) ? null : WRONG_CHOICE;
}

/** Скільки бонусів дає кожна характеристика за поточною чернеткою — для живого підсумку на екрані. */
export function sumBackgroundAsiBonuses(
  draft: BackgroundAsiDraft | null | undefined,
): Partial<Record<AbilityKey, number>> {
  if (!draft) return {};

  if (draft.mode === "+2/+1") {
    const bonuses: Partial<Record<AbilityKey, number>> = {};
    if (draft.plusTwo) bonuses[draft.plusTwo] = 2;
    if (draft.plusOne) bonuses[draft.plusOne] = (bonuses[draft.plusOne] ?? 0) + 1;
    return bonuses;
  }

  return draft.abilities.reduce<Partial<Record<AbilityKey, number>>>((bonuses, ability) => {
    bonuses[ability] = (bonuses[ability] ?? 0) + 1;
    return bonuses;
  }, {});
}

export function raiseScoresByBackgroundAsi(
  scoresBefore: AbilityScores,
  bonuses: Partial<Record<AbilityKey, number>>,
): AbilityScores {
  const raised = { ...scoresBefore };
  for (const ability of Object.keys(bonuses) as AbilityKey[]) {
    raised[ability] = raiseAbilityScore(scoresBefore[ability], bonuses[ability] ?? 0, STANDARD_ABILITY_SCORE_CEILING);
  }
  return raised;
}

function collectAllowedAbilities(abilityOptions: readonly string[] | null | undefined): AbilityKey[] {
  if (!Array.isArray(abilityOptions)) return [];
  return abilityOptions.filter(isAbilityKey);
}

function isAbilityKey(value: unknown): value is AbilityKey {
  return value === "STR" || value === "DEX" || value === "CON" || value === "INT" || value === "WIS" || value === "CHA";
}
