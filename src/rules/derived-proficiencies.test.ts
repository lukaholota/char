import { describe, expect, it } from "vitest";
import { collectDerivedProficiencies } from "./derived-proficiencies";

describe("похідні володіння з джерел", () => {
  it("зводить обладунки без повторів", () => {
    const derived = collectDerivedProficiencies([{ armor: ["LIGHT", "MEDIUM"] }, { armor: ["LIGHT", "SHIELD"] }]);
    expect(derived.armor).toEqual(["LIGHT", "MEDIUM", "SHIELD"]);
  });

  it("зброя: масив типів, {type}, {category} і specific розводяться на типи й назви", () => {
    const derived = collectDerivedProficiencies([
      { weapons: ["SIMPLE_WEAPON"], weaponsSpecial: { specific: ["SHORTSWORD"] } },
      { weapons: { type: ["MARTIAL_WEAPON"] } },
      { weapons: { category: ["LONGSWORD", "SHORTSWORD"] } },
    ]);
    expect(derived.weaponTypes).toEqual(["SIMPLE_WEAPON", "MARTIAL_WEAPON"]);
    expect(derived.weapons).toEqual(["SHORTSWORD", "LONGSWORD"]);
  });

  it("інструменти: масив, {category} і мапа; «ANY_…» — вибір, а не надання", () => {
    const derived = collectDerivedProficiencies([
      { tools: ["THIEVES_TOOLS"] },
      { tools: { category: ["ARTISAN_TINKER"] } },
      { tools: { COOKS_UTENSILS: 1, ANY_ARTISAN_TOOL: 1 } },
    ]);
    expect(derived.tools).toEqual(["THIEVES_TOOLS", "ARTISAN_TINKER", "COOKS_UTENSILS"]);
  });

  it("пул вибору дворфа 2014, записаний текстом, наданням не рахується", () => {
    expect(collectDerivedProficiencies([{ tools: ["ковальські інструменти", "пивоварні приладдя"] }]).tools).toEqual([]);
  });

  it("мови зводяться без повторів", () => {
    expect(collectDerivedProficiencies([{ languages: ["COMMON", "ELVISH"] }, { languages: ["COMMON"] }]).languages).toEqual([
      "COMMON",
      "ELVISH",
    ]);
  });

  it("null і порожні значення нічого не дають", () => {
    expect(collectDerivedProficiencies([{ weapons: null, tools: null, armor: null, languages: null }])).toEqual({
      armor: [],
      weaponTypes: [],
      weapons: [],
      tools: [],
      languages: [],
    });
  });
});
