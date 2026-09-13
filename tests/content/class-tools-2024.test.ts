import { describe, expect, it } from "vitest";
import classTools from "../../data/2024/normalized/class-tools.json";

const byClass = new Map(classTools.classes.map((entry) => [entry.className, entry]));

describe("KR31.2 — class tool proficiencies 2024", () => {
  it("stores fixed tools separately from player choices", () => {
    expect(byClass.get("DRUID_2024")?.fixed).toEqual(["HERBALISM_KIT"]);
    expect(byClass.get("ROGUE_2024")?.fixed).toEqual(["THIEVES_TOOLS"]);
    expect(byClass.get("ARTIFICER_2024")?.fixed).toEqual(["THIEVES_TOOLS", "TINKERS_TOOLS"]);
  });

  it("contains the exact first-level choice pools", () => {
    expect(byClass.get("BARD_2024")?.choiceCount).toBe(3);
    expect(byClass.get("BARD_2024")?.choices).toHaveLength(10);
    expect(byClass.get("MONK_2024")?.choiceCount).toBe(1);
    expect(byClass.get("MONK_2024")?.choices).toHaveLength(27);
    expect(byClass.get("ARTIFICER_2024")?.choiceCount).toBe(1);
    expect(byClass.get("ARTIFICER_2024")?.choices).toHaveLength(16);
  });

  it("does not offer the Artificer its already fixed Tinker's Tools", () => {
    expect(byClass.get("ARTIFICER_2024")?.choices).not.toContain("TINKERS_TOOLS");
  });

  it("has no duplicate choices in any class pool", () => {
    for (const entry of classTools.classes) {
      expect(new Set(entry.choices).size, entry.className).toBe(entry.choices.length);
    }
  });
});
