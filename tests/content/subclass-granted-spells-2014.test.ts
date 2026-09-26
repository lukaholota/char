/**
 * O48 — що підклас 2014 дає сам, звірено з книгою на прикладах, які найлегше зламати: рівні домену й
 * клятви, «відомі» замовляння, щупальця Безодні на 10-му — і відсутність розширених списків покровителів,
 * бо ті гравець обирає сам.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { readSubclassGrantedSpellsFile } from "../../scripts/5etools/build-subclass-granted-spells-2014";
import { subclassTranslations } from "@/lib/refs/translation";

const { subclasses, options, uncovered } = readSubclassGrantedSpellsFile();
const catalogNames = new Set((JSON.parse(readFileSync(join(process.cwd(), "data/2014/spells.json"), "utf-8")) as { engName: string }[]).map((row) => row.engName));

function findSpells(subclass: string) {
  return subclasses.find((entry) => entry.subclass === subclass)?.spells ?? [];
}

function describeLevels(subclass: string) {
  return findSpells(subclass).map((spell) => `${spell.classLevel} ${spell.engName}`);
}

describe("O48 — заклинання, які підклас 2014 дає сам", () => {
  it("Домен життя: по два заклинання на 1, 3, 5, 7 і 9-му рівні клірика, завжди підготовлені", () => {
    expect(describeLevels("LIFE_DOMAIN")).toEqual([
      "1 Bless", "1 Cure Wounds",
      "3 Lesser Restoration", "3 Spiritual Weapon",
      "5 Beacon of Hope", "5 Revivify",
      "7 Death Ward", "7 Guardian of Faith",
      "9 Mass Cure Wounds", "9 Raise Dead",
    ]);
    expect(findSpells("LIFE_DOMAIN").every((spell) => spell.mechanic === "prepared")).toBe(true);
  });

  it("кожна клятва паладина дає десять заклинань на 3, 5, 9, 13 і 17-му рівні", () => {
    const oaths = subclasses.filter((entry) => entry.className === "PALADIN_2014");
    expect(oaths).toHaveLength(9);
    for (const oath of oaths) {
      expect([...new Set(oath.spells.map((spell) => spell.classLevel))], oath.subclass).toEqual([3, 5, 9, 13, 17]);
      expect(oath.spells, oath.subclass).toHaveLength(10);
    }
  });

  it("Абераційний розум знає Mind Sliver і два заклинання на 1-му — відомі, а не підготовлені", () => {
    const first = findSpells("ABERRANT_MIND").filter((spell) => spell.classLevel === 1);
    expect(first.map((spell) => spell.engName)).toEqual(["Mind Sliver", "Arms of Hadar", "Dissonant Whispers"]);
    expect(findSpells("ABERRANT_MIND").every((spell) => spell.mechanic === "known")).toBe(true);
  });

  it("Домен світла: замовляння Light відоме, решта — підготовлені", () => {
    const light = findSpells("LIGHT_DOMAIN");
    expect(light.filter((spell) => spell.mechanic === "known").map((spell) => spell.engName)).toEqual(["Light"]);
    expect(light.filter((spell) => spell.mechanic === "prepared")).toHaveLength(10);
  });

  it("Безодня дає сама лише Щупальця Евара на 10-му; її розширений список гравець обирає сам", () => {
    expect(describeLevels("FATHOMLESS")).toEqual(["10 Evard's Black Tentacles"]);
    expect(findSpells("FATHOMLESS").some((spell) => spell.engName === "Create or Destroy Water")).toBe(false);
  });

  it("покровителі лише з розширеним списком заклинань самі не дають", () => {
    for (const patron of ["ARCHFEY", "FIEND", "GREAT_OLD_ONE", "HEXBLADE", "THE_GENIE", "UNDEAD"]) {
      expect(findSpells(patron), patron).toEqual([]);
    }
  });

  it("вибір гравця не видається навмання: Коло землі, Божественна душа, Колегія знань лишаються непокритими", () => {
    const skipped = uncovered.map((entry) => entry.subclass);
    expect(skipped).toEqual(expect.arrayContaining(["CIRCLE_OF_THE_LAND", "DIVINE_SOUL", "COLLEGE_OF_LORE", "ARCANE_ARCHER"]));
    expect(findSpells("CIRCLE_OF_THE_LAND")).toEqual([]);
    expect(findSpells("DIVINE_SOUL")).toEqual([]);
  });

  it("Місячне чародійство вивчає всю таблицю — по заклинанню кожної фази на 1, 3, 5, 7 і 9-му рівні", () => {
    const lunar = findSpells("LUNAR_SORCERY");
    expect(lunar).toHaveLength(15);
    expect(lunar.filter((spell) => spell.classLevel === 1).map((spell) => spell.engName)).toEqual(["Shield", "Ray of Sickness", "Color Spray"]);
    expect(lunar.every((spell) => spell.mechanic === "known")).toBe(true);
  });

  it("Коло землі: кожен із восьми біомів дає по два заклинання на 3, 5, 7 і 9-му рівні друїда", () => {
    expect(options.map((option) => option.optionNameEng)).toHaveLength(8);
    for (const option of options) {
      expect(option.spells.map((spell) => spell.classLevel), option.optionNameEng).toEqual([3, 3, 5, 5, 7, 7, 9, 9]);
    }
    const arctic = options.find((option) => option.optionNameEng === "Circle Spells — Arctic")!;
    expect(arctic.spells.map((spell) => spell.engName)).toEqual([
      "Hold Person", "Spike Growth", "Sleet Storm", "Slow", "Freedom of Movement", "Ice Storm", "Commune with Nature", "Cone of Cold",
    ]);
  });

  it("кожне заклинання є в каталозі 2014, кожен підклас має назву, рівень класу — від 1 до 20", () => {
    const dangling = subclasses.flatMap((entry) => entry.spells.filter((spell) => !catalogNames.has(spell.engName)).map((spell) => `${entry.subclass}: ${spell.engName}`));
    expect(dangling).toEqual([]);
    expect(subclasses.filter((entry) => !(entry.subclass in subclassTranslations)).map((entry) => entry.subclass)).toEqual([]);
    expect(subclasses.flatMap((entry) => entry.spells).every((spell) => spell.classLevel >= 1 && spell.classLevel <= 20)).toBe(true);
  });
});
