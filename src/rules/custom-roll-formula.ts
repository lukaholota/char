import type { AbilityKey } from "./types";

type CustomRollStatKey = AbilityKey | "PROFICIENCY" | "LEVEL";
type CustomRollStatTerm = { stat: CustomRollStatKey; sign: 1 | -1 };

export type CustomRollFormula = { label: string; count: number; sides: number; flatBonus: number; stats: CustomRollStatTerm[] };
export type CustomRollStats = { abilityModifiers: Record<AbilityKey, number>; proficiencyBonus: number; level: number };
export type CustomRollParseResult = { formulas: CustomRollFormula[]; error: string | null };

const MAX_FORMULAS = 6;
const MAX_DICE_COUNT = 40;
const ROLLABLE_SIDES: readonly number[] = [4, 6, 8, 10, 12, 20, 100];
const TERM = /([+-]?)(?:(\d*)[кkdд](\d+)|(\d+)|(\p{L}+))/gu;
const STAT_BY_WORD: Readonly<Record<string, CustomRollStatKey>> = {
  сил: "STR", str: "STR",
  спр: "DEX", dex: "DEX",
  ста: "CON", con: "CON",
  інт: "INT", int: "INT",
  муд: "WIS", wis: "WIS",
  хар: "CHA", cha: "CHA",
  бм: "PROFICIENCY", пр: "PROFICIENCY", pb: "PROFICIENCY",
  рівень: "LEVEL", рів: "LEVEL", level: "LEVEL", lvl: "LEVEL",
};
const STAT_LABELS: Readonly<Record<CustomRollStatKey, string>> = {
  STR: "СИЛ", DEX: "СПР", CON: "СТА", INT: "ІНТ", WIS: "МУД", CHA: "ХАР", PROFICIENCY: "БМ", LEVEL: "рівень",
};

export function parseCustomRollFormulas(text: string): CustomRollParseResult {
  const parts = text.split(",").map(normalizeFormulaText).filter(Boolean);
  if (parts.length > MAX_FORMULAS) return { formulas: [], error: `Не більше ${MAX_FORMULAS} формул в одній здібності.` };
  const formulas: CustomRollFormula[] = [];
  for (const part of parts) {
    const parsed = parseFormula(part);
    if (typeof parsed === "string") return { formulas: [], error: parsed };
    formulas.push(parsed);
  }
  return { formulas, error: null };
}

export function calculateCustomRollBonus(formula: CustomRollFormula, stats: CustomRollStats): number {
  return formula.stats.reduce((total, term) => total + term.sign * findStatValue(term.stat, stats), formula.flatBonus);
}

function normalizeFormulaText(part: string): string {
  return part.replace(/\s+/g, "").replace(/[−–—]/g, "-").toLocaleLowerCase("uk");
}

function findStatValue(stat: CustomRollStatKey, stats: CustomRollStats): number {
  if (stat === "PROFICIENCY") return stats.proficiencyBonus;
  if (stat === "LEVEL") return stats.level;
  return stats.abilityModifiers[stat];
}

function parseFormula(part: string): CustomRollFormula | string {
  const unreadable = `Не вийшло прочитати «${part}». Приклад: 1к8+СИЛ+БМ.`;
  const terms = [...part.matchAll(TERM)];
  const isWholeFormulaRead = terms.reduce((length, term) => length + term[0].length, 0) === part.length;
  if (!isWholeFormulaRead || terms.some((term, index) => index > 0 && !term[1])) return unreadable;

  const formula: CustomRollFormula = { label: "", count: 0, sides: 0, flatBonus: 0, stats: [] };
  const labels: string[] = [];
  for (const [, signText, diceCount, diceSides, numberText, word] of terms) {
    const sign = signText === "-" ? -1 : 1;
    if (diceSides !== undefined) {
      if (sign === -1) return unreadable;
      if (formula.sides) return `У формулі «${part}» більше одного кубика. Другий кидок додайте через кому.`;
      const diceError = findDiceError(Number(diceCount || 1), Number(diceSides));
      if (diceError) return diceError;
      formula.count = Number(diceCount || 1);
      formula.sides = Number(diceSides);
      labels.push(`${signText}${formula.count}к${formula.sides}`);
    } else if (numberText !== undefined) {
      formula.flatBonus += sign * Number(numberText);
      labels.push(`${signText}${numberText}`);
    } else {
      const stat = STAT_BY_WORD[word];
      if (!stat) return `Не впізнали «${word}». Можна: кубики (1к8), числа, СИЛ, СПР, СТА, ІНТ, МУД, ХАР, БМ, рівень.`;
      formula.stats.push({ stat, sign });
      labels.push(`${signText}${STAT_LABELS[stat]}`);
    }
  }
  if (!formula.sides) return `У формулі «${part}» немає кубика. Приклад: 1к20+МУД.`;
  return { ...formula, label: labels.join("").replace(/^\+/, "") };
}

function findDiceError(count: number, sides: number): string | null {
  if (!ROLLABLE_SIDES.includes(sides)) return `Такого кубика немає: к${sides}. Можна к4, к6, к8, к10, к12, к20, к100.`;
  if (count < 1 || count > MAX_DICE_COUNT) return `Кубиків у кидку може бути від 1 до ${MAX_DICE_COUNT}.`;
  return null;
}
