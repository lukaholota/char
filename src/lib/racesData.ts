/**
 * Static race/species data for the catalogs.
 *
 * Reads `src/lib/generated/races.json`, which the generator builds from the same `race` table the
 * character creator queries — no second source of truth (KR15.6).
 */

import type { Ruleset } from "@prisma/client";

import racesJson from "@/lib/generated/races.json";
import { getRaceImagePath } from "@/lib/assets/image-manifest";
import { toEntitySlug } from "@/lib/slug-utils";

export { RACE_CATALOG_TITLE, RACE_SINGULAR } from "@/lib/refs/race-labels";

export type RaceTrait = {
  name: string;
  engName: string;
  description: string;
};

export type RaceBranch = {
  key: string;
  name: string;
  engName: string;
  description: string | null;
  traits: RaceTrait[];
};

export type RaceData = {
  raceId: number;
  key: string;
  slug: string;
  name: string;
  engName: string;
  description: string | null;
  source: string;
  sizes: string[];
  speed: number;
  extraSpeeds: { label: string; value: number }[];
  languages: string[];
  languagesToChooseCount: number;
  asiSummary: string;
  traits: RaceTrait[];
  subraces: RaceBranch[];
  variants: RaceBranch[];
  imageSrc: string | null;
  ruleset: Ruleset;
};

type RawRace = Omit<RaceData, "slug" | "imageSrc">;

/// 2024 calls them species, 2014 calls them races. The product already draws that line — the
const ALL_RACES: RaceData[] = (racesJson as RawRace[]).map((race) => ({
  ...race,
  slug: toEntitySlug(race.engName),
  imageSrc: getRaceImagePath(race.key),
}));

/// «Своя раса» — не раса, а конструктор під власні правила. Першою в каталозі вона стояла лише
/// тому, що має найменший id, і виняток опинявся попереду всього, з чого люди справді обирають.
/// Власник, 2026-09-02: хай буде остання.
function isCustomLineage(race: RaceData): boolean {
  return race.key.includes("CUSTOM_LINEAGE");
}

export function getAllRaces(ruleset: Ruleset): RaceData[] {
  const races = ALL_RACES.filter((race) => race.ruleset === ruleset);
  return [...races.filter((race) => !isCustomLineage(race)), ...races.filter(isCustomLineage)];
}

export function findRaceBySlug(slug: string, ruleset: Ruleset): RaceData | null {
  return getAllRaces(ruleset).find((race) => race.slug === slug) ?? null;
}
