import { describe, expect, it } from "vitest";

import { isProficientSkillRow, listProficientSkills } from "@/rules/skill-proficiency";

describe("володіння навичкою — за типом, а не за наявністю рядка", () => {
  it("рядок NONE, який лишає вимкнене на листі володіння, і половинне володіння не дають володіння", () => {
    const rows = [
      { name: "PERCEPTION", proficiencyType: "NONE" },
      { name: "ATHLETICS", proficiencyType: "HALF" },
      { name: "STEALTH", proficiencyType: "PROFICIENT" },
      { name: "ACROBATICS", proficiencyType: "EXPERTISE" },
    ];

    expect(listProficientSkills(rows)).toEqual(["STEALTH", "ACROBATICS"]);
    expect(rows.map(isProficientSkillRow)).toEqual([false, false, true, true]);
  });
});
