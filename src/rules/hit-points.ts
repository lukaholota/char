/**
 * Максимум хітів складається з кількох джерел: кубик класу, модифікатор Статури, риса Здоровань
 * і фічі, що дають хіти за кожен рівень персонажа. Останні тепер несуть своє число самі —
 * `Feature.bonusHitPointsPerLevel`, — тож рушій нічого не знає про конкретні назви рис.
 */

export type HitPointGrantingFeature = {
  featureId: number;
  bonusHitPointsPerLevel: number | null;
  grantingClassIds?: readonly number[];
};

export type LevelUpFeatureHitPointsInput = {
  ownedFeatures: Iterable<HitPointGrantingFeature>;
  gainedFeatures: Iterable<HitPointGrantingFeature>;
  leveledClassId: number;
  classLevelAfter: number;
};

export function sumFeatureHitPointsPerLevel(features: Iterable<HitPointGrantingFeature>): number {
  const byFeature = new Map<number, number>();
  for (const feature of features) {
    const bonus = Number(feature.bonusHitPointsPerLevel);
    if (Number.isFinite(bonus) && bonus > 0) byFeature.set(feature.featureId, bonus);
  }

  return Array.from(byFeature.values()).reduce((total, bonus) => total + bonus, 0);
}

// Фіча класу чи підкласу дає хіти лише за рівні свого класу і, відкрившись пізніше, — заднім
// числом («+3 на 3-му рівні Чародія»); фіча виду чи риси — за кожен рівень персонажа.
export function sumLevelUpFeatureHitPoints(input: LevelUpFeatureHitPointsInput): number {
  const owned = collectHitPointGrants(input.ownedFeatures);
  const gained = [...collectHitPointGrants(input.gainedFeatures).values()].filter((grant) => !owned.has(grant.featureId));

  const fromOwned = [...owned.values()]
    .filter((grant) => !isClassBound(grant) || grant.grantingClassIds.includes(input.leveledClassId))
    .reduce((total, grant) => total + grant.bonus, 0);
  const fromGained = gained.reduce(
    (total, grant) => total + grant.bonus * (isClassBound(grant) ? input.classLevelAfter : 1),
    0,
  );

  return fromOwned + fromGained;
}

export type ClassLinkedFeatureRow = {
  featureId: number;
  bonusHitPointsPerLevel: number | null;
  classFeatures?: readonly { classId: number }[];
  subclassFeatures?: readonly { subclass: { classId: number } }[];
};

export function toHitPointGrantingFeature(row: ClassLinkedFeatureRow): HitPointGrantingFeature {
  const classIds = [
    ...(row.classFeatures ?? []).map((link) => link.classId),
    ...(row.subclassFeatures ?? []).map((link) => link.subclass.classId),
  ];
  return { featureId: row.featureId, bonusHitPointsPerLevel: row.bonusHitPointsPerLevel, grantingClassIds: [...new Set(classIds)] };
}

type HitPointGrant = { featureId: number; bonus: number; grantingClassIds: readonly number[] };

function collectHitPointGrants(features: Iterable<HitPointGrantingFeature>): Map<number, HitPointGrant> {
  const byFeature = new Map<number, HitPointGrant>();
  for (const feature of features) {
    const bonus = Number(feature.bonusHitPointsPerLevel);
    if (!Number.isFinite(bonus) || bonus <= 0) continue;
    byFeature.set(feature.featureId, { featureId: feature.featureId, bonus, grantingClassIds: feature.grantingClassIds ?? [] });
  }
  return byFeature;
}

function isClassBound(grant: HitPointGrant): boolean {
  return grant.grantingClassIds.length > 0;
}
