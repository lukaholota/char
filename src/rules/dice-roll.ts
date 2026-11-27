export type D20Mode = "NORMAL" | "ADVANTAGE" | "DISADVANTAGE";

export type DiceCount = { count: number; sides: number };

const FALLBACK_DAMAGE_DICE: DiceCount = { count: 1, sides: 4 };

export function countD20Dice(mode: D20Mode): number {
  return mode === "NORMAL" ? 1 : 2;
}

/// Кидок без к20 — це кількість (шкода, лікування): не нижче 0, а штраф кубиком стану лишає хоч 1.
export function limitRollTotal(rawTotal: number, isD20: boolean, extraTotal: number): number {
  return isD20 ? rawTotal : Math.max(extraTotal < 0 ? 1 : 0, rawTotal);
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
