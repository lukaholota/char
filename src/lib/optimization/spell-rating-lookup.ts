import { toEntitySlug } from "@/lib/slug-utils";
import { findRatingListKeys, type RatedCaster } from "./spell-rating-casters";
import type { SpellRatingScore } from "./spell-rating-extraction";

export type SpellRatingList = { titleUk: string; articleSlug: string; sourceUrl: string; scores: Record<string, number> };
export type SpellRatingCatalog = { lists: Record<string, SpellRatingList> };
export type SpellRatingMatch = { listKey: string; score: SpellRatingScore };

export const RECOMMENDED_MIN_SCORE: SpellRatingScore = 3;

export function isSpellRatingScore(value: unknown): value is SpellRatingScore {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

export function createSpellRatingFinder(catalog: SpellRatingCatalog, casters: readonly RatedCaster[]) {
  const listKeyChains = casters.map(findRatingListKeys).filter((chain) => chain.length > 0);

  return function findSpellRatingMatches(spellEngName: string): SpellRatingMatch[] {
    const slug = toEntitySlug(spellEngName);
    const matches = listKeyChains.flatMap((chain) => {
      const match = findFirstMatchInChain(catalog, chain, slug);
      return match ? [match] : [];
    });
    return keepFirstMatchPerList(matches);
  };
}

function findFirstMatchInChain(catalog: SpellRatingCatalog, chain: readonly string[], slug: string): SpellRatingMatch | null {
  for (const listKey of chain) {
    const score = catalog.lists[listKey]?.scores[slug];
    if (isSpellRatingScore(score)) return { listKey, score };
  }
  return null;
}

function keepFirstMatchPerList(matches: SpellRatingMatch[]): SpellRatingMatch[] {
  const seen = new Set<string>();
  return matches.filter((match) => {
    if (seen.has(match.listKey)) return false;
    seen.add(match.listKey);
    return true;
  });
}

export function findBestSpellRating(matches: readonly SpellRatingMatch[]): SpellRatingMatch | null {
  return matches.reduce<SpellRatingMatch | null>((best, match) => (best === null || match.score > best.score ? match : best), null);
}

export function sortByBestRating<T>(items: readonly T[], findScore: (item: T) => number | null): T[] {
  return items
    .map((item, position) => ({ item, position, score: findScore(item) ?? 0 }))
    .sort((left, right) => right.score - left.score || left.position - right.position)
    .map((entry) => entry.item);
}
