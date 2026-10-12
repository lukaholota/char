import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { buildReadyPresetOptions } from "./ready-preset-options";

const content = findCharacterCreationOptions("RULES_2014");

function listWeaponNames(className: string, group: string, option: string): string[] {
  const characterClass = content.classes.find((entry) => entry.name === className)!;
  const race = content.races.find((entry) => entry.name === "HUMAN_2014")!;
  const background = content.backgrounds[0];
  const options = buildReadyPresetOptions({ classId: characterClass.classId, raceId: race.raceId, backgroundId: background.backgroundId }, content);
  return options.equipmentGroups.find((entry) => entry.group === group)!.choices.find((choice) => choice.option === option)!.weapons.map((weapon) => weapon.name);
}

describe("any-weapon starting equipment choices", () => {
  it("offers martial ranged weapons to a Fighter, whose book allows any martial weapon", () => {
    expect(listWeaponNames("FIGHTER_2014", "2", "a")).toEqual(expect.arrayContaining(["HAND_CROSSBOW", "LONGBOW", "LONGSWORD"]));
  });

  it("keeps melee-only choices melee-only", () => {
    const barbarian = listWeaponNames("BARBARIAN_2014", "1", "b");
    expect(barbarian).toContain("LONGSWORD");
    expect(barbarian).not.toContain("HAND_CROSSBOW");
    expect(listWeaponNames("PALADIN_2014", "2", "b")).not.toContain("LIGHT_CROSSBOW");
  });
});
