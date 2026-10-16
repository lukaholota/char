import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { findRacialChoiceSelectionProblem, listRacialChoiceGroups } from "@/rules/racial-ability-choices";

const content = findCharacterCreationOptions("RULES_2014");
const findRace = (name: string) => content.races.find((race) => race.name === name)!;

describe("racial ability choices sent to the server (PHB 2014 / Tasha's Customizing Your Origin)", () => {
  const hobgoblinGroups = listRacialChoiceGroups({ isDefaultASI: false, raceASI: findRace("HOBGOBLIN_MPMM").ASI, subraceReplacesASI: false });

  it("accepts every group filled with its own count", () => {
    expect(findRacialChoiceSelectionProblem(hobgoblinGroups, [
      { groupIndex: 0, selectedAbilities: ["DEX", "CHA"] },
      { groupIndex: 1, selectedAbilities: ["DEX"] },
    ])).toBeNull();
    expect(findRacialChoiceSelectionProblem(hobgoblinGroups, [])).toBeNull();
  });

  it("rejects a group the race does not have", () => {
    expect(findRacialChoiceSelectionProblem(hobgoblinGroups, [{ groupIndex: 7, selectedAbilities: ["STR"] }])).toContain("такої групи");
    expect(findRacialChoiceSelectionProblem(hobgoblinGroups, [{ groupIndex: -1, selectedAbilities: ["STR"] }])).toContain("такої групи");
  });

  it("rejects the same group sent twice", () => {
    expect(findRacialChoiceSelectionProblem(hobgoblinGroups, [
      { groupIndex: 1, selectedAbilities: ["DEX"] },
      { groupIndex: 1, selectedAbilities: ["STR"] },
    ])).toContain("двічі");
  });

  it("rejects fewer or more abilities than the group gives", () => {
    expect(findRacialChoiceSelectionProblem(hobgoblinGroups, [{ groupIndex: 0, selectedAbilities: ["DEX"] }])).toContain("рівно 2");
    expect(findRacialChoiceSelectionProblem(hobgoblinGroups, [{ groupIndex: 1, selectedAbilities: ["DEX", "CHA"] }])).toContain("рівно 1");
  });

  it("rejects a repeat inside one group", () => {
    expect(findRacialChoiceSelectionProblem(hobgoblinGroups, [{ groupIndex: 0, selectedAbilities: ["DEX", "DEX"] }])).toContain("в одній групі");
  });

  it("forbids repeats between groups only when every group is unique", () => {
    const elf = findRace("ELF_2014");
    const highElf = elf.subraces.find((subrace) => subrace.name === "ELF_HIGH_2014")!;
    const elfGroups = listRacialChoiceGroups({ isDefaultASI: false, raceASI: elf.ASI, subraceASI: highElf.additionalASI, subraceReplacesASI: false });
    expect(findRacialChoiceSelectionProblem(elfGroups, [
      { groupIndex: 0, selectedAbilities: ["DEX"] },
      { groupIndex: 1, selectedAbilities: ["DEX"] },
    ])).toContain("не дозволяють");
    expect(findRacialChoiceSelectionProblem(elfGroups, [
      { groupIndex: 0, selectedAbilities: ["DEX"] },
      { groupIndex: 1, selectedAbilities: ["INT"] },
    ])).toBeNull();
  });
});
