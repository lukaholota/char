import type { AbilityKey, AbilityScores, BackgroundASIChoice, ClassProgression } from "../types";
import type { OriginFeatRequirement, RulesStrategy } from "./types";
import { STANDARD_ABILITY_SCORE_CEILING } from "../ability-score-ceiling";

export class Rules2024NotImplementedError extends Error {
  constructor(rule: string) {
    super(
      `RULES_2024: "${rule}" rule error — see docs/o6-rules-2024-import/kr6.3-implementation.md.`,
    );
    this.name = "Rules2024NotImplementedError";
  }
}

export const rules2024Strategy: RulesStrategy = {
  ruleset: "RULES_2024",

  needsSubclassSelection(_progression: ClassProgression, hasSubclass: boolean, level: number): boolean {
    return !hasSubclass && level >= 3;
  },

  isAbilityScoreIncreaseLevel(progression: ClassProgression, level: number): boolean {
    const epicBoonLevel = progression.epicBoonLevel ?? 19;
    if (level === epicBoonLevel) return false;
    const levels = progression.abilityScoreUpLevels ?? [4, 8, 12, 16];
    return levels.includes(level);
  },

  isEpicBoonLevel(progression: ClassProgression, level: number): boolean {
    const epicBoonLevel = progression.epicBoonLevel ?? 19;
    return level === epicBoonLevel;
  },

  applySpeciesASI(scores: AbilityScores, _speciesASI?: unknown): AbilityScores {
    // In PHB 2024, species/races do not grant ability score increases.
    return { ...scores };
  },

  validateBackgroundASI(allowedAbilities: readonly AbilityKey[], choice: BackgroundASIChoice): boolean {
    if (!choice || !Array.isArray(allowedAbilities) || allowedAbilities.length === 0) {
      return false;
    }

    const allowedSet = new Set(allowedAbilities);

    if (choice.mode === "+2/+1") {
      if (!choice.plusTwo || !choice.plusOne) return false;
      if (choice.plusTwo === choice.plusOne) return false;
      return allowedSet.has(choice.plusTwo) && allowedSet.has(choice.plusOne);
    }

    if (choice.mode === "+1/+1/+1") {
      if (!Array.isArray(choice.abilities) || choice.abilities.length !== 3) return false;
      const chosenSet = new Set(choice.abilities);
      if (chosenSet.size !== 3) return false;
      return choice.abilities.every((ability) => allowedSet.has(ability));
    }

    return false;
  },

  applyBackgroundASI(
    scores: AbilityScores,
    allowedAbilities: readonly AbilityKey[],
    choice: BackgroundASIChoice,
  ): AbilityScores {
    if (!this.validateBackgroundASI(allowedAbilities, choice)) {
      throw new Error("Invalid Background ASI choice for 2024 rules");
    }

    const updated: AbilityScores = { ...scores };

    if (choice.mode === "+2/+1") {
      updated[choice.plusTwo] = Math.min(STANDARD_ABILITY_SCORE_CEILING, (updated[choice.plusTwo] ?? 10) + 2);
      updated[choice.plusOne] = Math.min(STANDARD_ABILITY_SCORE_CEILING, (updated[choice.plusOne] ?? 10) + 1);
    } else if (choice.mode === "+1/+1/+1") {
      for (const ability of choice.abilities) {
        updated[ability] = Math.min(STANDARD_ABILITY_SCORE_CEILING, (updated[ability] ?? 10) + 1);
      }
    }

    return updated;
  },

  getOriginFeatRequirement(background: { originFeatId?: number | null }): OriginFeatRequirement {
    return {
      required: true,
      originFeatId: background.originFeatId ?? null,
    };
  },
};

