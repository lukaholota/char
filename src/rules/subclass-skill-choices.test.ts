import { describe, expect, it } from "vitest";
import { collectSubclassSkillChoice, findSubclassSkillChoiceProblem } from "./subclass-skill-choices";

const ALL = ["ATHLETICS", "INSIGHT", "PERFORMANCE", "PERSUASION", "INTIMIDATION", "ARCANA"];
const PEACE = { options: ["INSIGHT", "PERFORMANCE", "PERSUASION"], choiceCount: 1 };

describe("skill choice of a first-level subclass", () => {
  it("collects the choice count and options of the features that offer one", () => {
    expect(collectSubclassSkillChoice([null, PEACE, ["ARCANA"]], ALL)).toEqual({ count: 1, options: ["INSIGHT", "PERFORMANCE", "PERSUASION"] });
    expect(collectSubclassSkillChoice([null, undefined], ALL)).toEqual({ count: 0, options: [] });
  });

  it("merges several choices of one subclass", () => {
    const merged = collectSubclassSkillChoice([PEACE, { options: ["INTIMIDATION", "PERSUASION"], choiceCount: 1 }], ALL);
    expect(merged.count).toBe(2);
    expect(merged.options).toEqual(["INSIGHT", "PERFORMANCE", "PERSUASION", "INTIMIDATION"]);
  });

  it("accepts exactly the offered number of listed skills", () => {
    expect(findSubclassSkillChoiceProblem({ count: 1, options: PEACE.options }, ["PERFORMANCE"])).toBeNull();
    expect(findSubclassSkillChoiceProblem({ count: 0, options: [] }, [])).toBeNull();
  });

  it.each([
    ["too few", ["PERSUASION"], { count: 2, options: PEACE.options }],
    ["too many", ["PERSUASION", "INSIGHT"], { count: 1, options: PEACE.options }],
    ["a repeat", ["PERSUASION", "PERSUASION"], { count: 2, options: PEACE.options }],
    ["a skill outside the list", ["ARCANA"], { count: 1, options: PEACE.options }],
    ["a pick where nothing is offered", ["ARCANA"], { count: 0, options: [] }],
  ])("rejects %s", (_label, picked, choice) => {
    expect(findSubclassSkillChoiceProblem(choice, picked)).toEqual(expect.any(String));
  });
});
