import type { DiceCount } from "./dice-roll";
import type { AbilityKey } from "./types";

export type AbilityTerm = { ability: AbilityKey; multiplier: number };
export type WeaponDamageFormula = { dice: DiceCount[]; flat: number; abilities: AbilityTerm[] };

const ABILITY_WORDS: Record<string, AbilityKey> = {
  СИЛ: "STR", СПР: "DEX", СТА: "CON", ІНТ: "INT", МУД: "WIS", МДР: "WIS", ХАР: "CHA",
  STR: "STR", DEX: "DEX", CON: "CON", INT: "INT", WIS: "WIS", CHA: "CHA",
};
const DICE_TERM = /^(\d*)[DКKД](\d+)$/;
const ABILITY_TERM = /^(?:(\d+)[*×X])?([A-ZА-ЯІЇЄҐ]+)(?:[*×X](\d+))?$/;

/// «1к6+СИЛ*2», «2к8+1к6+СТА+1»: кубики, число й модифікатори характеристик. Інший текст — не формула.
export function parseWeaponDamageFormula(text: string): WeaponDamageFormula | null {
  const terms = text.toUpperCase().replace(/\s+/g, "").match(/[+-]?[^+-]+/g);
  if (!terms) return null;
  const formula: WeaponDamageFormula = { dice: [], flat: 0, abilities: [] };
  for (const term of terms) {
    if (!addTerm(formula, term)) return null;
  }
  return formula.dice.length || formula.abilities.length ? formula : null;
}

function addTerm(formula: WeaponDamageFormula, signedTerm: string): boolean {
  const sign = signedTerm.startsWith("-") ? -1 : 1;
  const term = signedTerm.replace(/^[+-]/, "");
  if (/^\d+$/.test(term)) {
    formula.flat += sign * Number(term);
    return true;
  }
  const dice = term.match(DICE_TERM);
  if (dice && sign > 0) {
    formula.dice.push({ count: Math.max(1, Number(dice[1] || "1")), sides: Number(dice[2]) });
    return Number(dice[2]) >= 2;
  }
  const ability = term.match(ABILITY_TERM);
  const key = ability ? ABILITY_WORDS[ability[2]] : undefined;
  if (!ability || !key || (ability[1] && ability[3])) return false;
  formula.abilities.push({ ability: key, multiplier: sign * Number(ability[1] ?? ability[3] ?? 1) });
  return true;
}

/// Рівно одна група кубиків без чисел і характеристик: «1к6», «2d8».
export function parseDiceGroup(text: string): DiceCount | null {
  const formula = parseWeaponDamageFormula(text);
  return formula && formula.dice.length === 1 && formula.flat === 0 && formula.abilities.length === 0 ? formula.dice[0] : null;
}

export function formatFormulaDice(dice: readonly DiceCount[]): string {
  return dice.map((group) => `${group.count}d${group.sides}`).join("+");
}

export function sumAbilityTerms(abilities: readonly AbilityTerm[], findModifier: (ability: AbilityKey) => number): number {
  return abilities.reduce((total, term) => total + findModifier(term.ability) * term.multiplier, 0);
}
