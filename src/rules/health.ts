export function calculateInitialHitPoints(hitDie: number, constitutionModifier: number): number {
  return hitDie + constitutionModifier;
}

export function calculateAverageHitPointIncrease(hitDie: number): number {
  return Math.floor(hitDie / 2) + 1;
}

export function calculateLevelUpHitPoints(input: {
  currentHitPoints: number;
  hitDieIncrease: number;
  constitutionModifier: number;
  toughBonus: number;
  retroactiveConstitutionBonus: number;
}): number {
  return input.currentHitPoints + input.hitDieIncrease + input.constitutionModifier + input.toughBonus + input.retroactiveConstitutionBonus;
}

/**
 * PHB 2014, с. 15: коли змінюється модифікатор Статури, максимум хітів змінюється так,
 * ніби новий модифікатор діяв з 1-го рівня. Тому зсув множиться на повний рівень персонажа,
 * а не на рівень у класі.
 */
export function findRetroactiveConstitutionHitPoints(input: {
  previousConstitutionModifier: number;
  nextConstitutionModifier: number;
  level: number;
}): number {
  return (input.nextConstitutionModifier - input.previousConstitutionModifier) * input.level;
}

export function applyMaxHitPointShift(input: {
  maxHp: number;
  currentHp: number;
  shift: number;
}): { maxHp: number; currentHp: number } {
  const maxHp = Math.max(1, input.maxHp + input.shift);
  const currentHp = Math.max(0, Math.min(maxHp, input.currentHp + input.shift));
  return { maxHp, currentHp };
}
