import { describe, expect, it } from "vitest";
import { findUnarmoredMovementBonus } from "./unarmored-movement";

const unarmored = { equippedArmorNames: ["UNARMORED_DEFENSE_MONK"], wearsShield: false };

describe("Рух без обладунків за рівнем Монаха", () => {
  it.each([
    [1, 0],
    [2, 10],
    [5, 10],
    [6, 15],
    [9, 15],
    [10, 20],
    [14, 25],
    [17, 25],
    [18, 30],
    [20, 30],
  ])("Монах %i — +%i футів", (monkLevel, bonus) => {
    expect(findUnarmoredMovementBonus({ monkLevel, ...unarmored })).toBe(bonus);
  });

  it("не монах бонусу не має", () => {
    expect(findUnarmoredMovementBonus({ monkLevel: 0, ...unarmored })).toBe(0);
  });

  it("обладунок або щит вимикають бонус", () => {
    expect(findUnarmoredMovementBonus({ monkLevel: 6, equippedArmorNames: ["LEATHER"], wearsShield: false })).toBe(0);
    expect(findUnarmoredMovementBonus({ monkLevel: 6, equippedArmorNames: [], wearsShield: true })).toBe(0);
  });
});
