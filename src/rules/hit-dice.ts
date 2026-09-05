/**
 * Кубики Здоровʼя живуть у `Pers.currentHitDice` як `{ [classId]: скільки лишилось }`.
 * Ключ там — рядок, бо це JSON, а максимум ніде не зберігається: він дорівнює рівню в класі.
 */

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

export function serializeHitDicePools(pools: HitDicePool[]): Record<number, number> {
  const stored: Record<number, number> = {};
  for (const pool of pools) stored[pool.classId] = pool.current;
  return stored;
}
