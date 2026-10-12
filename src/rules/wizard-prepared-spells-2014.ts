import { calculateAbilityModifier } from "./abilities";

export function findWizardPreparedLimit(intelligence: number, wizardLevel: number): number {
  return Math.max(1, calculateAbilityModifier(intelligence) + wizardLevel);
}

export function findWizardPreparedSelectionProblem(input: {
  intelligence: number;
  wizardLevel: number;
  spellbookSpellIds: readonly number[];
  preparedIds: readonly number[];
}): string | null {
  if (new Set(input.preparedIds).size !== input.preparedIds.length) return "Підготовлене заклинання обрано двічі";
  if (!input.preparedIds.every((spellId) => input.spellbookSpellIds.includes(spellId))) return "Підготувати можна лише заклинання з книги";
  return input.preparedIds.length > findWizardPreparedLimit(input.intelligence, input.wizardLevel)
    ? "Забагато підготовлених заклинань для вашого Інтелекту й рівня"
    : null;
}
