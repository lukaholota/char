import { describe, expect, it } from "vitest";
import { buildHomebrewSpellData } from "./homebrew-view";

describe("подання хоумбрю", () => {
  it("заклинання хоумбрю має відʼємний id і формат каталогу", () => {
    const spell = buildHomebrewSpellData({ entryId: 5, name: "Їжак", ruleset: "RULES_2014" }, {
      engName: null, level: 1, school: "Втілення", castingTime: "1 дія", range: "Дотик", components: "В", duration: "Миттєва",
      isRitual: true, isConcentration: false, classes: ["WIZARD_2014", "WIZARD_2024"], description: "…",
    });
    expect(spell).toMatchObject({ spellId: -5, source: "HOMEBREW", hasRitual: "так", hasConcentration: "ні", spellClasses: [{ className: "Чарівник" }] });
    expect(spell.spellClasses).toHaveLength(1);
  });
});
