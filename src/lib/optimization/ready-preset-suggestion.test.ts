import { describe, expect, it } from "vitest";
import type { ReadyPresetCatalogEntry } from "./ready-preset-catalog";
import { findPresetSuggestions } from "./ready-preset-suggestion";

function buildEntry(slug: string, startingClassKey: string, startingSubclassKey: string | null, raceKey: string): ReadyPresetCatalogEntry {
  return {
    slug, buildId: `build-${slug}`, title: slug, description: "", className: "", subclassName: "", raceName: "", baseRaceName: "", classLabel: "",
    startingClassKey, startingSubclassKey, raceKey, maxLevel: 20, sourceTitle: "", portraitSrc: null, subclassImageSrc: null, classImageSrc: null,
  };
}

const ENTRIES = [
  buildEntry("rogue-multiclass-cleric", "ROGUE_2014", null, "HALF_ELF_2014"),
  buildEntry("rogue-thief-human", "ROGUE_2014", "THIEF", "HUMAN_2014"),
  buildEntry("rogue-assassin-elf", "ROGUE_2014", "ASSASSIN", "ELF_2014"),
  buildEntry("rogue-assassin-human", "ROGUE_2014", "ASSASSIN", "HUMAN_2014"),
  buildEntry("fighter-champion-human", "FIGHTER_2014", "CHAMPION", "HUMAN_2014"),
];

const slugsOf = (query: Parameters<typeof findPresetSuggestions>[1]) => findPresetSuggestions(ENTRIES, query).map((suggestion) => suggestion.entry.slug);

describe("findPresetSuggestions", () => {
  it("keeps only presets that start as the chosen class", () => {
    expect(slugsOf({ classKey: "FIGHTER_2014", subclassKey: null, raceKey: null })).toEqual(["fighter-champion-human"]);
    expect(slugsOf({ classKey: "WIZARD_2014", subclassKey: null, raceKey: null })).toEqual([]);
  });

  it("puts the preset that matches subclass and race first", () => {
    const [best] = findPresetSuggestions(ENTRIES, { classKey: "ROGUE_2014", subclassKey: "ASSASSIN", raceKey: "HUMAN_2014" });
    expect(best).toMatchObject({ entry: { slug: "rogue-assassin-human" }, isSubclassMatch: true, isRaceMatch: true });
  });

  it("prefers the subclass over the race when they point at different presets", () => {
    const [best] = findPresetSuggestions(ENTRIES, { classKey: "ROGUE_2014", subclassKey: "ASSASSIN", raceKey: "HUMAN_2014" });
    expect(best.entry.slug).not.toBe("rogue-thief-human");
    expect(slugsOf({ classKey: "ROGUE_2014", subclassKey: "ASSASSIN", raceKey: null }).slice(0, 2)).toEqual(["rogue-assassin-elf", "rogue-assassin-human"]);
  });

  it("offers a build of the class itself before a multiclass build when nothing else is chosen", () => {
    expect(slugsOf({ classKey: "ROGUE_2014", subclassKey: null, raceKey: null }).at(-1)).toBe("rogue-multiclass-cleric");
  });

  it("falls back to the race, then to the class alone", () => {
    expect(slugsOf({ classKey: "ROGUE_2014", subclassKey: null, raceKey: "HUMAN_2014" }).slice(0, 2)).toEqual(["rogue-thief-human", "rogue-assassin-human"]);
    expect(findPresetSuggestions(ENTRIES, { classKey: "ROGUE_2014", subclassKey: null, raceKey: null }).every((suggestion) => !suggestion.isRaceMatch && !suggestion.isSubclassMatch)).toBe(true);
  });

  it("reports a missing match honestly when the chosen race has no preset", () => {
    const [best] = findPresetSuggestions(ENTRIES, { classKey: "ROGUE_2014", subclassKey: "THIEF", raceKey: "DWARF_2014" });
    expect(best).toMatchObject({ entry: { slug: "rogue-thief-human" }, isSubclassMatch: true, isRaceMatch: false });
  });
});
