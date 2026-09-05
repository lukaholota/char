import { describe, expect, it } from "vitest";

import { getAllRaces } from "@/lib/racesData";

describe("Каталог рас — порядок", () => {
  it("ставить «Свою расу» в кінець, а не на початок", () => {
    const races = getAllRaces("RULES_2014");

    expect(races[0]?.key).not.toContain("CUSTOM_LINEAGE");
    expect(races[races.length - 1]?.key).toContain("CUSTOM_LINEAGE");
  });

  it("не губить і не дублює жодної раси", () => {
    for (const ruleset of ["RULES_2014", "RULES_2024"] as const) {
      const keys = getAllRaces(ruleset).map((race) => race.key);
      expect(new Set(keys).size).toBe(keys.length);
    }

    expect(getAllRaces("RULES_2014").length).toBe(66);
    expect(getAllRaces("RULES_2024").length).toBe(10);
  });

  it("лишає решту в тому порядку, що й була", () => {
    const withoutCustom = getAllRaces("RULES_2014")
      .filter((race) => !race.key.includes("CUSTOM_LINEAGE"))
      .map((race) => race.key);

    expect(withoutCustom.slice(0, 4)).toEqual(["HUMAN_2014", "DWARF_2014", "ELF_2014", "HALFLING_2014"]);
  });
});
