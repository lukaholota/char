import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { buildCreationAbilityScores } from "./character-creation";
import { countRacialChoices, findRacialAbilityChoiceProblem, listRacialChoiceGroups, splitRacialAbilityChoices } from "./racial-ability-choices";

const content = findCharacterCreationOptions("RULES_2014");
const findRace = (name: string) => content.races.find((race) => race.name === name)!;

describe("racial ability choice groups", () => {
  const hobgoblin = findRace("HOBGOBLIN_MPMM");
  const hobgoblinGroups = listRacialChoiceGroups({ isDefaultASI: false, raceASI: hobgoblin.ASI, subraceReplacesASI: false });

  it("lists the Tasha groups of a Monsters of the Multiverse race: two different +1 and one more +1", () => {
    expect(hobgoblinGroups).toHaveLength(2);
    expect(countRacialChoices(hobgoblinGroups)).toBe(3);
  });

  it("splits a flat list into groups in catalog order", () => {
    expect(splitRacialAbilityChoices(hobgoblinGroups, ["DEX", "CHA", "DEX"])).toEqual([
      { groupIndex: 0, choiceCount: 2, selectedAbilities: ["DEX", "CHA"] },
      { groupIndex: 1, choiceCount: 1, selectedAbilities: ["DEX"] },
    ]);
  });

  it("gives the same scores as the creation rule for the split choices", () => {
    const choices = splitRacialAbilityChoices(hobgoblinGroups, ["DEX", "CHA", "DEX"]);
    const scores = buildCreationAbilityScores({
      ruleset: "RULES_2014", asiSystem: "POINT_BUY", pointBuy: [], simple: [], isDefaultASI: false, raceASI: hobgoblin.ASI, subraceReplacesASI: false,
      racialChoices: { basicChoices: [], tashaChoices: choices }, feats: [],
    }).scores;
    expect(scores).toMatchObject({ STR: 10, DEX: 12, CON: 10, INT: 10, WIS: 10, CHA: 11 });
  });

  it("accepts +2/+1 on different groups and rejects a repeat inside one group", () => {
    expect(findRacialAbilityChoiceProblem(hobgoblinGroups, ["DEX", "CHA", "DEX"], "tasha")).toBeNull();
    expect(findRacialAbilityChoiceProblem(hobgoblinGroups, ["DEX", "DEX", "CHA"], "tasha")).toContain("повторює");
  });

  it("rejects a wrong number of choices", () => {
    expect(findRacialAbilityChoiceProblem(hobgoblinGroups, ["DEX", "CHA"], "tasha")).toContain("3 підвищень");
    expect(findRacialAbilityChoiceProblem(hobgoblinGroups, ["DEX", "CHA", "STR", "WIS"], "tasha")).toContain("3 підвищень");
  });

  it("adds the subrace groups of a classic race under Tasha rules and forbids repeats when every group is unique", () => {
    const elf = findRace("ELF_2014");
    const highElf = elf.subraces.find((subrace) => subrace.name === "ELF_HIGH_2014")!;
    const groups = listRacialChoiceGroups({ isDefaultASI: false, raceASI: elf.ASI, subraceASI: highElf.additionalASI, subraceReplacesASI: highElf.replacesASI ?? false });
    expect(groups).toHaveLength(2);
    expect(findRacialAbilityChoiceProblem(groups, ["DEX", "INT"], "tasha")).toBeNull();
    expect(findRacialAbilityChoiceProblem(groups, ["DEX", "DEX"], "tasha")).toContain("повторів між собою");
  });

  it("keeps the classic rule of distinct flexible bonuses", () => {
    const groups = [{ value: 1, unique: true, choiceCount: 2 }];
    expect(findRacialAbilityChoiceProblem(groups, ["DEX", "WIS"], "basic")).toBeNull();
    expect(findRacialAbilityChoiceProblem(groups, ["DEX", "DEX"], "basic")).not.toBeNull();
  });
});
