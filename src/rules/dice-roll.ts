export type D20Mode = "NORMAL" | "ADVANTAGE" | "DISADVANTAGE";

export type DiceCount = { count: number; sides: number };

const FALLBACK_DAMAGE_DICE: DiceCount = { count: 1, sides: 4 };

export function countD20Dice(mode: D20Mode): number {
  return mode === "NORMAL" ? 1 : 2;
}

export function pickD20Value(values: readonly number[], mode: D20Mode): number {
  if (mode === "ADVANTAGE") return Math.max(...values);
  if (mode === "DISADVANTAGE") return Math.min(...values);
  return values[0];
}

export function parseDiceNotation(notation: string): DiceCount {
  const normalized = notation.toLowerCase().replace(/[кk]/g, "d").replace(/\s+/g, "");
  const match = normalized.match(/(\d*)d(\d+)/);
  if (!match) return FALLBACK_DAMAGE_DICE;
  return {
    count: Math.max(1, Math.trunc(Number(match[1] || "1"))),
    sides: Math.max(2, Math.trunc(Number(match[2]))),
  };
}
