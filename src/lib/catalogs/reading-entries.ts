import { findFeatureKey, findTraitKey } from "@/lib/catalogs/reading-target";

export type ReadingEntry = {
  key: string;
  level: number | null;
  name: string;
  engName: string;
  description: string;
};

type Feature = { level: number; name: string; engName: string; description: string };
type Trait = { name: string; engName: string; description: string };

export function buildFeatureEntries(features: readonly Feature[]): ReadingEntry[] {
  return [...features]
    .sort((a, b) => a.level - b.level)
    .map((feature) => ({ ...feature, key: findFeatureKey(feature) }));
}

export function buildTraitEntries(traits: readonly Trait[]): ReadingEntry[] {
  return traits.map((trait) => ({ ...trait, level: null, key: findTraitKey(trait) }));
}
