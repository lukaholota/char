import { sumLevelUpFeatureHitPoints, type HitPointGrantingFeature } from "@/rules/hit-points";

export type HitPointSource = { name: string; amount: number };
type NamedGrant = HitPointGrantingFeature & { name: string };
type Input = {
  ownedFeatures: readonly NamedGrant[];
  gainedFeatures: readonly NamedGrant[];
  leveledClassId: number;
  classLevelAfter: number;
};

export function findLevelUpHitPointSources(input: Input): HitPointSource[] {
  const features = new Map([...input.ownedFeatures, ...input.gainedFeatures].map((feature) => [feature.featureId, feature]));
  return [...features.values()].flatMap((feature) => {
    const amount = sumLevelUpFeatureHitPoints({ ...input,
      ownedFeatures: input.ownedFeatures.filter((candidate) => candidate.featureId === feature.featureId),
      gainedFeatures: input.gainedFeatures.filter((candidate) => candidate.featureId === feature.featureId),
    });
    return amount > 0 ? [{ name: feature.name, amount }] : [];
  });
}
