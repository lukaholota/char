import { describe, expect, it } from "vitest";
import { findInitialListPreparedLimit, findInitialPreparedSelectionProblem, isListPreparedCaster2014 } from "./initial-prepared-spells-2014";

const scores = { INT: 8, WIS: 16 };
const cleric = { ruleset: "RULES_2014", className: "CLERIC_2014", preparedIds: [1, 2, 3, 4], spellbookIds: [], listSpellIds: [1, 2, 3, 4, 5], scores };

describe("стартова підготовка зі списку класу 2014", () => {
  it("Клірик і Друїд — модифікатор Мудрості + 1, Винахідник — модифікатор Інтелекту, не менше одного", () => {
    expect(findInitialListPreparedLimit("CLERIC_2014", { INT: 8, WIS: 16 })).toBe(4);
    expect(findInitialListPreparedLimit("DRUID_2014", { INT: 8, WIS: 8 })).toBe(1);
    expect(findInitialListPreparedLimit("ARTIFICER_2014", { INT: 16, WIS: 8 })).toBe(3);
    expect(findInitialListPreparedLimit("ARTIFICER_2014", { INT: 8, WIS: 16 })).toBe(1);
    expect(findInitialListPreparedLimit("WIZARD_2014", scores)).toBe(0);
  });
  it("пізнає лише Клірика, Друїда й Винахідника", () => {
    expect(["CLERIC_2014", "DRUID_2014", "ARTIFICER_2014"].every(isListPreparedCaster2014)).toBe(true);
    expect(["WIZARD_2014", "PALADIN_2014", "BARD_2014"].some(isListPreparedCaster2014)).toBe(false);
  });
  it("приймає різні заклинання зі списку в межах ліміту", () => {
    expect(findInitialPreparedSelectionProblem(cleric)).toBeNull();
    expect(findInitialPreparedSelectionProblem({ ...cleric, preparedIds: undefined })).toBeNull();
    expect(findInitialPreparedSelectionProblem({ ...cleric, preparedIds: [] })).toBeNull();
  });
  it("відхиляє повтор, чуже заклинання й перевищення ліміту", () => {
    expect(findInitialPreparedSelectionProblem({ ...cleric, preparedIds: [1, 1] })).toContain("двічі");
    expect(findInitialPreparedSelectionProblem({ ...cleric, preparedIds: [1, 99] })).toContain("зі списку свого класу");
    expect(findInitialPreparedSelectionProblem({ ...cleric, preparedIds: [1, 2, 3, 4, 5] })).toContain("Забагато");
    expect(findInitialPreparedSelectionProblem({ ...cleric, scores: { INT: 8, WIS: 14 } })).toContain("Забагато");
  });
  it("редакція 2024 і клас без підготовки зі списку дістають відмову, Чарівник лишається на книзі", () => {
    expect(findInitialPreparedSelectionProblem({ ...cleric, ruleset: "RULES_2024" })).not.toBeNull();
    expect(findInitialPreparedSelectionProblem({ ...cleric, className: "PALADIN_2014" })).not.toBeNull();
    const wizard = { ...cleric, className: "WIZARD_2014", scores: { INT: 16, WIS: 8 }, spellbookIds: [1, 2, 3, 4, 5, 6], listSpellIds: [] };
    expect(findInitialPreparedSelectionProblem(wizard)).toBeNull();
    expect(findInitialPreparedSelectionProblem({ ...wizard, preparedIds: [7] })).toContain("з книги");
  });
});
