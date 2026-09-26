/**
 * O48, KR48.3 — що раса 2014 дає сама, звірено з книгою там, де помилка найдорожча: тифлінг (843 персонажі
 * на проді), дроу, дуергар SCAG. Вибір гравця (Високий ельф, Кобольд, Астральний ельф) не видається.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { readRaceGrantedSpellsFile } from "../../scripts/5etools/build-race-granted-spells-2014";
import { findEarnedRaceSpells2014 } from "@/rules/race-granted-spells-2014";
import { raceTranslations, subraceTranslations } from "@/lib/refs/translation";

const { races, uncovered } = readRaceGrantedSpellsFile();
const catalogNames = new Set((JSON.parse(readFileSync(join(process.cwd(), "data/2014/spells.json"), "utf-8")) as { engName: string }[]).map((row) => row.engName));

const earned = (race: string, subrace: string | null, characterLevel: number) =>
  findEarnedRaceSpells2014({ race, subrace, characterLevel }).map((spell) => spell.engName);

describe("O48 — заклинання, які раса 2014 дає сама", () => {
  it("тифлінг: Thaumaturgy з 1-го, Hellish Rebuke з 3-го, Darkness з 5-го рівня персонажа", () => {
    expect(earned("TIEFLING_2014", null, 2)).toEqual(["Thaumaturgy"]);
    expect(earned("TIEFLING_2014", null, 3)).toEqual(["Thaumaturgy", "Hellish Rebuke"]);
    expect(earned("TIEFLING_2014", null, 4)).toEqual(["Thaumaturgy", "Hellish Rebuke"]);
    expect(earned("TIEFLING_2014", null, 5)).toEqual(["Thaumaturgy", "Hellish Rebuke", "Darkness"]);
  });

  it("підраса дає своє лише собі: дроу — три заклинання, лісовий ельф — нічого", () => {
    expect(earned("ELF_2014", "ELF_DARK_DROW_2014", 5)).toEqual(["Dancing Lights", "Faerie Fire", "Darkness"]);
    expect(earned("ELF_2014", "ELF_WOOD_2014", 20)).toEqual([]);
  });

  it("дуергар SCAG: Enlarge/Reduce з 3-го й Invisibility з 5-го", () => {
    expect(earned("DWARF_2014", "DWARF_DUERGAR_GRAY_SCAG", 5)).toEqual(["Enlarge/Reduce", "Invisibility"]);
  });

  it("вибір гравця не видається: Високий ельф, Кобольд, Астральний ельф — непокриті", () => {
    expect(uncovered.map((entry) => entry.subrace ?? entry.race).sort()).toEqual(["ASTRAL_ELF_SPELLJAMMER", "ELF_HIGH_2014", "KOBOLD_MPMM"]);
    expect(earned("ELF_2014", "ELF_HIGH_2014", 20)).toEqual([]);
  });

  it("кожне заклинання є в каталозі 2014, кожна раса й підраса має назву", () => {
    const dangling = races.flatMap((entry) => entry.spells.filter((spell) => !catalogNames.has(spell.engName)).map((spell) => `${entry.race}: ${spell.engName}`));
    expect(dangling).toEqual([]);
    expect(races.filter((entry) => !(entry.race in raceTranslations)).map((entry) => entry.race)).toEqual([]);
    expect(races.filter((entry) => entry.subrace && !(entry.subrace in subraceTranslations)).map((entry) => entry.subrace)).toEqual([]);
  });
});
