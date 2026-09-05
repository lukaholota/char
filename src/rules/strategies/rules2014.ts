import { addAbilityBonuses, getPlainBonuses, getSimpleBonuses, normalizeASI } from "../abilities";
import { isAbilityScoreIncreaseLevel, needsSubclassSelection } from "../progression";
import type { AbilityScores, ClassProgression } from "../types";
import type { OriginFeatRequirement, RulesStrategy } from "./types";
import { STANDARD_ABILITY_SCORE_CEILING } from "../ability-score-ceiling";

export const rules2014Strategy: RulesStrategy = {
  ruleset: "RULES_2014",
  needsSubclassSelection,
  isAbilityScoreIncreaseLevel,
  isEpicBoonLevel(_progression: ClassProgression, _level: number): boolean {
    return false;
  },
  applySpeciesASI(scores: AbilityScores, speciesASI?: unknown): AbilityScores {
    if (!speciesASI) return scores;
    const normalized = normalizeASI(speciesASI);
    let updated = addAbilityBonuses(scores, getSimpleBonuses(normalized)) as AbilityScores;
    updated = addAbilityBonuses(updated, getPlainBonuses(speciesASI)) as AbilityScores;
    return Object.fromEntries(
      Object.entries(updated).map(([ability, score]) => [ability, Math.min(STANDARD_ABILITY_SCORE_CEILING, score)]),
    ) as AbilityScores;
  },
  applyBackgroundASI(scores: AbilityScores): AbilityScores {
    return scores;
  },
  validateBackgroundASI(): boolean {
    return false;
  },
  getOriginFeatRequirement(): OriginFeatRequirement {
    return { required: false, originFeatId: null };
  },
};

