import type { Ruleset } from "./spell-buffs";

export const CONCENTRATION_EFFECT_KEY = "CONCENTRATION";

/// СК = 10 або половина шкоди (вниз), що більше; 2024 додає стелю 30.
export function findConcentrationSaveDc(damage: number, ruleset: Ruleset): number {
  const halfDamage = Math.floor(Math.max(0, damage) / 2);
  const dc = Math.max(10, halfDamage);
  return ruleset === "RULES_2024" ? Math.min(30, dc) : dc;
}

/// У базі «так» / «ні» — рядок, а не прапорець.
export function isConcentrationSpell(hasConcentration: string | null | undefined): boolean {
  return (hasConcentration ?? "").trim().toLowerCase() === "так";
}
