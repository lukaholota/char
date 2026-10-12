import { calculateAbilityModifier } from "./abilities";

export function findInitialWizardPreparedLimit(effectiveIntelligence: number): number {
  return Math.max(1, calculateAbilityModifier(effectiveIntelligence) + 1);
}

export function findInitialPreparedSpellProblem(input: {
  ruleset: string; className: string; spellbookIds: readonly number[];
  preparedIds: readonly number[] | undefined; effectiveIntelligence: number;
}): string | null {
  const selected = input.preparedIds ?? [];
  if (!selected.length) return null;
  if (input.ruleset !== "RULES_2014" || input.className !== "WIZARD_2014") return "Стартова підготовка з книги доступна лише Чарівнику 2014";
  if (new Set(selected).size !== selected.length) return "Підготовлене заклинання обрано двічі";
  if (!selected.every((spellId) => input.spellbookIds.includes(spellId))) return "Підготувати можна лише стартові заклинання з книги";
  return selected.length > findInitialWizardPreparedLimit(input.effectiveIntelligence) ? "Забагато підготовлених заклинань для вашого Інтелекту" : null;
}

type ListPreparedCaster = { ability: "INT" | "WIS"; levelDivisor: number };

const LIST_PREPARED_CASTERS_2014: Readonly<Record<string, ListPreparedCaster>> = {
  CLERIC_2014: { ability: "WIS", levelDivisor: 1 },
  DRUID_2014: { ability: "WIS", levelDivisor: 1 },
  ARTIFICER_2014: { ability: "INT", levelDivisor: 2 },
};

export function isListPreparedCaster2014(className: string): boolean {
  return className in LIST_PREPARED_CASTERS_2014;
}

export function findInitialListPreparedLimit(className: string, scores: Readonly<Record<"INT" | "WIS", number>>): number {
  const caster = LIST_PREPARED_CASTERS_2014[className];
  if (!caster) return 0;
  return Math.max(1, calculateAbilityModifier(scores[caster.ability]) + Math.floor(1 / caster.levelDivisor));
}

export type InitialPreparedSelection = {
  ruleset: string; className: string; preparedIds: readonly number[] | undefined;
  spellbookIds: readonly number[]; listSpellIds: readonly number[];
  scores: Readonly<Record<"INT" | "WIS", number>>;
};

export function findInitialPreparedSelectionProblem(input: InitialPreparedSelection): string | null {
  if (input.ruleset === "RULES_2014" && isListPreparedCaster2014(input.className)) return findInitialListPreparedSpellProblem(input);
  return findInitialPreparedSpellProblem({ ruleset: input.ruleset, className: input.className, spellbookIds: input.spellbookIds,
    preparedIds: input.preparedIds, effectiveIntelligence: input.scores.INT });
}

function findInitialListPreparedSpellProblem(input: InitialPreparedSelection): string | null {
  const selected = input.preparedIds ?? [];
  if (!selected.length) return null;
  if (new Set(selected).size !== selected.length) return "Підготовлене заклинання обрано двічі";
  if (!selected.every((spellId) => input.listSpellIds.includes(spellId))) return "Підготувати можна лише заклинання 1-го рівня зі списку свого класу, які ще не дає правило";
  return selected.length > findInitialListPreparedLimit(input.className, input.scores) ? "Забагато підготовлених заклинань для вашої характеристики" : null;
}
