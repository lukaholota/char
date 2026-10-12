import { describe, expect, it } from "vitest";
import { SkillsEnum } from "@/lib/types/enums";
import { findMulticlassSkillChoice, findMulticlassSkillProblem } from "./multiclass-skill-choice";

const ROGUE_SKILLS = { choiceCount: 4, options: ["ACROBATICS", "ATHLETICS", "DECEPTION", "INSIGHT", "INTIMIDATION", "INVESTIGATION", "PERCEPTION", "PERFORMANCE", "PERSUASION", "SLEIGHT_OF_HAND", "STEALTH"] };

describe("findMulticlassSkillChoice", () => {
  it("offers the class's own skill list for a Rogue", () => {
    const choice = findMulticlassSkillChoice("ROGUE_2014", ROGUE_SKILLS, SkillsEnum);
    expect(choice?.choiceCount).toBe(1);
    expect(choice?.options).toEqual(ROGUE_SKILLS.options);
  });

  it("offers every skill for a Bard", () => {
    const choice = findMulticlassSkillChoice("BARD_2014", { any: 3 }, SkillsEnum);
    expect(choice?.options).toHaveLength(SkillsEnum.length);
  });

  it("offers nothing for a class that gains no skill", () => {
    expect(findMulticlassSkillChoice("FIGHTER_2014", ROGUE_SKILLS, SkillsEnum)).toBeNull();
    expect(findMulticlassSkillChoice("ARTIFICER_2014", ROGUE_SKILLS, SkillsEnum)).toBeNull();
  });
});

describe("findMulticlassSkillProblem", () => {
  const rogue = findMulticlassSkillChoice("ROGUE_2014", ROGUE_SKILLS, SkillsEnum)!;

  it("accepts one skill from the list that the character does not know", () => {
    expect(findMulticlassSkillProblem(rogue, ["STEALTH"], ["PERCEPTION"])).toBeNull();
  });

  it("asks for a pick when nothing is chosen", () => {
    expect(findMulticlassSkillProblem(rogue, [], [])).toContain("оберіть рівно 1");
  });

  it("refuses a skill outside the class list and a skill already known", () => {
    expect(findMulticlassSkillProblem(rogue, ["ARCANA"], [])).toContain("недоступна");
    expect(findMulticlassSkillProblem(rogue, ["STEALTH"], ["STEALTH"])).toContain("недоступна");
  });

  it("refuses more skills than the class gives", () => {
    expect(findMulticlassSkillProblem(rogue, ["STEALTH", "INSIGHT"], [])).toContain("оберіть рівно 1");
  });

  it("does not trap the player when every offered skill is already known", () => {
    expect(findMulticlassSkillProblem(rogue, [], ROGUE_SKILLS.options)).toBeNull();
  });
});
