import { expect, it } from "vitest";
import { findInitialPreparedSpellProblem, findInitialWizardPreparedLimit } from "./initial-prepared-spells-2014";

const wizard = { ruleset: "RULES_2014", className: "WIZARD_2014", spellbookIds: [1, 2, 3, 4, 5, 6], effectiveIntelligence: 16 };

it("preserves manual creation without a starting preparation list", () => {
  expect(findInitialPreparedSpellProblem({ ...wizard, preparedIds: undefined })).toBeNull();
  expect(findInitialPreparedSpellProblem({ ...wizard, ruleset: "RULES_2024", preparedIds: [] })).toBeNull();
});
it("allows distinct book spells within the effective Intelligence plus level-one limit", () => {
  expect(findInitialWizardPreparedLimit(16)).toBe(4);
  expect(findInitialWizardPreparedLimit(8)).toBe(1);
  expect(findInitialPreparedSpellProblem({ ...wizard, preparedIds: [1, 2, 3, 4] })).toBeNull();
  expect(findInitialPreparedSpellProblem({ ...wizard, effectiveIntelligence: 14, preparedIds: [1, 2, 3, 4] })).not.toBeNull();
});
it("rejects duplicate, absent-book, wrong-class and wrong-edition prepared picks", () => {
  expect(findInitialPreparedSpellProblem({ ...wizard, preparedIds: [1, 1] })).not.toBeNull();
  expect(findInitialPreparedSpellProblem({ ...wizard, preparedIds: [999] })).not.toBeNull();
  expect(findInitialPreparedSpellProblem({ ...wizard, className: "BARD_2014", preparedIds: [1] })).not.toBeNull();
  expect(findInitialPreparedSpellProblem({ ...wizard, ruleset: "RULES_2024", preparedIds: [1] })).not.toBeNull();
});
