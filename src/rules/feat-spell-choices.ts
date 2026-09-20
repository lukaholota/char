/**
 * KR31.5 — заклинання, які риса 2024 дає обрати самому гравцеві. «Choose one level 1 spell from
 * the Divination or Enchantment school of magic» (Fey Touched) — книга задає фільтр, а не перелік,
 * тож правило тримає фільтр ([Р42](../../docs/DECISIONS.md#р42)), а кандидатів дає каталог заклинань.
 * Magic Initiate просить дві порції з одного списку — два замовляння й одне заклинання 1-го рівня,
 * а список гравець обирає опцією риси. Ritual Caster — «level 1 spells equal to your Proficiency Bonus
 * that have the Ritual tag», і ще одне щоразу, коли бонус росте: порція — бонус мінус уже взяте.
 */

import { classTranslations } from "@/lib/refs/translation";

import { calculateProficiencyBonus } from "./proficiency";
import {
  areAllSpellsOffered,
  hasExactSpellCount,
  isSpellChoiceCandidate,
  type SpellChoiceCandidate,
  type SpellChoiceFilter,
  type SpellChoiceOption,
  type SpellSchoolKey,
} from "./spell-choice-filter";
import type { RulesetId } from "./strategies/types";

export type { SpellSchoolKey } from "./spell-choice-filter";

export type FeatSpellPickRule = {
  count: number;
  spellLevel: number;
  /** Порція на кілька рівнів одразу — «a cantrip or a spell for which you have spell slots». */
  maxSpellLevel?: number;
  schools: readonly SpellSchoolKey[] | null;
  spellList: string | readonly string[] | null;
  ritualOnly?: boolean;
};

export type FeatSpellChoiceContext = { characterLevel: number; ownedFeatSpellCount: number };

export type FeatSpellChoiceRule = { picks: FeatSpellPickRule[] };

export type FeatSpellCandidate = SpellChoiceCandidate;

export type FeatSpellOption = SpellChoiceOption;

export type FeatSpellChoicePick = { count: number; spellLevel: number; maxSpellLevel?: number; spells: FeatSpellOption[] };

export type FeatSpellChoiceOffer = { picks: FeatSpellChoicePick[] };

export type FeatSpellGrowthOffer = { featName: string; offer: FeatSpellChoiceOffer };

const TOUCHED_FEAT_SCHOOLS_2024: Readonly<Record<string, readonly SpellSchoolKey[]>> = {
  FEY_TOUCHED: ["DIVINATION", "ENCHANTMENT"],
  SHADOW_TOUCHED: ["ILLUSION", "NECROMANCY"],
};

const MAGIC_INITIATE_LIST_OPTIONS_2024: Readonly<Record<string, keyof typeof classTranslations>> = {
  "Magic Initiate 2024 (Cleric)": "CLERIC_2024",
  "Magic Initiate 2024 (Druid)": "DRUID_2024",
  "Magic Initiate 2024 (Wizard)": "WIZARD_2024",
};

const MAGIC_INITIATE = "MAGIC_INITIATE";
const RITUAL_CASTER = "RITUAL_CASTER";

const FIRST_LEVEL_CONTEXT: FeatSpellChoiceContext = { characterLevel: 1, ownedFeatSpellCount: 0 };

export function findFeatSpellChoiceRule(
  ruleset: RulesetId,
  featName: string,
  chosenOptionNamesEng: readonly string[] = [],
  context: FeatSpellChoiceContext = FIRST_LEVEL_CONTEXT,
): FeatSpellChoiceRule | null {
  if (ruleset !== "RULES_2024") return null;
  if (featName === MAGIC_INITIATE) return buildMagicInitiateRule(chosenOptionNamesEng);
  if (featName === RITUAL_CASTER) return buildRitualCasterRule(context);

  const schools = TOUCHED_FEAT_SCHOOLS_2024[featName];
  return schools ? { picks: [{ count: 1, spellLevel: 1, schools, spellList: null }] } : null;
}

export function hasFeatSpellChoice(ruleset: RulesetId, featName: string | null | undefined): boolean {
  if (ruleset !== "RULES_2024" || !featName) return false;
  return featName === MAGIC_INITIATE || featName === RITUAL_CASTER || featName in TOUCHED_FEAT_SCHOOLS_2024;
}

/** Риса, що вже є в персонажа, але дає ще заклинання, коли росте рівень. */
export function hasFeatSpellGrowth(ruleset: RulesetId, featName: string | null | undefined): boolean {
  return ruleset === "RULES_2024" && featName === RITUAL_CASTER;
}

export function buildFeatSpellFilter(pick: FeatSpellPickRule): SpellChoiceFilter {
  return { levels: listPickSpellLevels(pick), schools: pick.schools, spellList: pick.spellList, ritualOnly: pick.ritualOnly };
}

export function listPickSpellLevels(pick: Pick<FeatSpellPickRule, "spellLevel" | "maxSpellLevel">): number[] {
  const top = Math.max(pick.spellLevel, pick.maxSpellLevel ?? pick.spellLevel);
  return Array.from({ length: top - pick.spellLevel + 1 }, (_, index) => pick.spellLevel + index);
}

export function isFeatSpellCandidate(pick: FeatSpellPickRule, spell: FeatSpellCandidate): boolean {
  return isSpellChoiceCandidate(buildFeatSpellFilter(pick), spell);
}

/** `sourceLabel` — назва не-риси, що дає той самий вибір (Книга тіней); без неї повідомлення кажуть «риси». */
export function findFeatSpellSelectionProblem(
  rule: FeatSpellChoiceRule,
  selectedSpellIds: readonly number[],
  candidates: readonly FeatSpellCandidate[],
  sourceLabel?: string,
): string | null {
  const totalCount = rule.picks.reduce((sum, pick) => sum + pick.count, 0);
  const chosenByPick = rule.picks.map((pick) => findChosenForPick(pick, selectedSpellIds, candidates));
  const unfilledPick = rule.picks.find((pick, index) => chosenByPick[index].length !== pick.count) ?? rule.picks[0];

  if (!hasExactSpellCount(selectedSpellIds, totalCount)) return describeMissingPick(unfilledPick, sourceLabel);

  const fitting = candidates.filter((spell) => rule.picks.some((pick) => isFeatSpellCandidate(pick, spell)));
  if (!areAllSpellsOffered(selectedSpellIds, fitting)) return sourceLabel ? `Обране заклинання не підходить: ${sourceLabel}` : "Обране заклинання не підходить цій рисі";

  const isEveryPickFilled = rule.picks.every((pick, index) => chosenByPick[index].length === pick.count);
  return isEveryPickFilled ? null : describeMissingPick(unfilledPick, sourceLabel);
}

function buildMagicInitiateRule(chosenOptionNamesEng: readonly string[]): FeatSpellChoiceRule | null {
  const listOption = chosenOptionNamesEng.find((name) => name in MAGIC_INITIATE_LIST_OPTIONS_2024);
  if (!listOption) return null;

  const spellList = classTranslations[MAGIC_INITIATE_LIST_OPTIONS_2024[listOption]];
  return {
    picks: [
      { count: 2, spellLevel: 0, schools: null, spellList },
      { count: 1, spellLevel: 1, schools: null, spellList },
    ],
  };
}

function buildRitualCasterRule(context: FeatSpellChoiceContext): FeatSpellChoiceRule | null {
  const count = calculateProficiencyBonus(context.characterLevel) - context.ownedFeatSpellCount;
  return count > 0 ? { picks: [{ count, spellLevel: 1, schools: null, spellList: null, ritualOnly: true }] } : null;
}

function findChosenForPick(pick: FeatSpellPickRule, selectedSpellIds: readonly number[], candidates: readonly FeatSpellCandidate[]): number[] {
  const fitting = new Set(candidates.filter((spell) => isFeatSpellCandidate(pick, spell)).map((spell) => spell.spellId));
  return selectedSpellIds.filter((spellId) => fitting.has(spellId));
}

function describeMissingPick(pick: FeatSpellPickRule, sourceLabel?: string): string {
  const noun = listPickSpellLevels(pick).every((level) => level === 0) ? "замовляння" : "заклинання";
  return sourceLabel ? `Оберіть ${pick.count} ${noun}: ${sourceLabel}` : `Оберіть ${pick.count} ${noun} риси`;
}
