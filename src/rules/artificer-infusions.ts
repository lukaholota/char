/**
 * Скільки вливань знає артифайсер (TCoE, таблиця «Infusions Known»).
 *
 * Числа не з памʼяті: продукт уже показує цю таблицю гравцеві у вікні класу
 * (`ClassInfoModal` → `ARTIFICER_2014` → `infusions_known`), і саме звідти вона сюди переїхала —
 * тепер копія одна, і вікно класу читає її звідси.
 *
 * До KR31.12 вливання записувалися рівно один раз, на 2 рівні класу, і рівно чотири, тож 50 із
 * 66 рядків `infusion` (рівні 6/10/14) були недосяжні жодним шляхом, а вікно класу обіцяло
 * дванадцять на 18 рівні.
 *
 * Заміни вже відомого вливання при підвищенні рівня тут немає навмисно: правило про неї в
 * репозиторії відсутнє (TCoE), тож вигадувати його не можна.
 */

export const INFUSIONS_KNOWN_BY_ARTIFICER_LEVEL: Record<number, number> = {
  2: 4,
  6: 6,
  10: 8,
  14: 10,
  18: 12,
};

export function findInfusionsKnownAtLevel(artificerLevel: number): number {
  const reached = Object.keys(INFUSIONS_KNOWN_BY_ARTIFICER_LEVEL)
    .map(Number)
    .filter((level) => level <= artificerLevel);

  if (reached.length === 0) return 0;

  return INFUSIONS_KNOWN_BY_ARTIFICER_LEVEL[Math.max(...reached)];
}

/// Скільки вливань гравець обирає **саме на цьому** рівні: нуль на всіх рівнях, крім
/// 2 / 6 / 10 / 14 / 18, де це приріст таблиці — чотири на другому й по два далі.
export function findInfusionPicksAtLevel(artificerLevel: number): number {
  return findInfusionsKnownAtLevel(artificerLevel) - findInfusionsKnownAtLevel(artificerLevel - 1);
}

export function isInfusionLevel(artificerLevel: number): boolean {
  return findInfusionPicksAtLevel(artificerLevel) > 0;
}
