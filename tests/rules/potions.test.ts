import { describe, expect, it } from "vitest";
import { describeDrinkVerb, describeHealingDice, findPotionHealingDice, findPotionTempHp, isDrinkableMagicItem, rollPotionDrink } from "@/rules/potions";

const lowest = () => 0;
const highest = () => 0.999;

describe("зілля", () => {
  it("пити можна лише зілля", () => {
    expect(isDrinkableMagicItem({ itemType: "POTION" })).toBe(true);
    expect(isDrinkableMagicItem({ itemType: "RING" })).toBe(false);
    expect(isDrinkableMagicItem({})).toBe(false);
  });

  it("олію використовують, а не пʼють", () => {
    expect(describeDrinkVerb({ engName: "Oil of Slipperiness" })).toBe("Використати");
    expect(describeDrinkVerb({ engName: "Potion of Healing" })).toBe("Випити");
  });

  it("зілля лікування кидає свої кубики й додає бонус", () => {
    expect(rollPotionDrink({ engName: "Potion of Healing" }, lowest)).toEqual({
      healing: 4,
      healingRolls: [1, 1],
      healingDice: { count: 2, sides: 4, bonus: 2 },
      tempHp: 0,
    });
    expect(rollPotionDrink({ engName: "Potion of Supreme Healing" }, highest).healing).toBe(60);
    expect(describeHealingDice(findPotionHealingDice({ engName: "Potion of Greater Healing" })!)).toBe("4к4 + 4");
  });

  it("героїзм дає 10 тимчасових ОЗ без лікування; невідоме зілля нічого не рахує", () => {
    expect(findPotionTempHp({ engName: "Potion of Heroism" })).toBe(10);
    expect(rollPotionDrink({ engName: "Potion of Heroism" })).toMatchObject({ healing: 0, healingRolls: [], healingDice: null, tempHp: 10 });
    expect(rollPotionDrink({ engName: "Potion of Poison" })).toEqual({ healing: 0, healingRolls: [], healingDice: null, tempHp: 0 });
    expect(findPotionHealingDice({ engName: null })).toBeNull();
  });
});
