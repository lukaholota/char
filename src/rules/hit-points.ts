/**
 * Максимум хітів складається з кількох джерел: кубик класу, модифікатор Статури, риса Здоровань
 * і фічі, що дають хіти за кожен рівень персонажа. Останні тепер несуть своє число самі —
 * `Feature.bonusHitPointsPerLevel`, — тож рушій нічого не знає про конкретні назви рис.
 */

export type HitPointGrantingFeature = {
  featureId: number;
  bonusHitPointsPerLevel: number | null;
};

export function sumFeatureHitPointsPerLevel(features: Iterable<HitPointGrantingFeature>): number {
  const byFeature = new Map<number, number>();
  for (const feature of features) {
    const bonus = Number(feature.bonusHitPointsPerLevel);
    if (Number.isFinite(bonus) && bonus > 0) byFeature.set(feature.featureId, bonus);
  }

  return Array.from(byFeature.values()).reduce((total, bonus) => total + bonus, 0);
}
