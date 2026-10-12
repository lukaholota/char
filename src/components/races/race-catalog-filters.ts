import type { RaceData } from "@/lib/racesData";
import { findAliasVariants } from "@/lib/search/searchAliases";
import { buildQueryMatcher, buildSearchableText, matchesQuery } from "@/lib/search/searchQuery";

/// Ознаки, яких у каталозі немає окремим полем, але за якими расу шукають найчастіше.
export const RACE_TRAIT_LABELS = {
  DARKVISION: "Темнозір",
  FLIGHT: "Політ",
  SWIM: "Плавання",
  BRANCHES: "З підрасами чи варіантами",
} as const;

export type RaceTraitKey = keyof typeof RACE_TRAIT_LABELS;

export const RACE_TRAIT_KEYS = Object.keys(RACE_TRAIT_LABELS) as RaceTraitKey[];

function collectTraitNames(race: RaceData): string[] {
  const branches = [...race.subraces, ...race.variants].flatMap((branch) => branch.traits);
  return [...race.traits, ...branches].map((trait) => trait.engName.toLowerCase());
}

function hasExtraSpeed(race: RaceData, label: string): boolean {
  return race.extraSpeeds.some((speed) => speed.label.toLowerCase().includes(label));
}

export function hasRaceTrait(race: RaceData, trait: string): boolean {
  const names = collectTraitNames(race);
  const hasTraitNamed = (...needles: string[]) =>
    names.some((name) => needles.some((needle) => name.includes(needle)));

  if (trait === "DARKVISION") return hasTraitNamed("darkvision");
  if (trait === "FLIGHT") return hasExtraSpeed(race, "політ") || hasTraitNamed("flight", "flying");
  if (trait === "SWIM") return hasExtraSpeed(race, "плав") || hasTraitNamed("swim");
  if (trait === "BRANCHES") return race.subraces.length + race.variants.length > 0;
  return false;
}

export function matchesRaceQuery(race: RaceData, query: string): boolean {
  const matcher = buildQueryMatcher(query);
  if (!matcher) return true;
  const traits = race.traits.map((trait) => `${trait.name} ${trait.description}`).join(" ");
  const branches = [...race.subraces, ...race.variants].map((branch) => branch.name).join(" ");
  const aliases = findAliasVariants(race.ruleset, ["race", "species"], [race.slug, race.name]).join(" ");
  return matchesQuery(matcher, buildSearchableText([race.name, race.engName, race.source, aliases, traits, branches]));
}
