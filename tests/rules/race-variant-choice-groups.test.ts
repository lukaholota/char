import { describe, expect, it } from "vitest";
import { isRaceChoiceGroupReplacedByVariant, keepRaceChoiceOptionsOfVariant } from "@/rules/race-variant-choice-groups";

const options = [
  { optionId: 1, choiceGroupName: "Універсальність напівельфа" },
  { optionId: 2, choiceGroupName: "Інша група" },
];

describe("BUG-056 — мітка напівельфа замінює Універсальність навичок", () => {
  it("Мітка Виявлення й Мітка Бурі прибирають групу універсальності", () => {
    expect(keepRaceChoiceOptionsOfVariant(options, "HALF_ELF_MARK_OF_DETECTION_EBERRON").map((option) => option.optionId)).toEqual([2]);
    expect(isRaceChoiceGroupReplacedByVariant("HALF_ELF_MARK_OF_STORM_EBERRON", "Універсальність напівельфа")).toBe(true);
  });

  it("без варіанта або з іншим варіантом група лишається", () => {
    expect(keepRaceChoiceOptionsOfVariant(options, null)).toHaveLength(2);
    expect(isRaceChoiceGroupReplacedByVariant("HUMAN_VARIANT", "Універсальність напівельфа")).toBe(false);
    expect(isRaceChoiceGroupReplacedByVariant("HALF_ELF_MARK_OF_DETECTION_EBERRON", "Інша група")).toBe(false);
  });
});
