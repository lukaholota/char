/**
 * Заклинання дунамантії EGW: поділ за позначками таблиці «Dunamancy Spells», як у D&D Beyond.
 * Звичайному чарівникові вони не належать — лише Школі хронургії й Школі гравітургії.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { readDunamancySpellLists } from "../../prisma/seed/subclassSpellLists2014";

const { baseClass, lists } = readDunamancySpellLists();
const catalogNames = new Set((JSON.parse(readFileSync(join(process.cwd(), "data/2014/spells.json"), "utf-8")) as { engName: string }[]).map((row) => row.engName));
const namesOf = (subclass: string) => lists.find((list) => list.subclass === subclass)!.spells.map((spell) => spell.engName);

describe("заклинання дунамантії 2014 — лише двом школам чарівника", () => {
  it("хронургія — 9, гравітургія — 11, спільних — 5, разом — 15", () => {
    const chronurgy = namesOf("SCHOOL_OF_CHRONURGY");
    const graviturgy = namesOf("SCHOOL_OF_GRAVITURGY");

    expect(baseClass).toBe("WIZARD_2014");
    expect(chronurgy).toHaveLength(9);
    expect(graviturgy).toHaveLength(11);
    expect(chronurgy.filter((name) => graviturgy.includes(name)).sort()).toEqual(["Fortune's Favor", "Pulse Wave", "Sapping Sting", "Tether Essence", "Wristpocket"]);
    expect(new Set([...chronurgy, ...graviturgy]).size).toBe(15);
  });

  it("заклинання лише однієї школи не потрапили до іншої", () => {
    for (const name of ["Gift of Alacrity", "Temporal Shunt", "Reality Break", "Time Ravage"]) expect(namesOf("SCHOOL_OF_GRAVITURGY")).not.toContain(name);
    for (const name of ["Magnify Gravity", "Immovable Object", "Gravity Sinkhole", "Gravity Fissure", "Dark Star", "Ravenous Void"]) expect(namesOf("SCHOOL_OF_CHRONURGY")).not.toContain(name);
  });

  it("кожне заклинання є в каталозі 2014", () => {
    const dangling = lists.flatMap((list) => list.spells.filter((spell) => !catalogNames.has(spell.engName)).map((spell) => `${list.subclass}: ${spell.engName}`));
    expect(dangling).toEqual([]);
  });
});
