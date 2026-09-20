/**
 * Кубики Здоровʼя живуть у `Pers.currentHitDice` як `{ [classId]: скільки лишилось }`.
 * Ключ там — рядок, бо це JSON, а максимум ніде не зберігається: він дорівнює рівню в класі.
 */

import type { RulesetId } from "./strategies/types";

export interface HitDiceClass {
  classId: number;
  hitDie: number;
  classLevel: number;
}

export interface HitDicePool {
  classId: number;
  hitDie: number;
  max: number;
  current: number;
}

export interface HitDiceSpend {
  classId: number;
  count: number;
}

export type StoredHitDice = Record<string, number> | null | undefined;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

export function findMainClassLevel(totalLevel: number, multiclasses: { classLevel: number }[]): number {
  const multiclassLevels = multiclasses.reduce((sum, mc) => sum + mc.classLevel, 0);
  return Math.max(0, totalLevel - multiclassLevels);
}

export function buildHitDicePools(classes: HitDiceClass[], stored: StoredHitDice): HitDicePool[] {
  return classes.map((characterClass) => {
    const max = Math.max(0, Math.trunc(characterClass.classLevel));
    const storedCurrent = stored?.[String(characterClass.classId)];
    const current = typeof storedCurrent === "number" ? clamp(storedCurrent, 0, max) : max;
    return { classId: characterClass.classId, hitDie: characterClass.hitDie, max, current };
  });
}

export function findPoolsAfterSpending(
  pools: HitDicePool[],
  spends: HitDiceSpend[],
): { ok: true; pools: HitDicePool[] } | { ok: false; error: string } {
  const next = pools.map((pool) => ({ ...pool }));

  for (const spend of spends) {
    const pool = next.find((candidate) => candidate.classId === spend.classId);
    if (!pool) return { ok: false, error: `Невірний клас ID: ${spend.classId}` };

    const count = Math.max(0, Math.trunc(spend.count));
    if (count > pool.current) {
      return { ok: false, error: `Недостатньо кубиків здоровʼя для класу ${spend.classId}` };
    }
    pool.current -= count;
  }

  return { ok: true, pools: next };
}

export function findPoolsAfterSetting(
  pools: HitDicePool[],
  remainingByClass: Record<number, number>,
): { ok: true; pools: HitDicePool[] } | { ok: false; error: string } {
  for (const classId of Object.keys(remainingByClass)) {
    if (!pools.some((pool) => pool.classId === Number(classId))) {
      return { ok: false, error: `Невірний клас ID: ${classId}` };
    }
  }

  const next = pools.map((pool) => {
    const remaining = remainingByClass[pool.classId];
    if (remaining === undefined) return { ...pool };
    return { ...pool, current: clamp(remaining, 0, pool.max) };
  });

  return { ok: true, pools: next };
}

/// Редакції розходяться, і це звірено по SRD у репо: 2014
/// (`data/2014/srd/06_Gameplay/Adventuring.md:174`) повертає «up to a number of dice equal to half
/// of the character's total number of them (minimum of one die)», 2024
/// (`data/2024/srd/rules-glossary.md:1035`) — «all spent Hit Point Dice».
export function findPoolsAfterLongRest(pools: HitDicePool[], ruleset: RulesetId): HitDicePool[] {
  if (ruleset === "RULES_2024") return pools.map((pool) => ({ ...pool, current: pool.max }));

  return restoreHalfOfTotalDice(pools);
}

/// Половина рахується від суми кубиків усіх класів, а не покласово: у Воїна 3 / Чарівника 2
/// книга повертає два кубики на пʼять, а покласовий підрахунок дав би 1 + 1 і з мінімумом
/// перетворився б на 2 + 1. Який саме кубик відновити, у книзі обирає гравець; тут порядок
/// класів персонажа, щоб відповідь не залежала від порядку рядків у JSON.
function restoreHalfOfTotalDice(pools: HitDicePool[]): HitDicePool[] {
  const totalMax = pools.reduce((sum, pool) => sum + pool.max, 0);
  if (totalMax === 0) return pools.map((pool) => ({ ...pool }));

  let budget = Math.max(1, Math.floor(totalMax / 2));

  return pools.map((pool) => {
    const restored = Math.min(budget, pool.max - pool.current);
    budget -= restored;
    return { ...pool, current: pool.current + restored };
  });
}

export function serializeHitDicePools(pools: HitDicePool[]): Record<number, number> {
  const stored: Record<number, number> = {};
  for (const pool of pools) stored[pool.classId] = pool.current;
  return stored;
}

/// Кожен кубик відновлює щонайменше один хіт, навіть коли модифікатор Статури відʼємний.
export function rollHitPointsFromHitDice(
  pools: HitDicePool[],
  spends: HitDiceSpend[],
  constitutionModifier: number,
  random: () => number = Math.random,
): number {
  let restored = 0;

  for (const spend of spends) {
    const pool = pools.find((candidate) => candidate.classId === spend.classId);
    if (!pool) continue;

    for (let die = 0; die < spend.count; die += 1) {
      const roll = Math.floor(random() * pool.hitDie) + 1;
      restored += Math.max(1, roll + constitutionModifier);
    }
  }

  return restored;
}
