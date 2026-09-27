/**
 * O48 — раса 2014, що дає гравцеві обрати замовляння, а не називає його: High Elf Cantrip («one cantrip
 * of your choice from the wizard spell list»), спадок кобольда Draconic Sorcery MPMM («one cantrip of your
 * choice from the sorcerer spell list») і Astral Fire астрального ельфа («one of the following cantrips of
 * your choice: dancing lights, light, or sacred flame»). Вибір — за фільтром ([Р42](../../docs/DECISIONS.md#р42)),
 * рядок — виду, як у виданих поіменно (`race-granted-spells-2014.ts`).
 */

import { classTranslations } from "@/lib/refs/translation";

import type { FeatSpellChoiceRule, FeatSpellPickRule } from "./feat-spell-choices";

export type RaceSpellChoice2014 = { sourceKey: string; label: string; rule: FeatSpellChoiceRule };

export type RaceAtCreation2014 = { race: string; subrace: string | null; chosenRaceOptionNames: readonly string[] };

type RaceSpellChoiceEntry = { race: string; subrace: string | null; raceOptionName: string | null; label: string; pick: FeatSpellPickRule };

const ASTRAL_FIRE_LIST = { name: "Астральний Вогонь", spellEngNames: ["Dancing Lights", "Light", "Sacred Flame"] };

const RACE_SPELL_CHOICES_2014: readonly RaceSpellChoiceEntry[] = [
  {
    race: "ELF_2014",
    subrace: "ELF_HIGH_2014",
    raceOptionName: null,
    label: "Замовляння вищого ельфа",
    pick: { count: 1, spellLevel: 0, schools: null, spellList: classTranslations.WIZARD_2014 },
  },
  {
    race: "KOBOLD_MPMM",
    subrace: null,
    raceOptionName: "Драконяче чаклунство",
    label: "Драконяче чаклунство",
    pick: { count: 1, spellLevel: 0, schools: null, spellList: classTranslations.SORCERER_2014 },
  },
  {
    race: "ASTRAL_ELF_SPELLJAMMER",
    subrace: null,
    raceOptionName: null,
    label: "Астральний Вогонь",
    pick: { count: 1, spellLevel: 0, schools: null, spellList: [ASTRAL_FIRE_LIST.name], extraList: ASTRAL_FIRE_LIST },
  },
];

export function findRaceSpellChoice2014(input: RaceAtCreation2014): RaceSpellChoice2014 | null {
  const entry = RACE_SPELL_CHOICES_2014.find(
    (candidate) =>
      candidate.race === input.race &&
      (candidate.subrace === null || candidate.subrace === input.subrace) &&
      (candidate.raceOptionName === null || input.chosenRaceOptionNames.includes(candidate.raceOptionName)),
  );
  return entry ? { sourceKey: entry.subrace ?? entry.race, label: entry.label, rule: { picks: [entry.pick] } } : null;
}
