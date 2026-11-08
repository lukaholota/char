import { pickD20Value, type D20Mode } from "./dice-roll";
import { findFailedCondition, findSaveDamage, isCreatureSaveAutoFail, sumSaveDice, type CreatureSaveResult, type DamageDefense, type SaveDieRoll, type SaveEffect } from "./creature-save";

/// bonus і mode — з листа героя разом зі станами (Лють, Небезпечне чуття); стани кімнати додаються тут.
export type HeroSaveInput = {
  bonus: number;
  mode: D20Mode;
  conditions: readonly string[];
  resistances: readonly string[];
  effect: SaveEffect;
  dc: number;
  rolledDamage: number;
  d20Pair: readonly [number, number];
  dice?: readonly SaveDieRoll[];
};

export function resolveHeroSave({ bonus, mode, conditions, resistances, effect, dc, rolledDamage, d20Pair, dice = [] }: HeroSaveInput): CreatureSaveResult {
  const finalMode = mergeModes(mode, effect.ability === "DEX" && conditions.includes("restrained") ? "DISADVANTAGE" : "NORMAL");
  const d20 = finalMode === "NORMAL" ? [d20Pair[0]] : [...d20Pair];
  const total = pickD20Value(d20, finalMode) + bonus + sumSaveDice(dice);
  const isAutoFail = isCreatureSaveAutoFail(conditions, effect.ability);
  const isSaved = !isAutoFail && total >= dc;
  const defense = findHeroDefense(resistances, effect);
  return { d20, mode: finalMode, bonus, total, isSaved, isAutoFail, defense, damage: findSaveDamage(rolledDamage, isSaved, effect, defense), ...findFailedCondition(effect, isSaved, false), ...(dice.length ? { dice: [...dice] } : {}) };
}

function mergeModes(first: D20Mode, second: D20Mode): D20Mode {
  const modes = new Set([first, second].filter((mode) => mode !== "NORMAL"));
  return modes.size === 1 ? [...modes][0] : "NORMAL";
}

function findHeroDefense(resistances: readonly string[], effect: SaveEffect): DamageDefense | null {
  return effect.damageType && resistances.includes(effect.damageType.toUpperCase()) ? "resistant" : null;
}
