/// Значки статблока (тип пастки/небезпеки, рівень загрози) — фіксований перелік 5etools
/// (`Parser.TRAP_HAZARD_TYPE_TO_FULL`, `rating[].threat`), не проза. Р20-маркер `{{English}}`
/// сюди не йде: KR23.3 явно виносить механічні поля статблока з-під цього правила. Значення,
/// яких немає в жодному записі корпусу KR23.3, тут не заведені — додавати за потреби.
const TRAP_HAZ_TYPE_LABELS: Record<string, string> = {
  SMPL: "Проста пастка",
  CMPX: "Складна пастка",
  MECH: "Механічна пастка",
  MAG: "Магічна пастка",
  ENV: "Небезпека довкілля",
  WLD: "Небезпека дикої природи",
  WTH: "Погодна небезпека",
  EST: "Моторошна буря",
  GEN: "Загальна небезпека",
};

const TRAP_HAZ_TYPE_FALLBACK = "Небезпека";

const TRAP_HAZ_THREAT_LABELS: Record<string, string> = {
  deadly: "Смертельна",
  dangerous: "Небезпечна",
  moderate: "Помірна",
  nuisance: "Незначна",
};

const TIER_TO_LEVEL_RANGE: Record<number, [number, number]> = {
  1: [1, 4],
  2: [5, 10],
  3: [11, 16],
  4: [17, 20],
};

export function findTrapHazTypeLabel(trapHazType: string | null): string {
  if (!trapHazType) return TRAP_HAZ_TYPE_FALLBACK;
  return TRAP_HAZ_TYPE_LABELS[trapHazType] ?? trapHazType;
}

export function findThreatLabel(threat: string | undefined): string | null {
  if (!threat) return null;
  return TRAP_HAZ_THREAT_LABELS[threat] ?? threat;
}

export function findLevelRangeLabel(rating: { tier?: number; level?: { min: number; max: number } }): string | null {
  if (rating.tier !== undefined) {
    const range = TIER_TO_LEVEL_RANGE[rating.tier];
    return range ? `Рівні ${range[0]}–${range[1]}` : null;
  }
  if (rating.level) {
    const { min, max } = rating.level;
    return min === max ? `Рівень ${min}` : `Рівні ${min}–${max}`;
  }
  return null;
}
