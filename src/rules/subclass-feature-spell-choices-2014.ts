/**
 * O48 — риси підкласів 2014, що на своєму рівні класу дають гравцеві обрати заклинання, а не видають
 * його поіменно. Вибір той самий, що в риси ([Р42](../../docs/DECISIONS.md#р42)): порції з фільтром,
 * кандидати з таблиці `spell`, суддя — `findFeatSpellSelectionProblem`.
 *
 * Acolyte of Nature: «one druid cantrip of your choice … doesn't count against the number of cleric
 * cantrips you know». Reaper: «one necromancy cantrip of your choice from any spell list». Arcane
 * Initiate: «two cantrips of your choice from the wizard spell list». Arcane Mastery: «four spells from
 * the wizard spell list, one from each of the following levels: 6th, 7th, 8th, and 9th … always
 * prepared». Bonus Cantrip (Circle of the Land): «one additional druid cantrip of your choice».
 * Additional Magical Secrets: «two spells of your choice from any class … of a level you can cast …
 * or a cantrip … don't count against the number of bard spells you know». Divine Magic: спорідненість
 * дає одне з пʼяти заклинань — опції спорідненості в базі немає, тож гравець обирає саме заклинання.
 * Arcane Archer Lore: «either the prestidigitation or the druidcraft cantrip».
 */

import { classTranslations } from "@/lib/refs/translation";

import type { FeatSpellPickRule } from "./feat-spell-choices";
import { findSpellKnowledge2014 } from "./spell-knowledge-2014";

export type SubclassFeatureSpellChoice2014 = {
  subclassName: string;
  classLevel: number;
  sourceName: string;
  label: string;
  picks: FeatSpellPickRule[];
};

const LORE_SECRETS_LEVEL = 6;

const DIVINE_SOUL_AFFINITY_LIST = {
  name: "Спорідненість",
  spellEngNames: ["Cure Wounds", "Inflict Wounds", "Bless", "Bane", "Protection From Evil and Good"],
};

const ARCANE_ARCHER_LORE_LIST = { name: "Знання містичного лучника", spellEngNames: ["Prestidigitation", "Druidcraft"] };

const SUBCLASS_FEATURE_SPELL_CHOICES_2014: readonly SubclassFeatureSpellChoice2014[] = [
  {
    subclassName: "NATURE_DOMAIN",
    classLevel: 1,
    sourceName: "Nature Domain: Acolyte of Nature (2014)",
    label: "Послідовник природи",
    picks: [{ count: 1, spellLevel: 0, schools: null, spellList: classTranslations.DRUID_2014 }],
  },
  {
    subclassName: "DEATH_DOMAIN",
    classLevel: 1,
    sourceName: "Death Domain: Reaper (2014)",
    label: "Жнець",
    picks: [{ count: 1, spellLevel: 0, schools: ["NECROMANCY"], spellList: null }],
  },
  {
    subclassName: "ARCANA_DOMAIN",
    classLevel: 1,
    sourceName: "Arcana Domain: Arcane Initiate (2014)",
    label: "Арканний адепт",
    picks: [{ count: 2, spellLevel: 0, schools: null, spellList: classTranslations.WIZARD_2014 }],
  },
  {
    subclassName: "ARCANA_DOMAIN",
    classLevel: 17,
    sourceName: "Arcana Domain: Arcane Mastery (2014)",
    label: "Арканне оволодіння",
    picks: [6, 7, 8, 9].map((spellLevel) => ({ count: 1, spellLevel, schools: null, spellList: classTranslations.WIZARD_2014 })),
  },
  {
    subclassName: "CIRCLE_OF_THE_LAND",
    classLevel: 2,
    sourceName: "Circle of the Land: Bonus Cantrip (2014)",
    label: "Додаткове замовляння",
    picks: [{ count: 1, spellLevel: 0, schools: null, spellList: classTranslations.DRUID_2014 }],
  },
  {
    subclassName: "COLLEGE_OF_LORE",
    classLevel: LORE_SECRETS_LEVEL,
    sourceName: "College of Lore: Additional Magical Secrets (2014)",
    label: "Додаткові магічні таємниці",
    picks: [
      {
        count: 2,
        spellLevel: 0,
        maxSpellLevel: findSpellKnowledge2014("BARD_2014", LORE_SECRETS_LEVEL)?.maxSpellLevel ?? 0,
        schools: null,
        spellList: null,
      },
    ],
  },
  {
    subclassName: "DIVINE_SOUL",
    classLevel: 1,
    sourceName: "Divine Soul: Divine Magic (2014)",
    label: "Божественна магія",
    picks: [{ count: 1, spellLevel: 1, schools: null, spellList: [DIVINE_SOUL_AFFINITY_LIST.name], extraList: DIVINE_SOUL_AFFINITY_LIST }],
  },
  {
    subclassName: "ARCANE_ARCHER",
    classLevel: 3,
    sourceName: "Arcane Archer: Arcane Archer Lore (2014)",
    label: "Знання містичного лучника",
    picks: [{ count: 1, spellLevel: 0, schools: null, spellList: [ARCANE_ARCHER_LORE_LIST.name], extraList: ARCANE_ARCHER_LORE_LIST }],
  },
];

export function findSubclassFeatureSpellChoice2014(subclassName: string, classLevel: number): SubclassFeatureSpellChoice2014 | null {
  return SUBCLASS_FEATURE_SPELL_CHOICES_2014.find((choice) => choice.subclassName === subclassName && choice.classLevel === classLevel) ?? null;
}

/** Риси, чий рівень класу персонаж уже пройшов або досяг, — для наздоганяння тих, хто вибору не робив. */
export function listReachedSubclassFeatureSpellChoices2014(subclassName: string, classLevel: number): SubclassFeatureSpellChoice2014[] {
  return SUBCLASS_FEATURE_SPELL_CHOICES_2014.filter((choice) => choice.subclassName === subclassName && choice.classLevel <= classLevel);
}

export function findSubclassFeatureSpellLabel2014(sourceName: string): string | null {
  return SUBCLASS_FEATURE_SPELL_CHOICES_2014.find((choice) => choice.sourceName === sourceName)?.label ?? null;
}
