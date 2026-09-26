import type { PersWeaponWithWeapon, PersWithRelations } from "@/lib/actions/pers";
import { findCrimsonRiteDamage, isCrimsonRiteFeature, type CrimsonRiteDamage } from "@/rules/crimson-rite";
import { BLOOD_HUNTER_CLASS_NAMES, sumClassLevels } from "./active-states";
import { collectActiveFeatures } from "./bonus-calculator";

export type KnownCrimsonRite = { featureId: number; name: string; engName: string };

export type WeaponCrimsonRite = CrimsonRiteDamage & { rite: KnownCrimsonRite };

/// Вивчені обряди й Обряд світанку мисливця на привидів — усі, що персонаж може запалити на зброї.
export function listKnownCrimsonRites(pers: PersWithRelations): KnownCrimsonRite[] {
  return collectActiveFeatures(pers)
    .filter((feature) => isCrimsonRiteFeature(feature.engName))
    .map((feature) => ({ featureId: feature.featureId, name: feature.name, engName: feature.engName }));
}

export function findWeaponCrimsonRite(pers: PersWithRelations, pw: PersWeaponWithWeapon): WeaponCrimsonRite | null {
  const riteFeatureId = pw.crimsonRiteFeatureId;
  if (!riteFeatureId) return null;

  const rite = listKnownCrimsonRites(pers).find((known) => known.featureId === riteFeatureId);
  const damage = rite ? findCrimsonRiteDamage(rite.engName, sumClassLevels(pers, BLOOD_HUNTER_CLASS_NAMES)) : null;
  return rite && damage ? { ...damage, rite } : null;
}
