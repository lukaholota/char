export type AttunementClassLevel = {
  className: string;
  classLevel: number;
};

export type AttunementPersShape = {
  level: number;
  class: { name: string };
  multiclasses: { classLevel: number; class: { name: string } }[];
};

const ARTIFICER_CLASS_NAMES = new Set(["ARTIFICER_2014", "ARTIFICER_2024"]);

/**
 * PHB 2014 с.141 / SRD 2024 «No More Than Three Items»: базова стеля — три. Артифайсер (2014
 * TCoE, 2024) підіймає її трьома окремими фічами — Адепт(10)→4, Знавець(14)→5, Майстер(18)→6 —
 * а не одноразовим +1, тому стеля рахується таблицею рівнів, а не константою.
 */
const ARTIFICER_ATTUNEMENT_TIERS: ReadonlyArray<{ level: number; capacity: number }> = [
  { level: 18, capacity: 6 },
  { level: 14, capacity: 5 },
  { level: 10, capacity: 4 },
];

const BASE_ATTUNEMENT_CAPACITY = 3;

export function findAttunementCapacity(classLevels: AttunementClassLevel[]): number {
  const artificerLevel = classLevels.reduce(
    (max, entry) => (ARTIFICER_CLASS_NAMES.has(entry.className) ? Math.max(max, entry.classLevel) : max),
    0,
  );

  const tier = ARTIFICER_ATTUNEMENT_TIERS.find((candidate) => artificerLevel >= candidate.level);
  return tier ? tier.capacity : BASE_ATTUNEMENT_CAPACITY;
}

export function findAttunementCapacityForPers(pers: AttunementPersShape): number {
  const multiclassSum = pers.multiclasses.reduce((sum, mc) => sum + mc.classLevel, 0);
  const mainClassLevel = Math.max(1, pers.level - multiclassSum);

  return findAttunementCapacity([
    { className: pers.class.name, classLevel: mainClassLevel },
    ...pers.multiclasses.map((mc) => ({ className: mc.class.name, classLevel: mc.classLevel })),
  ]);
}
