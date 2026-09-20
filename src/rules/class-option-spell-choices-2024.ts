/**
 * Заклинання, які дає обрати не риса, а клас: опція класу або риса підкласу на певному рівні.
 * Pact of the Tome 2024: «choose three cantrips and two level 1 spells that have the Ritual tag.
 * The spells can be from any class's spell list». Magical Discoveries (Колегія знань, 6-й рівень
 * барда): «two spells … from the Cleric, Druid, or Wizard spell list … a cantrip or a spell for
 * which you have spell slots». Вибір той самий, що в риси, тож правило — `FeatSpellChoiceRule`,
 * і перевіряє його той самий суддя.
 */

import { classTranslations } from "@/lib/refs/translation";

import type { FeatSpellChoiceRule } from "./feat-spell-choices";
import { findSpellCounts2024 } from "./spell-preparation-2024";
import type { RulesetId } from "./strategies/types";

export type ClassOptionSpellChoice = {
  /** Ключ джерела в базі — `optionNameEng` опції або `engName` риси; лягає в `pers_spell.sourceName`. */
  sourceName: string;
  label: string;
  rule: FeatSpellChoiceRule;
};

type SubclassFeatureSpellChoice = {
  subclassName: string;
  classLevel: number;
  sourceName: string;
  label: string;
  buildRule: (classLevel: number) => FeatSpellChoiceRule;
};

const PACT_OF_THE_TOME: ClassOptionSpellChoice = {
  sourceName: "Pact of the Tome (2024)",
  label: "Книга тіней",
  rule: {
    picks: [
      { count: 3, spellLevel: 0, schools: null, spellList: null },
      { count: 2, spellLevel: 1, schools: null, spellList: null, ritualOnly: true },
    ],
  },
};

const MAGICAL_DISCOVERIES_LISTS = [classTranslations.CLERIC_2024, classTranslations.DRUID_2024, classTranslations.WIZARD_2024];

const MAGICAL_DISCOVERIES: SubclassFeatureSpellChoice = {
  subclassName: "COLLEGE_OF_LORE",
  classLevel: 6,
  sourceName: "College of Lore: Magical Discoveries (2024)",
  label: "Магічні відкриття",
  buildRule: (classLevel) => ({
    picks: [
      {
        count: 2,
        spellLevel: 0,
        maxSpellLevel: findSpellCounts2024("BARD_2024", classLevel, "COLLEGE_OF_LORE")?.maxSpellLevel ?? 0,
        schools: null,
        spellList: MAGICAL_DISCOVERIES_LISTS,
      },
    ],
  }),
};

const CLASS_OPTION_SPELL_CHOICES = [PACT_OF_THE_TOME];

const SUBCLASS_FEATURE_SPELL_CHOICES = [MAGICAL_DISCOVERIES];

export function findClassOptionSpellChoice(chosenOptionNamesEng: readonly string[]): ClassOptionSpellChoice | null {
  return CLASS_OPTION_SPELL_CHOICES.find((choice) => chosenOptionNamesEng.includes(choice.sourceName)) ?? null;
}

/** Риса підкласу, яка саме на цьому рівні класу дає обрати заклинання. */
export function findSubclassFeatureSpellChoice(input: { ruleset: RulesetId; subclassName: string; classLevel: number }): ClassOptionSpellChoice | null {
  if (input.ruleset !== "RULES_2024") return null;

  const feature = SUBCLASS_FEATURE_SPELL_CHOICES.find((choice) => choice.subclassName === input.subclassName && choice.classLevel === input.classLevel);
  return feature ? { sourceName: feature.sourceName, label: feature.label, rule: feature.buildRule(input.classLevel) } : null;
}

export function findClassOptionSpellLabel(sourceName: string): string | null {
  const choice = [...CLASS_OPTION_SPELL_CHOICES, ...SUBCLASS_FEATURE_SPELL_CHOICES].find((candidate) => candidate.sourceName === sourceName);
  return choice?.label ?? null;
}
