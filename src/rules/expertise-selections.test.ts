import { describe, expect, it } from "vitest";
import { countExpertiseSelections, findExpertiseSelectionProblem } from "./expertise-selections";

describe("expertise selections", () => {
  const bardGrant = { chooseFromCurrentProficiencies: true, count: 2 };

  it("requires the exact number of distinct proficient skills", () => {
    const base = { grants: [bardGrant], proficientSkills: ["ARCANA", "HISTORY", "STEALTH"] };

    expect(findExpertiseSelectionProblem({ ...base, selected: ["ARCANA"] })).toContain("рівно 2");
    expect(findExpertiseSelectionProblem({ ...base, selected: ["ARCANA", "ARCANA"] })).toContain("двічі");
    expect(findExpertiseSelectionProblem({ ...base, selected: ["ARCANA", "ATHLETICS"] })).toContain("доступним");
    expect(findExpertiseSelectionProblem({ ...base, selected: ["ARCANA", "STEALTH"] })).toBeNull();
  });

  it("rejects a skill that already has expertise", () => {
    expect(findExpertiseSelectionProblem({
      grants: [bardGrant],
      selected: ["ARCANA", "STEALTH"],
      proficientSkills: ["ARCANA", "STEALTH"],
      existingExpertises: ["STEALTH"],
    })).toContain("вже має");
  });

  it("supports Scholar options without granting proficiency in unrelated options", () => {
    const scholar = { count: 1, options: ["ARCANA", "HISTORY", "RELIGION"] };

    expect(findExpertiseSelectionProblem({
      grants: [scholar], selected: ["ARCANA"], proficientSkills: ["ARCANA"],
    })).toBeNull();
    expect(findExpertiseSelectionProblem({
      grants: [scholar], selected: ["HISTORY"], proficientSkills: ["ARCANA"],
    })).toContain("доступним");
  });

  it("assigns intersecting selections to the correct grant quotas", () => {
    const grants = [
      { count: 1, options: ["ARCANA", "HISTORY"], getProficiencyAsWell: true },
      { count: 1, options: ["ARCANA"] , getProficiencyAsWell: true },
    ];

    expect(findExpertiseSelectionProblem({
      grants, selected: ["ARCANA", "HISTORY"], proficientSkills: [],
    })).toBeNull();
    expect(findExpertiseSelectionProblem({
      grants, selected: ["HISTORY", "RELIGION"], proficientSkills: [],
    })).toContain("доступним");
  });

  it("uses one as the default count for a selectable grant", () => {
    expect(countExpertiseSelections([{ chooseFromCurrentProficiencies: true }, { options: ["ARCANA"] }])).toBe(2);
  });
});
