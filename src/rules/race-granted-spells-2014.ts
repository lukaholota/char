/**
 * KR48.3 — що раса чи підраса 2014 дає сама, на рівні ПЕРСОНАЖА: Tiefling — Thaumaturgy з 1-го,
 * Hellish Rebuke з 3-го, Darkness з 5-го. Перелік — `data/2014/race-granted-spells.json`, його виводить
 * `scripts/5etools/build-race-granted-spells-2014.ts`.
 */

import raceGrantedSpells from "../../data/2014/race-granted-spells.json";

export type RaceSpellGrant2014 = { engName: string; characterLevel: number; sourceKey: string };

type RaceGrantEntry = { race: string; subrace: string | null; spells: { engName: string; characterLevel: number }[] };

export function findEarnedRaceSpells2014(input: { race: string; subrace: string | null; characterLevel: number }): RaceSpellGrant2014[] {
  return (raceGrantedSpells.races as RaceGrantEntry[])
    .filter((entry) => entry.race === input.race && (entry.subrace === null || entry.subrace === input.subrace))
    .flatMap((entry) =>
      entry.spells
        .filter((spell) => spell.characterLevel <= input.characterLevel)
        .map((spell) => ({ engName: spell.engName, characterLevel: spell.characterLevel, sourceKey: entry.subrace ?? entry.race })),
    );
}
