/**
 * KR31.5 — заклинання, яке риса 2024 дає обрати самому гравцеві. «Choose one level 1 spell from
 * the Divination or Enchantment school of magic» (Fey Touched) — книга задає фільтр, а не перелік,
 * тож правило тримає фільтр, а кандидатів дає каталог заклинань.
 */

import type { RulesetId } from "./strategies/types";

export type SpellSchoolKey =
  | "ABJURATION"
  | "CONJURATION"
  | "DIVINATION"
  | "ENCHANTMENT"
  | "EVOCATION"
  | "ILLUSION"
  | "NECROMANCY"
  | "TRANSMUTATION";

export type FeatSpellChoiceRule = {
  count: number;
  spellLevel: number;
  schools: readonly SpellSchoolKey[];
};

export type FeatSpellCandidate = { spellId: number; level: number; school: string | null };

export type FeatSpellOption = FeatSpellCandidate & { name: string; engName: string };

export type FeatSpellChoiceOffer = { count: number; spells: FeatSpellOption[] };

const FEAT_SPELL_CHOICES_2024: Readonly<Record<string, FeatSpellChoiceRule>> = {
  FEY_TOUCHED: { count: 1, spellLevel: 1, schools: ["DIVINATION", "ENCHANTMENT"] },
  SHADOW_TOUCHED: { count: 1, spellLevel: 1, schools: ["ILLUSION", "NECROMANCY"] },
};

export function findFeatSpellChoiceRule(ruleset: RulesetId, featName: string): FeatSpellChoiceRule | null {
  if (ruleset !== "RULES_2024") return null;
  return FEAT_SPELL_CHOICES_2024[featName] ?? null;
}

export function listFeatNamesWithSpellChoice(ruleset: RulesetId): string[] {
  return ruleset === "RULES_2024" ? Object.keys(FEAT_SPELL_CHOICES_2024) : [];
}

export function isFeatSpellCandidate(rule: FeatSpellChoiceRule, spell: FeatSpellCandidate): boolean {
  return spell.level === rule.spellLevel && rule.schools.some((school) => school === spell.school);
}

export function findFeatSpellSelectionProblem(
  rule: FeatSpellChoiceRule,
  selectedSpellIds: readonly number[],
  candidates: readonly FeatSpellCandidate[],
): string | null {
  const selected = new Set(selectedSpellIds);
  if (selected.size !== rule.count || selectedSpellIds.length !== rule.count) {
    return `Оберіть ${rule.count} заклинання риси`;
  }

  const candidateIds = new Set(candidates.filter((spell) => isFeatSpellCandidate(rule, spell)).map((spell) => spell.spellId));
  const fitsRule = [...selected].every((spellId) => candidateIds.has(spellId));

  return fitsRule ? null : "Обране заклинання не підходить цій рисі";
}
