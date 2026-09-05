import { describe, expect, it } from "vitest";
import { classTranslations, subclassTranslations } from "@/lib/refs/translation";
import { getAllSpells } from "@/lib/spellsData";
import { collectSpellClassFacets } from "@/lib/spell-class-facets";

/// Рішення власника 2026-09-02: у «Класи» фільтра заклинань — лише класи. Підкласи, які
/// сидять у тому ж полі («Домен життя», «Джин»), належать секції «Підкласи».

const BASE_CLASSES = new Set<string>(Object.values(classTranslations));

describe("collectSpellClassFacets", () => {
  it.each(["RULES_2014", "RULES_2024"] as const)("у %s класами лишаються тільки справжні класи", (ruleset) => {
    const { classes } = collectSpellClassFacets(getAllSpells(ruleset));

    expect(classes.length).toBeGreaterThan(0);
    for (const name of classes) expect(BASE_CLASSES.has(name)).toBe(true);
    expect(classes).not.toContain(subclassTranslations.LIFE_DOMAIN);
  });

  it("підкласи 2014 групуються під батьківським класом", () => {
    const { subclassesByClass } = collectSpellClassFacets(getAllSpells("RULES_2014"));
    const cleric = subclassesByClass.find((group) => group.className === classTranslations.CLERIC_2014);

    expect(cleric?.subclasses).toContain(subclassTranslations.LIFE_DOMAIN);
    for (const group of subclassesByClass) {
      for (const subclass of group.subclasses) expect(BASE_CLASSES.has(subclass)).toBe(false);
    }
  });

  it("англійська й ключова форма класу зводяться до українського імені", () => {
    const { classes } = collectSpellClassFacets([
      { spellClasses: [{ className: "Wizard" }, { className: "CLERIC_2014" }, { className: "Домен життя" }] },
    ]);
    expect(classes).toEqual([classTranslations.CLERIC_2014, classTranslations.WIZARD_2014]);
  });
});
