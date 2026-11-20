import { describe, expect, it } from "vitest";
import { describePotionDrink } from "@/lib/logic/potion-drink-text";

const roll = { healing: 7, healingRolls: [3, 2], healingDice: { count: 2, sides: 4, bonus: 2 }, tempHp: 0 };

describe("describePotionDrink", () => {
  it("shows the full roll when all of it healed", () => {
    expect(describePotionDrink({ name: "Зілля лікування", roll, healed: 7, stateLabel: null }).description).toBe("+7 ХП (2к4 + 2: 3 + 2 + 2)");
  });

  it("shows only the gained part when HP hit the maximum", () => {
    expect(describePotionDrink({ name: "Зілля лікування", roll, healed: 2, stateLabel: null }).description).toBe("+2 ХП до повних (випало 7: 2к4 + 2: 3 + 2 + 2)");
  });

  it("says HP were already full instead of claiming a gain", () => {
    expect(describePotionDrink({ name: "Зілля лікування", roll, healed: 0, stateLabel: null }).description).toBe("ХП уже були повні — випало 7 (2к4 + 2: 3 + 2 + 2)");
  });
});
