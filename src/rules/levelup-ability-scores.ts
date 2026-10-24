import {
  findAbilityScoreCeiling,
  findFeatAbilityScoreSource,
  raiseAbilityScore,
} from "./ability-score-ceiling";
import type { AbilityKey, AbilityScores, Ruleset } from "./types";
import { applyAbilityIncreases, collectFeatGrants, type FeatGrantOption } from "./feat-grants";

const ABILITIES: readonly AbilityKey[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

type LevelUpAbilityScoreFeat = { category?: string | null; grantedASI?: unknown; featChoiceOptions?: readonly FeatGrantOption[] };

type AbilityScoreIncreasePick = { ability?: string | null; value?: string | number | null };

export function findAbilityScoresAfterLevelUp(input: {
  scores: AbilityScores;
  ruleset: Ruleset | null | undefined;
  classIncreases?: unknown;
  feat?: LevelUpAbilityScoreFeat | null;
  featChoiceSelections?: Record<string, number | number[]>;
}): AbilityScores {
  const withClassIncrease = raiseScoresBy(
    input.scores,
    readClassIncreases(input.classIncreases),
    findAbilityScoreCeiling({ ruleset: input.ruleset, source: "STANDARD" }),
  );

  const chosenOptionIds = [...new Set(Object.values(input.featChoiceSelections ?? {}).flat())];
  const grants = collectFeatGrants({
    name: "", ruleset: input.ruleset ?? "RULES_2014", grantedASI: input.feat?.grantedASI, grantedSkills: null,
    featChoiceOptions: input.feat?.featChoiceOptions ?? [],
  }, chosenOptionIds);
  return applyAbilityIncreases(withClassIncrease, grants.abilityIncreases,
    findAbilityScoreCeiling({ ruleset: input.ruleset, source: findFeatAbilityScoreSource(input.feat?.category) }));
}

function raiseScoresBy(scores: AbilityScores, increases: Partial<Record<AbilityKey, number>>, ceiling: number): AbilityScores {
  const raised = { ...scores };
  for (const ability of ABILITIES) {
    const increase = increases[ability];
    if (increase) raised[ability] = raiseAbilityScore(raised[ability], increase, ceiling);
  }
  return raised;
}

function readClassIncreases(picks: unknown): Partial<Record<AbilityKey, number>> {
  if (!Array.isArray(picks)) return {};

  const increases: Partial<Record<AbilityKey, number>> = {};
  for (const pick of picks as AbilityScoreIncreasePick[]) {
    const ability = toAbilityKey(pick?.ability);
    const value = Number(pick?.value);
    if (!ability || !Number.isFinite(value) || value === 0) continue;
    increases[ability] = (increases[ability] ?? 0) + value;
  }
  return increases;
}

function toAbilityKey(value: unknown): AbilityKey | null {
  const upper = String(value ?? "").trim().toUpperCase();
  return (ABILITIES as readonly string[]).includes(upper) ? (upper as AbilityKey) : null;
}
