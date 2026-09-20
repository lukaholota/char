import type { Feature } from "@prisma/client";
import type { PersWithRelations } from "@/lib/actions/pers";
import { canActivateFeatureState, isToggleableFeature, listStatesEndingWith } from "@/rules/feature-states";
import { collectActiveFeatures } from "./bonus-calculator";

export function listActiveFeatureEngNames(pers: PersWithRelations): string[] {
  return (pers.features ?? []).filter((row) => row.isActive).map((row) => row.feature.engName);
}

export function isFeatureActive(pers: PersWithRelations, featureId: number): boolean {
  return (pers.features ?? []).some((row) => row.featureId === featureId && row.isActive);
}

export function listToggleableFeatures(pers: PersWithRelations): Feature[] {
  return collectActiveFeatures(pers).filter((feature) => isToggleableFeature(feature.engName));
}

export function canActivateFeature(pers: PersWithRelations, featureId: number): boolean {
  const feature = collectActiveFeatures(pers).find((candidate) => candidate.featureId === featureId);
  return feature ? canActivateFeatureState(feature.engName, listActiveFeatureEngNames(pers)) : false;
}

/// Лист перераховує числа одразу, не чекаючи сервера. Разом із Люттю гасне й Шаленство.
export function markFeatureActive(pers: PersWithRelations, featureId: number, isActive: boolean): PersWithRelations {
  const marked = markSingleFeatureActive(pers, featureId, isActive);
  if (isActive) return marked;

  const endedName = marked.features.find((row) => row.featureId === featureId)?.feature.engName;
  const dependents = endedName ? listStatesEndingWith(endedName) : [];
  return {
    ...marked,
    features: marked.features.map((row) => (dependents.includes(row.feature.engName) ? { ...row, isActive: false } : row)),
  };
}

export function endAllFeatureStates(pers: PersWithRelations): PersWithRelations {
  if (!(pers.features ?? []).some((row) => row.isActive)) return pers;
  return { ...pers, features: pers.features.map((row) => ({ ...row, isActive: false })) };
}

/// Риса виду може ще не мати рядка `pers_feature` — тоді він додається з тим самим `feature`,
/// який лист уже знає.
function markSingleFeatureActive(pers: PersWithRelations, featureId: number, isActive: boolean): PersWithRelations {
  const rows = pers.features ?? [];
  if (rows.some((row) => row.featureId === featureId)) {
    return { ...pers, features: rows.map((row) => (row.featureId === featureId ? { ...row, isActive } : row)) };
  }

  const feature = collectActiveFeatures(pers).find((candidate) => candidate.featureId === featureId);
  if (!feature) return pers;
  const row = { persFeatureId: -featureId, persId: pers.persId, featureId, usesRemaining: null, isActive, feature };
  return { ...pers, features: [...rows, row] };
}
