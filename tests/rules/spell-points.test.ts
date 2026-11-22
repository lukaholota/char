import { describe, expect, it } from "vitest";
import { findCastingSpellPoints, findCurrentSpellPoints, findMaxSpellPoints, findSpellPointCost, listSpellPointLevels } from "@/rules/spell-points";

describe("spell points", () => {
  it("converts class slots into the DMG point pool", () => {
    expect(findMaxSpellPoints([4, 3, 3, 3, 3, 2, 2, 1, 1])).toBe(133);
    expect(findMaxSpellPoints([2, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(4);
    expect(findMaxSpellPoints([])).toBe(0);
  });

  it("prices levels and clamps the remaining pool", () => {
    expect(findSpellPointCost(1)).toBe(2);
    expect(findSpellPointCost(9)).toBe(13);
    expect(findSpellPointCost(10)).toBe(0);
    expect(findCurrentSpellPoints([4, 2], 5)).toBe(9);
    expect(findCurrentSpellPoints([4, 2], 99)).toBe(0);
    expect(findCurrentSpellPoints([4, 2], -3)).toBe(14);
  });

  it("lets a caster spend points up to the highest slot level they have", () => {
    expect(listSpellPointLevels([4, 3, 2, 0, 0, 0, 0, 0, 0])).toEqual([1, 2, 3]);
    expect(listSpellPointLevels([0, 0, 0, 0, 0, 0, 0, 0, 0])).toEqual([]);
  });

  it("gives casting points only when the hero uses points and has slots to convert", () => {
    expect(findCastingSpellPoints("POINTS", [4, 2], 3)).toBe(11);
    expect(findCastingSpellPoints("POINTS", [4, 2], undefined)).toBe(14);
    expect(findCastingSpellPoints("SLOTS", [4, 2], 3)).toBeNull();
    expect(findCastingSpellPoints("POINTS", [0, 0], 0)).toBeNull();
  });
});
