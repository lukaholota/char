import { describe, expect, it } from "vitest";
import { formatFormulaDice, parseDiceGroup, parseWeaponDamageFormula, sumAbilityTerms } from "@/rules/weapon-damage-formula";

describe("parseWeaponDamageFormula", () => {
  it("reads a doubled ability and two abilities", () => {
    expect(parseWeaponDamageFormula("1к6+СИЛ*2")).toEqual({ dice: [{ count: 1, sides: 6 }], flat: 0, abilities: [{ ability: "STR", multiplier: 2 }] });
    expect(parseWeaponDamageFormula("1к6 + сил + ста")?.abilities).toEqual([
      { ability: "STR", multiplier: 1 },
      { ability: "CON", multiplier: 1 },
    ]);
    expect(parseWeaponDamageFormula("1d8+2×DEX")?.abilities).toEqual([{ ability: "DEX", multiplier: 2 }]);
  });

  it("keeps several dice groups, numbers and a minus", () => {
    expect(parseWeaponDamageFormula("2к8 + 1к6")).toEqual({ dice: [{ count: 2, sides: 8 }, { count: 1, sides: 6 }], flat: 0, abilities: [] });
    expect(parseWeaponDamageFormula("1k4+3")).toEqual({ dice: [{ count: 1, sides: 4 }], flat: 3, abilities: [] });
    expect(parseWeaponDamageFormula("d6-1-МУД")).toEqual({ dice: [{ count: 1, sides: 6 }], flat: -1, abilities: [{ ability: "WIS", multiplier: -1 }] });
    expect(parseWeaponDamageFormula("ХАР")).toEqual({ dice: [], flat: 0, abilities: [{ ability: "CHA", multiplier: 1 }] });
  });

  it("returns null for text players write as notes", () => {
    for (const text of ["", "0", "1", "1к8(1к10)", "1к6/1к8", "2д6 некротика", "1к8 рублячої", "1к6+СИЛ*2*3", "1к6-1к4", "1к1", "1к6+ЛОВ"]) {
      expect(parseWeaponDamageFormula(text), text).toBeNull();
    }
  });
});

describe("formula helpers", () => {
  it("reads exactly one dice group", () => {
    expect(parseDiceGroup("2к6")).toEqual({ count: 2, sides: 6 });
    expect(parseDiceGroup("к4")).toEqual({ count: 1, sides: 4 });
    for (const text of ["", "1к6+1", "1к6+1к4", "СИЛ", "вогонь"]) expect(parseDiceGroup(text), text).toBeNull();
  });

  it("formats dice and sums ability modifiers", () => {
    expect(formatFormulaDice([{ count: 2, sides: 8 }, { count: 1, sides: 6 }])).toBe("2d8+1d6");
    const modifiers = { STR: 3, CON: 2 } as Record<string, number>;
    expect(sumAbilityTerms([{ ability: "STR", multiplier: 2 }, { ability: "CON", multiplier: 1 }], (ability) => modifiers[ability] ?? 0)).toBe(8);
  });
});
