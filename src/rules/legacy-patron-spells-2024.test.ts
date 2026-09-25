import { describe, expect, it } from "vitest";

import { findLegacyPatronSpellList } from "./legacy-patron-spells-2024";

describe("O43 — розширений список легасі-покровителя 2024", () => {
  it("Відьмацький клинок бере Shining Smite 2024 замість Branding Smite", () => {
    const hexblade = findLegacyPatronSpellList("WARLOCK_2024", "HEXBLADE");

    expect(hexblade?.name).toBe("Відьмацький клинок");
    expect(hexblade?.spellEngNames).toContain("Shining Smite");
    expect(hexblade?.spellEngNames).not.toContain("Branding Smite");
  });

  it("Джин несе весь список — спільні заклинання й усі чотири роди", () => {
    const genie = findLegacyPatronSpellList("WARLOCK_2024", "THE_GENIE");

    expect(genie?.name).toBe("Джин");
    expect(genie?.spellEngNames).toHaveLength(26);
    expect(genie?.spellEngNames).toEqual(expect.arrayContaining(["Sanctuary", "Spike Growth", "Thunderwave", "Wish"]));
  });

  it("покровитель PHB 2024 і Джин під класом 2014 розширеного списку легасі не мають", () => {
    expect(findLegacyPatronSpellList("WARLOCK_2024", "FIEND_PATRON")).toBeNull();
    expect(findLegacyPatronSpellList("WARLOCK_2014", "THE_GENIE")).toBeNull();
    expect(findLegacyPatronSpellList("WARLOCK_2024", null)).toBeNull();
  });
});
