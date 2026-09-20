import type { RollModifier, StateEffects } from "./state-effects";
import type { Ruleset } from "./spell-buffs";

export const MAX_EXHAUSTION_LEVEL = 6;
export const EXHAUSTION_SOURCE_KEY = "EXHAUSTION";

export function clampExhaustionLevel(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(MAX_EXHAUSTION_LEVEL, Math.trunc(level)));
}

/// Обидві редакції знімають один рівень за довгий відпочинок.
export function findExhaustionAfterLongRest(level: number): number {
  return Math.max(0, clampExhaustionLevel(level) - 1);
}

export function findExhaustionPart(level: number, ruleset: Ruleset): Partial<StateEffects> | null {
  const clamped = clampExhaustionLevel(level);
  if (clamped === 0) return null;
  return ruleset === "RULES_2024" ? findExhaustionPart2024(clamped) : findExhaustionPart2014(clamped);
}

/// 2024: кидок к20 менший на 2 × рівень, Швидкість — на 5 × рівень футів, 6-й рівень — смерть.
function findExhaustionPart2024(level: number): Partial<StateEffects> {
  return {
    d20Penalty: 2 * level,
    speedBonus: -5 * level,
    marks: level >= MAX_EXHAUSTION_LEVEL ? [{ kind: "EXHAUSTION_DEATH" }] : [],
  };
}

/// 2014: кожен рівень додає своє до всіх нижчих — таблиця «Exhaustion Effects».
function findExhaustionPart2014(level: number): Partial<StateEffects> {
  const disadvantage = (scope: RollModifier["scope"]): RollModifier => ({ mode: "DISADVANTAGE", scope, sourceKey: EXHAUSTION_SOURCE_KEY });
  return {
    rollModifiers: [
      disadvantage("ABILITY_CHECK"),
      ...(level >= 3 ? [disadvantage("ATTACK"), disadvantage("SAVE")] : []),
    ],
    speedMultiplier: level >= 2 ? 0.5 : 1,
    isMaxHpHalved: level >= 4,
    isSpeedZero: level >= 5,
    marks: level >= MAX_EXHAUSTION_LEVEL ? [{ kind: "EXHAUSTION_DEATH" }] : [],
  };
}
