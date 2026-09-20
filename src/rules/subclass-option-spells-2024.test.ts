import { describe, expect, it } from "vitest";
import { findEarnedAlwaysPreparedSpells } from "./always-prepared-spells";
import { buildSubclassOptionSpellSources, findSubclassOptionSpellClassLevel } from "./subclass-option-spells-2024";

const LAND = { className: "DRUID_2024", subclassName: "CIRCLE_OF_THE_LAND", pickLevel: 3 };

describe("findSubclassOptionSpellClassLevel", () => {
  it.each([
    [0, 3],
    [1, 3],
    [2, 3],
    [3, 5],
    [4, 7],
    [5, 9],
  ])("заклинання %i-го рівня друїд Кола землі має з %i-го рівня класу", (spellLevel, classLevel) => {
    expect(findSubclassOptionSpellClassLevel({ ...LAND, spellLevel })).toBe(classLevel);
  });

  it("рівень вибору — нижня межа: замовляння й заклинання 1-го рівня не приходять раніше за 3-й", () => {
    expect(findSubclassOptionSpellClassLevel({ ...LAND, pickLevel: 3, spellLevel: 1 })).toBe(3);
  });

  it("клас без таблиці підготовки не дає рівня", () => {
    expect(findSubclassOptionSpellClassLevel({ className: "FIGHTER_2024", subclassName: "CHAMPION", pickLevel: 3, spellLevel: 1 })).toBeNull();
  });
});

describe("buildSubclassOptionSpellSources", () => {
  const polar = {
    optionNameEng: "Circle of the Land: Polar (2024)",
    optionName: "Полярна земля",
    ...LAND,
    classLevel: 5,
    ability: "WIS" as const,
    spells: [
      { spellId: 1, spellLevel: 1 },
      { spellId: 2, spellLevel: 2 },
      { spellId: 3, spellLevel: 0 },
      { spellId: 4, spellLevel: 3 },
      { spellId: 5, spellLevel: 4 },
      { spellId: 6, spellLevel: 5 },
    ],
  };

  it("на 5-му рівні друїда Полярна земля дає рядки 3-го й 5-го рівня, а 7-го й 9-го — ні", () => {
    const earned = findEarnedAlwaysPreparedSpells(buildSubclassOptionSpellSources([polar]), []);
    expect(earned.map((spell) => spell.spellId).sort()).toEqual([1, 2, 3, 4]);
    expect(earned[0]).toMatchObject({ sourceKey: "Circle of the Land: Polar (2024)", sourceName: "Полярна земля", ability: "WIS" });
  });

  it("на 3-му — лише рядок 3-го рівня", () => {
    const earned = findEarnedAlwaysPreparedSpells(buildSubclassOptionSpellSources([{ ...polar, classLevel: 3 }]), []);
    expect(earned.map((spell) => spell.spellId).sort()).toEqual([1, 2, 3]);
  });

  it("опція без заклинань не стає джерелом", () => {
    expect(buildSubclassOptionSpellSources([{ ...polar, spells: [] }])).toEqual([]);
  });
});
