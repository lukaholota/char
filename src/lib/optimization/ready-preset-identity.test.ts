import { describe, expect, it } from "vitest";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { findPresetClassSelections, findPresetRaceSelections, findPresetSubclassSelection, hasFirstLevelSubclass, isChoiceSelectionValid, listFirstLevelClassOptions } from "./ready-preset-identity";

const content = findCharacterCreatorOptions("RULES_2014");
const findClass = (name: string) => content.classes.find((entry) => entry.name === name)!;
const findRace = (name: string) => content.races.find((entry) => entry.name === name)!;

describe("ready preset identity choices", () => {
  it("recognizes the classes that choose their subclass at level one", () => {
    const first = content.classes.filter((entry) => hasFirstLevelSubclass(entry)).map((entry) => entry.name).sort();
    expect(first).toEqual(["CLERIC_2014", "SORCERER_2014", "WARLOCK_2014"]);
  });
  it("lists only options granted at level one, so later invocations, pacts and styles never block a preset", () => {
    expect(listFirstLevelClassOptions(findClass("WARLOCK_2014"))).toEqual([]);
    expect(listFirstLevelClassOptions(findClass("SORCERER_2014"))).toEqual([]);
    expect(listFirstLevelClassOptions(findClass("PALADIN_2014"))).toEqual([]);
    expect(new Set(listFirstLevelClassOptions(findClass("RANGER_2014")).map((option) => option.group)).size).toBe(2);
    expect(new Set(listFirstLevelClassOptions(findClass("FIGHTER_2014")).map((option) => option.group))).toEqual(new Set(["Бойовий стиль"]));
  });
  it("requires one named option for every first-level group and rejects unknown, repeated or missing names", () => {
    const ranger = findClass("RANGER_2014");
    expect(Object.keys(findPresetClassSelections(ranger, ["Favored Enemy", "Natural Explorer"]))).toHaveLength(2);
    expect(() => findPresetClassSelections(ranger, ["Favored Enemy"])).toThrow("Incomplete preset class options");
    expect(() => findPresetClassSelections(ranger, ["Favored Enemy", "Favored Enemy", "Natural Explorer"])).toThrow("Duplicate preset class options");
    expect(() => findPresetClassSelections(ranger, ["Favored Enemy", "Missing", "Natural Explorer"])).toThrow("Missing preset class options: Missing");
    expect(() => findPresetClassSelections(ranger, ["Favored Enemy", "Favored Foe", "Natural Explorer"])).toThrow("Too many preset class options");
  });
  it("selects the first-level subclass with its dragon ancestor and refuses options for late subclasses", () => {
    const sorcerer = findClass("SORCERER_2014");
    const picked = findPresetSubclassSelection(sorcerer, "DRACONIC_BLOODLINE", ["Red Dragon (Fire)"]);
    expect(picked.subclassId).toBe(sorcerer.subclasses.find((entry) => entry.name === "DRACONIC_BLOODLINE")!.subclassId);
    expect(Object.keys(picked.subclassChoiceSelections!)).toEqual(["Дракон-предок"]);
    expect(() => findPresetSubclassSelection(sorcerer, "DRACONIC_BLOODLINE", [])).toThrow("Incomplete preset subclass options");
    expect(() => findPresetSubclassSelection(sorcerer, "NO_SUCH_ORIGIN", [])).toThrow("Missing first-level preset subclass");
    expect(findPresetSubclassSelection(findClass("DRUID_2014"), "CIRCLE_OF_THE_LAND", [])).toEqual({});
    expect(() => findPresetSubclassSelection(findClass("DRUID_2014"), "CIRCLE_OF_THE_LAND", ["Red Dragon (Fire)"])).toThrow("first-level subclass");
    expect(findPresetSubclassSelection(sorcerer, "DIVINE_SOUL", []).subclassChoiceSelections).toEqual({});
  });
  it("selects race options by group and keeps subrace-only options out of other subraces", () => {
    expect(findPresetRaceSelections(findRace("DRAGONBORN_2014"), undefined, ["Білий дракон"])).toEqual({ "Родовід дракона": 75 });
    expect(findPresetRaceSelections(findRace("DWARF_2014"), undefined, [])).toEqual({});
    expect(() => findPresetRaceSelections(findRace("DRAGONBORN_2014"), undefined, [])).toThrow("Incomplete preset race options");
    expect(() => findPresetRaceSelections(findRace("DRAGONBORN_2014"), undefined, ["Білий дракон", "Червоний дракон"])).toThrow("Too many preset race options");
  });
  it("accepts a change inside a group, keeps the group size and refuses extra, foreign or repeated ids", () => {
    const groups = [{ group: "A", options: [{ id: 1, label: "one" }, { id: 2, label: "two" }] }, { group: "B", options: [{ id: 3, label: "three" }] }];
    expect(isChoiceSelectionValid({ A: 2, B: 3 }, { A: 1, B: 3 }, groups)).toBe(true);
    expect(isChoiceSelectionValid({ A: 2 }, { A: 1, B: 3 }, groups)).toBe(false);
    expect(isChoiceSelectionValid({ A: 3, B: 3 }, { A: 1, B: 3 }, groups)).toBe(false);
    expect(isChoiceSelectionValid({ A: [1, 1], B: 3 }, { A: [1, 2], B: 3 }, groups)).toBe(false);
    expect(isChoiceSelectionValid({ A: 1, B: 3, C: 1 }, { A: 1, B: 3 }, groups)).toBe(false);
    expect(isChoiceSelectionValid({ A: 2, B: 3 }, { A: 1, B: 3 }, [{ ...groups[0], isLocked: true }, groups[1]])).toBe(false);
  });
});
