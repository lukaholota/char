import { describe, expect, it } from "vitest";

import { formatClassSkillChoices } from "@/components/classes/ClassDetailCard";
import { getAllClasses } from "@/lib/classesData";

describe("KR33.1 — class catalog skill label", () => {
  const classes = [...getAllClasses("RULES_2014"), ...getAllClasses("RULES_2024")];

  it("prints «3 будь-які навички» for the Bard of both editions", () => {
    const bards = classes.filter((entry) => entry.key.startsWith("BARD_"));
    expect(bards.map((entry) => entry.key).sort()).toEqual(["BARD_2014", "BARD_2024"]);
    for (const bard of bards) {
      expect(formatClassSkillChoices(bard.skillChoices)).toBe("3 будь-які навички");
    }
  });

  it("keeps the narrowed list for the other thirteen classes of each edition", () => {
    const others = classes.filter((entry) => !entry.key.startsWith("BARD_"));
    expect(others.filter((entry) => entry.ruleset === "RULES_2014")).toHaveLength(13);
    expect(others.filter((entry) => entry.ruleset === "RULES_2024")).toHaveLength(13);
    for (const entry of others) {
      const label = formatClassSkillChoices(entry.skillChoices);
      expect(label).toMatch(new RegExp(`^${entry.skillChoices.count} з: `));
      expect(label.split(", ")).toHaveLength(entry.skillChoices.options.length);
      expect(label).not.toContain("будь-які");
    }
  });
});
