import { DAMAGE_TYPE_KEYS, type DamageTypeKey } from "./types";

export type SenseAndResistanceFeature = {
  damageResistances?: readonly DamageTypeKey[] | null;
  darkvisionRange?: number | null;
};

export function collectDamageResistances(features: readonly SenseAndResistanceFeature[]): DamageTypeKey[] {
  const granted = new Set(features.flatMap((feature) => feature.damageResistances ?? []));
  return DAMAGE_TYPE_KEYS.filter((type) => granted.has(type));
}

// «Superior Darkvision» замінює дальність, а не додає її: ельф 60 і дроу 120 дають 120.
export function findDarkvisionRange(features: readonly SenseAndResistanceFeature[]): number | null {
  const ranges = features
    .map((feature) => feature.darkvisionRange)
    .filter((range): range is number => typeof range === "number" && Number.isFinite(range) && range > 0);

  return ranges.length > 0 ? Math.max(...ranges) : null;
}
