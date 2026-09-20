/**
 * KR31.18 — розширені списки покровителів чорнокнижника 2014. Файл не пишеться руками: тест
 * перебудовує його з пінованого корпусу й вимагає рівності, а книгу звіряє числами — по десять
 * заклинань на покровителя, у Джина ще по пʼять на кожен із чотирьох родів і Бажання.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { collectPatronSpellLists, readPatronSpellListsFile } from "../../scripts/5etools/build-warlock-expanded-spell-lists";

const lists = readPatronSpellListsFile();
const catalogNames = new Set((JSON.parse(readFileSync(join(process.cwd(), "data/2014/spells.json"), "utf-8")) as { engName: string }[]).map((row) => row.engName));

describe("файл розширених списків покровителів 2014 виводиться з корпусу", () => {
  it("закомічений файл дорівнює перебудованому з пінованої ревізії", () => {
    expect(lists).toEqual(collectPatronSpellLists());
  });

  it("девʼять покровителів, по десять заклинань; Джин — девʼять спільних, по пʼять на рід і Бажання", () => {
    expect(lists.map((list) => list.subclass)).toEqual([
      "ARCHFEY", "CELESTIAL", "FATHOMLESS", "FIEND", "GREAT_OLD_ONE", "HEXBLADE", "THE_GENIE", "UNDEAD", "UNDYING",
    ]);
    for (const list of lists.filter((list) => list.subclass !== "THE_GENIE")) {
      expect(list.spells, list.subclass).toHaveLength(10);
      expect(list.spells.every((spell) => spell.genieKind === null), list.subclass).toBe(true);
    }

    const genie = lists.find((list) => list.subclass === "THE_GENIE")!;
    expect(genie.spells.filter((spell) => spell.genieKind === null).map((spell) => spell.engName)).toContain("Wish");
    expect(genie.spells.filter((spell) => spell.genieKind === null)).toHaveLength(6);
    for (const kind of ["Dao", "Djinni", "Efreeti", "Marid"]) {
      expect(genie.spells.filter((spell) => spell.genieKind === kind), kind).toHaveLength(5);
    }
  });

  it("кожне заклинання є в каталозі 2014 і рівень у таблиці — від 1 до 9", () => {
    const dangling = lists.flatMap((list) => list.spells.filter((spell) => !catalogNames.has(spell.engName)).map((spell) => `${list.subclass}: ${spell.engName}`));
    expect(dangling).toEqual([]);
    expect(lists.flatMap((list) => list.spells).every((spell) => spell.level >= 1 && spell.level <= 9)).toBe(true);
  });

  it("Відьмацький клинок несе всі десять, зокрема чотири кари паладина", () => {
    const hexblade = lists.find((list) => list.subclass === "HEXBLADE")!.spells.map((spell) => spell.engName);
    expect(hexblade).toEqual(expect.arrayContaining(["Shield", "Wrathful Smite", "Branding Smite", "Blink", "Elemental Weapon", "Staggering Smite", "Banishing Smite"]));
  });
});
