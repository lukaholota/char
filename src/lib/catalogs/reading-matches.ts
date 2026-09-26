import type { ClassData } from "@/lib/classesData";
import type { RaceData } from "@/lib/racesData";
import { normalizeSearchText } from "@/lib/search/searchQuery";
import {
  findBranchKey,
  findFeatureKey,
  findTraitKey,
  type ClassReadingTarget,
  type RaceReadingTarget,
} from "@/lib/catalogs/reading-target";

/// Пошук усередині каталогу не лише лишає клас у списку, а й називає, що саме в ньому знайшлося:
/// «Ріжучі слова» — це здібність Колегії знань, і рядок веде просто до неї.
export type CatalogMatch<TTarget> = { key: string; label: string; context: string; target: TTarget };

type NamedEntry = { name: string; engName: string };

export function findClassMatches(characterClass: ClassData, query: string): CatalogMatch<ClassReadingTarget>[] {
  const matches = buildQueryTest(query);
  if (!matches) return [];

  const classKey = characterClass.slug;
  const features = characterClass.features.filter(matches).map((feature) => ({
    key: `feature:${findFeatureKey(feature)}`,
    label: feature.name,
    context: `${feature.level} рівень`,
    target: { classKey, section: "features" as const, subclassKey: null, featureKey: findFeatureKey(feature) },
  }));
  const subclasses = characterClass.subclasses.flatMap((subclass) => {
    const subclassTarget = { classKey, section: "subclasses" as const, subclassKey: subclass.slug };
    const own = matches(subclass) ? [{ key: `subclass:${subclass.slug}`, label: subclass.name, context: "Підклас", target: { ...subclassTarget, featureKey: null } }] : [];
    const featureMatches = subclass.features.filter(matches).map((feature) => ({
      key: `subclass:${subclass.slug}:${findFeatureKey(feature)}`,
      label: feature.name,
      context: `${subclass.name} · ${feature.level} рівень`,
      target: { ...subclassTarget, featureKey: findFeatureKey(feature) },
    }));
    return [...own, ...featureMatches];
  });
  return [...features, ...subclasses];
}

export function findRaceMatches(race: RaceData, query: string): CatalogMatch<RaceReadingTarget>[] {
  const matches = buildQueryTest(query);
  if (!matches) return [];

  const raceKey = race.slug;
  const traits = race.traits.filter(matches).map((trait) => ({
    key: `trait:${findTraitKey(trait)}`,
    label: trait.name,
    context: "Риса",
    target: { raceKey, section: "traits" as const, branch: null, featureKey: findTraitKey(trait) },
  }));
  const branches = (["subrace", "variant"] as const).flatMap((kind) =>
    (kind === "subrace" ? race.subraces : race.variants).flatMap((branch) => {
      const branchTarget = { raceKey, section: "branches" as const, branch: { kind, key: findBranchKey(branch) } };
      const own = matches(branch) ? [{ key: `${kind}:${branch.key}`, label: branch.name, context: kind === "subrace" ? "Підраса" : "Варіант", target: { ...branchTarget, featureKey: null } }] : [];
      const traitMatches = branch.traits.filter(matches).map((trait) => ({
        key: `${kind}:${branch.key}:${findTraitKey(trait)}`,
        label: trait.name,
        context: branch.name,
        target: { ...branchTarget, featureKey: findTraitKey(trait) },
      }));
      return [...own, ...traitMatches];
    }),
  );
  return [...traits, ...branches];
}

function buildQueryTest(query: string): ((entry: NamedEntry) => boolean) | null {
  const needle = normalizeSearchText(query.trim());
  if (!needle) return null;
  return (entry) => normalizeSearchText(`${entry.name} ${entry.engName}`).includes(needle);
}
