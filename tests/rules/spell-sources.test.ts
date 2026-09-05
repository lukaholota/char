import { describe, expect, it } from "vitest";
import { findSpellSources, type SpellcastingClass } from "@/rules/spell-sources";

const paladin: SpellcastingClass = { name: "PALADIN_2024", spellcastingType: "HALF", primaryCastingStat: "CHA" };
const sorcerer: SpellcastingClass = { name: "SORCERER_2024", spellcastingType: "FULL", primaryCastingStat: "CHA" };
const wizard: SpellcastingClass = { name: "WIZARD_2024", spellcastingType: "FULL", primaryCastingStat: "INT" };
const cleric: SpellcastingClass = { name: "CLERIC_2024", spellcastingType: "FULL", primaryCastingStat: "WIS" };
const fighter: SpellcastingClass = { name: "FIGHTER_2024", spellcastingType: "NONE", primaryCastingStat: null };

function classSources(characterClasses: SpellcastingClass[], ruleset: "RULES_2014" | "RULES_2024" = "RULES_2024") {
  return findSpellSources({ ruleset, characterClasses, raceTraits: [], raceChoiceOptions: [], featOptions: [] })
    .filter((source) => source.kind === "CLASS")
    .map((source) => ({ source: source.key, ability: source.ability }));
}

describe("KR27.5 — джерело заклинань на кожен клас мультикласу 2024 (§15.9)", () => {
  it("чарівник і клірик — два джерела з різними характеристиками (№21)", () => {
    expect(classSources([wizard, cleric])).toEqual([
      { source: "WIZARD_2024", ability: "INT" },
      { source: "CLERIC_2024", ability: "WIS" },
    ]);
  });

  it("паладин і чародій — два джерела, хоч характеристика й та сама (№12)", () => {
    expect(classSources([paladin, sorcerer])).toEqual([
      { source: "PALADIN_2024", ability: "CHA" },
      { source: "SORCERER_2024", ability: "CHA" },
    ]);
  });

  it("клас без чаклунства джерелом не стає, і порядок — за порядком узяття класів (№17)", () => {
    expect(classSources([fighter, wizard])).toEqual([{ source: "WIZARD_2024", ability: "INT" }]);
  });

  it("персонаж 2014 джерел не має — його заклинання рахуються за старою схемою", () => {
    expect(classSources([wizard, cleric], "RULES_2014")).toEqual([]);
  });
});
