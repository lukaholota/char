import { expect, it } from "vitest";
import { findWizardPreparedLimit, findWizardPreparedSelectionProblem } from "./wizard-prepared-spells-2014";

const wizard = { intelligence: 18, wizardLevel: 5, spellbookSpellIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };

it("limits preparation to the Intelligence modifier plus the Wizard level, at least one", () => {
  expect(findWizardPreparedLimit(18, 5)).toBe(9);
  expect(findWizardPreparedLimit(16, 1)).toBe(4);
  expect(findWizardPreparedLimit(8, 1)).toBe(1);
  expect(findWizardPreparedLimit(3, 1)).toBe(1);
});

it("accepts distinct book spells within the limit", () => {
  expect(findWizardPreparedSelectionProblem({ ...wizard, preparedIds: [1, 2, 3, 4, 5, 6, 7, 8, 9] })).toBeNull();
  expect(findWizardPreparedSelectionProblem({ ...wizard, preparedIds: [] })).toBeNull();
});

it("rejects duplicates, spells outside the book and more spells than the limit", () => {
  expect(findWizardPreparedSelectionProblem({ ...wizard, preparedIds: [1, 1] })).not.toBeNull();
  expect(findWizardPreparedSelectionProblem({ ...wizard, preparedIds: [99] })).not.toBeNull();
  expect(findWizardPreparedSelectionProblem({ ...wizard, preparedIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })).not.toBeNull();
});
