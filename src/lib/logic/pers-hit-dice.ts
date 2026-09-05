import { Classes } from "@prisma/client";
import { PersWithRelations } from "@/lib/actions/pers";
import { classTranslations } from "@/lib/refs/translation";
import { buildHitDicePools, findMainClassLevel, type HitDicePool, type StoredHitDice } from "@/rules/hit-dice";

export interface PersHitDicePool extends HitDicePool {
  className: string;
}

export function collectPersHitDicePools(pers: PersWithRelations): PersHitDicePool[] {
  const multiclasses = pers.multiclasses ?? [];
  const mainClassLevel = findMainClassLevel(pers.level, multiclasses);

  const classes = [
    { classId: pers.class.classId, hitDie: pers.class.hitDie, classLevel: mainClassLevel },
    ...multiclasses.map((multiclass) => ({
      classId: multiclass.classId,
      hitDie: multiclass.class.hitDie,
      classLevel: multiclass.classLevel,
    })),
  ];

  const names = [pers.class.name, ...multiclasses.map((multiclass) => multiclass.class.name)];
  const stored = (pers as unknown as { currentHitDice?: StoredHitDice }).currentHitDice;

  return buildHitDicePools(classes, stored).map((pool, index) => ({
    ...pool,
    className: classTranslations[names[index] as Classes] ?? String(names[index]),
  }));
}

export function formatHitDicePools(pools: PersHitDicePool[]): string {
  if (pools.length === 1) return `${pools[0].current}/${pools[0].max} d${pools[0].hitDie}`;
  return pools.map((pool) => `${pool.current}/${pool.max}d${pool.hitDie}`).join(" | ");
}
