import type { ReadyPresetCatalogEntry } from "./ready-preset-catalog";

export type PresetSuggestionQuery = { classKey: string; subclassKey: string | null; raceKey: string | null };

export type PresetSuggestion = {
  entry: ReadyPresetCatalogEntry;
  isSubclassMatch: boolean;
  isRaceMatch: boolean;
};

const SUBCLASS_WEIGHT = 2;
const RACE_WEIGHT = 1;
const OWN_SUBCLASS_WEIGHT = 0.5;

export function findPresetSuggestions(entries: readonly ReadyPresetCatalogEntry[], query: PresetSuggestionQuery): PresetSuggestion[] {
  return entries
    .filter((entry) => entry.startingClassKey === query.classKey)
    .map((entry) => ({
      entry,
      isSubclassMatch: query.subclassKey !== null && entry.startingSubclassKey === query.subclassKey,
      isRaceMatch: query.raceKey !== null && entry.raceKey === query.raceKey,
    }))
    .sort((left, right) => scoreSuggestion(right) - scoreSuggestion(left) || (right.entry.subclassRatingScore ?? 0) - (left.entry.subclassRatingScore ?? 0));
}

function scoreSuggestion(suggestion: PresetSuggestion): number {
  const ownSubclassBonus = suggestion.entry.startingSubclassKey ? OWN_SUBCLASS_WEIGHT : 0;
  return (suggestion.isSubclassMatch ? SUBCLASS_WEIGHT : 0) + (suggestion.isRaceMatch ? RACE_WEIGHT : 0) + ownSubclassBonus;
}
