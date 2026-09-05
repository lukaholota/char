import { describe, expect, it } from "vitest";
import {
  applySpellSlotMaximumDelta,
  getMaximumPactSpellSlots,
  getMaximumStandardSpellSlots,
  normalizeSpellSlotArray,
} from "@/rules/spellcasting";
import { normalizeSkillProficiencies } from "@/rules/proficiency";

const skills = ["ATHLETICS", "ARCANA", "STEALTH"] as const;
const standardProgression = { 0: [], 5: [4, 3, 2] };
const pactProgression = { 0: { slots: 0, level: 0 }, 5: { slots: 2, level: 3 } };

describe("KR3.3 — pure level-up helpers", () => {
  it("normalizes slots and only restores the maximum delta", () => {
    expect(normalizeSpellSlotArray(["3", -1, 1.8])).toEqual([3, 0, 1, 0, 0, 0, 0, 0, 0]);
    expect(applySpellSlotMaximumDelta([1], [2], [3])).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("keeps standard multiclass slots and Pact Magic separate", () => {
    const character = {
      level: 10,
      characterClass: { name: "WIZARD_2014", spellcastingType: "FULL" as const },
      multiclasses: [{ classLevel: 5, characterClass: { name: "WARLOCK_2014", spellcastingType: "PACT" as const } }],
    };
    expect(getMaximumStandardSpellSlots(character, standardProgression, "RULES_2014")).toEqual([4, 3, 2, 0, 0, 0, 0, 0, 0]);
    expect(getMaximumPactSpellSlots(character, pactProgression, "RULES_2014")).toBe(2);
  });

  it("normalizes fixed and choice skill payloads", () => {
    expect(normalizeSkillProficiencies(["ATHLETICS", "UNKNOWN"], skills)).toEqual({ type: "fixed", skills: ["ATHLETICS"] });
    expect(normalizeSkillProficiencies({ any: "2" }, skills)).toEqual({ type: "choice", choiceCount: 2, options: [...skills] });
  });
});
