import { describe, expect, it } from "vitest";
import { isWithinCharacterSpellLevel } from "@/lib/logic/character-spell-level-filter";

const spellOfLevel = (level: number, className = "Паладин") => ({ level, spellClasses: [{ className }] });

describe("фільтр каталогу заклинань за рівнем персонажа з листа", () => {
  it("2014: паладин 5 бачить заклинання до 2 кола, а 3 коло — ні", () => {
    const limits = { maxSpellLevel: 2, maxSpellLevelByClass: null };
    expect([0, 1, 2, 3, 5].map((level) => isWithinCharacterSpellLevel(spellOfLevel(level), limits))).toEqual([true, true, true, false, false]);
  });

  it("без обмежень показує все", () => {
    expect(isWithinCharacterSpellLevel(spellOfLevel(9), { maxSpellLevel: null, maxSpellLevelByClass: null })).toBe(true);
  });

  it("2024: межа по класу звужує загальну", () => {
    const limits = { maxSpellLevel: 3, maxSpellLevelByClass: new Map([["Чарівник", 3], ["Паладин", 1]]) };
    expect(isWithinCharacterSpellLevel(spellOfLevel(2, "Паладин"), limits)).toBe(false);
    expect(isWithinCharacterSpellLevel(spellOfLevel(2, "Чарівник"), limits)).toBe(true);
  });
});
