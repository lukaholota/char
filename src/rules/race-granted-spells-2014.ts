/**
 * KR48.3 — що раса чи підраса 2014 дає сама, на рівні ПЕРСОНАЖА: Tiefling — Thaumaturgy з 1-го,
 * Hellish Rebuke з 3-го, Darkness з 5-го; Напівельф із вибором «Магія дроу» (SCAG) — Dancing Lights, Faerie Fire, Darkness. Перелік — `data/2014/race-granted-spells.json`, його виводить
 * `scripts/5etools/build-race-granted-spells-2014.ts`.
 */

import raceGrantedSpells from "../../data/2014/race-granted-spells.json";

export type RaceSpellGrant2014 = { engName: string; characterLevel: number; sourceKey: string };

type RaceGrantEntry = { race: string; subrace: string | null; raceOptionName?: string; spells: { engName: string; characterLevel: number }[] };

export type EarnedRaceSpellsInput = { race: string; subrace: string | null; characterLevel: number; chosenRaceOptionNames?: readonly string[] };

export function findEarnedRaceSpells2014(input: EarnedRaceSpellsInput): RaceSpellGrant2014[] {
  return (raceGrantedSpells.races as RaceGrantEntry[])
    .filter((entry) => entry.race === input.race && (entry.subrace === null || entry.subrace === input.subrace) && isRaceOptionChosen(entry, input))
    .flatMap((entry) =>
      entry.spells
        .filter((spell) => spell.characterLevel <= input.characterLevel)
        .map((spell) => ({ engName: spell.engName, characterLevel: spell.characterLevel, sourceKey: entry.subrace ?? entry.race })),
    );
}

function isRaceOptionChosen(entry: RaceGrantEntry, input: EarnedRaceSpellsInput): boolean {
  return entry.raceOptionName === undefined || (input.chosenRaceOptionNames ?? []).includes(entry.raceOptionName);
}
