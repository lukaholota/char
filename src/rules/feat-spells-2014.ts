import { classTranslations } from "@/lib/refs/translation";

import { buildFeatSpellFilter, findFeatSpellSelectionProblem, type FeatSpellCandidate, type FeatSpellChoiceRule, type FeatSpellPickRule } from "./feat-spell-choices";
import type { SpellChoiceFilter } from "./spell-choice-filter";

export type FeatSpellRule2014 = {
  featName: string;
  label: string;
  namedSpellEngNames: readonly string[];
  picks: readonly FeatSpellPickRule[];
  sharedSpellLists: readonly string[] | null;
};

const CASTER_CLASS_LISTS_2014 = [
  classTranslations.BARD_2014,
  classTranslations.CLERIC_2014,
  classTranslations.DRUID_2014,
  classTranslations.SORCERER_2014,
  classTranslations.WARLOCK_2014,
  classTranslations.WIZARD_2014,
] as const;

const PICK_WITHOUT_FILTER = { schools: null, spellList: null } as const;

const FEAT_SPELL_RULES_2014: readonly FeatSpellRule2014[] = [
  {
    featName: "MAGIC_INITIATE", label: "Посвячений у магію",
    namedSpellEngNames: [],
    picks: [{ count: 2, spellLevel: 0, ...PICK_WITHOUT_FILTER }, { count: 1, spellLevel: 1, ...PICK_WITHOUT_FILTER }],
    sharedSpellLists: CASTER_CLASS_LISTS_2014,
  },
  {
    featName: "RITUAL_CASTER", label: "Ритуальний заклинач",
    namedSpellEngNames: [],
    picks: [{ count: 2, spellLevel: 1, ritualOnly: true, ...PICK_WITHOUT_FILTER }],
    sharedSpellLists: CASTER_CLASS_LISTS_2014,
  },
  {
    featName: "ARTIFICER_INITIATE", label: "Посвячений винахідник",
    namedSpellEngNames: [],
    picks: [{ count: 1, spellLevel: 0, schools: null, spellList: classTranslations.ARTIFICER_2014 }, { count: 1, spellLevel: 1, schools: null, spellList: classTranslations.ARTIFICER_2014 }],
    sharedSpellLists: null,
  },
  {
    featName: "FEY_TOUCHED", label: "Доторк феї",
    namedSpellEngNames: ["Misty Step"],
    picks: [{ count: 1, spellLevel: 1, schools: ["DIVINATION", "ENCHANTMENT"], spellList: null }],
    sharedSpellLists: null,
  },
  {
    featName: "SHADOW_TOUCHED", label: "Доторк тіні",
    namedSpellEngNames: ["Invisibility"],
    picks: [{ count: 1, spellLevel: 1, schools: ["ILLUSION", "NECROMANCY"], spellList: null }],
    sharedSpellLists: null,
  },
  { featName: "TELEKINETIC", label: "Телекінетик", namedSpellEngNames: ["Mage Hand"], picks: [], sharedSpellLists: null },
  { featName: "TELEPATHIC", label: "Телепат", namedSpellEngNames: ["Detect Thoughts"], picks: [], sharedSpellLists: null },
];

export function findFeatSpellRule2014(featName: string | null | undefined): FeatSpellRule2014 | null {
  return FEAT_SPELL_RULES_2014.find((rule) => rule.featName === featName) ?? null;
}

export function listFeatSpellFilters2014(rule: FeatSpellRule2014): SpellChoiceFilter[] {
  return rule.picks.map((pick) => buildFeatSpellFilter(rule.sharedSpellLists ? { ...pick, spellList: rule.sharedSpellLists } : pick));
}

export function listFeatSpellListChoices2014(rule: FeatSpellRule2014): FeatSpellChoiceRule[] {
  if (!rule.sharedSpellLists) return [{ picks: [...rule.picks] }];
  return rule.sharedSpellLists.map((list) => ({ picks: rule.picks.map((pick) => ({ ...pick, spellList: list })) }));
}

export function findCommonSpellLists2014(rule: FeatSpellRule2014, spells: readonly FeatSpellCandidate[]): readonly string[] {
  const lists = rule.sharedSpellLists ?? [];
  return lists.filter((list) => spells.every((spell) => (spell.spellLists ?? []).includes(list)));
}

export function findFeatSpellSelectionProblem2014(rule: FeatSpellRule2014, selectedSpellIds: readonly number[], candidates: readonly FeatSpellCandidate[]): string | null {
  if (!rule.picks.length) return selectedSpellIds.length ? `Обране заклинання не підходить: ${rule.label}` : null;
  const wholeRule: FeatSpellChoiceRule = { picks: rule.picks.map((pick) => ({ ...pick, spellList: rule.sharedSpellLists ?? pick.spellList })) };
  const problem = findFeatSpellSelectionProblem(wholeRule, selectedSpellIds, candidates, rule.label);
  if (problem || !rule.sharedSpellLists) return problem;
  const hasOneList = listFeatSpellListChoices2014(rule).some((choice) => findFeatSpellSelectionProblem(choice, selectedSpellIds, candidates, rule.label) === null);
  return hasOneList ? null : `Усі заклинання мають бути з одного списку класу: ${rule.label}`;
}
