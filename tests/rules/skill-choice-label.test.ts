import { describe, expect, it } from "vitest";

import { describeSkillChoice, formatAnySkillsLabel, normalizeSkillProficiencies } from "@/rules/proficiency";

const allSkills = [
  "ATHLETICS", "ACROBATICS", "SLEIGHT_OF_HAND", "STEALTH", "ARCANA", "HISTORY",
  "INVESTIGATION", "NATURE", "RELIGION", "ANIMAL_HANDLING", "INSIGHT", "MEDICINE",
  "PERCEPTION", "SURVIVAL", "DECEPTION", "INTIMIDATION", "PERFORMANCE", "PERSUASION",
] as const;

type Skill = (typeof allSkills)[number];

const describeRaw = (raw: unknown) => {
  const normalized = normalizeSkillProficiencies<Skill>(raw, allSkills);
  if (!normalized) throw new Error("expected a normalized skill proficiency");
  return describeSkillChoice(normalized, allSkills);
};

describe("KR33.1 — describeSkillChoice", () => {
  it("keeps a fixed set as fixed", () => {
    expect(describeRaw(["ATHLETICS", "SURVIVAL"])).toEqual({ type: "fixed", skills: ["ATHLETICS", "SURVIVAL"] });
  });

  it("keeps a narrowed list as a pick from that list", () => {
    expect(describeRaw({ choiceCount: 2, options: ["ATHLETICS", "SURVIVAL", "NATURE"] })).toEqual({
      type: "some",
      choiceCount: 2,
      options: ["ATHLETICS", "SURVIVAL", "NATURE"],
    });
  });

  it("treats the full list of skills as any skills, regardless of order", () => {
    const shuffled = [...allSkills].reverse();
    expect(describeRaw({ choiceCount: 3, options: shuffled })).toEqual({ type: "any", choiceCount: 3 });
  });

  it("still honours the chooseAny flag", () => {
    expect(describeRaw({ choiceCount: 3, chooseAny: true })).toEqual({ type: "any", choiceCount: 3 });
    expect(describeRaw({ choiceCount: 1, options: ["ANY"] })).toEqual({ type: "any", choiceCount: 1 });
  });

  it("does not treat seventeen skills as any", () => {
    const seventeen = allSkills.slice(0, 17);
    expect(describeRaw({ choiceCount: 3, options: seventeen })).toEqual({ type: "some", choiceCount: 3, options: seventeen });
  });

  it("does not treat duplicates padding a short list as any", () => {
    const padded = [...allSkills.slice(0, 17), "ATHLETICS"];
    expect(describeRaw({ choiceCount: 3, options: padded }).type).toBe("some");
  });
});

describe("KR33.1 — formatAnySkillsLabel", () => {
  it("agrees the noun with the count", () => {
    expect(formatAnySkillsLabel(1)).toBe("1 будь-яка навичка");
    expect(formatAnySkillsLabel(3)).toBe("3 будь-які навички");
    expect(formatAnySkillsLabel(4)).toBe("4 будь-які навички");
    expect(formatAnySkillsLabel(5)).toBe("5 будь-яких навичок");
  });
});
