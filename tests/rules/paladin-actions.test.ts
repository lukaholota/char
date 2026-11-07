import { describe, expect, it } from "vitest";
import { countDivineSmiteDice, findLayOnHandsDefault, isDivineSmite2014, isLayOnHands } from "@/rules/paladin-actions";

describe("Божественна кара 2014", () => {
  it("2к8 слотом 1-го рівня, +1к8 за рівень, стеля 5к8", () => {
    expect([1, 2, 3, 4, 5, 9].map((slot) => countDivineSmiteDice(slot, false))).toEqual([2, 3, 4, 5, 5, 5]);
  });

  it("по нежиті чи нечисті ще +1к8, до 6к8", () => {
    expect(countDivineSmiteDice(1, true)).toBe(3);
    expect(countDivineSmiteDice(5, true)).toBe(6);
  });

  it("лише риса 2014: кара 2024 — заклинання, Покращена кара — пасивна", () => {
    expect(isDivineSmite2014("Divine Smite")).toBe(true);
    expect(isDivineSmite2014("Improved Divine Smite")).toBe(false);
    expect(isDivineSmite2014("Paladin: Paladin's Smite (2024)")).toBe(false);
    expect(isDivineSmite2014(null)).toBe(false);
  });
});

describe("Цілющі руки", () => {
  it("впізнає рису обох редакцій", () => {
    expect(isLayOnHands("Lay on Hands")).toBe(true);
    expect(isLayOnHands("Paladin: Lay On Hands (2024)")).toBe(true);
    expect(isLayOnHands("Divine Smite")).toBe(false);
  });

  it("пропонує стільки, скільки бракує хітів, у межах резерву", () => {
    expect(findLayOnHandsDefault(15, 6)).toBe(6);
    expect(findLayOnHandsDefault(4, 20)).toBe(4);
    expect(findLayOnHandsDefault(15, 0)).toBe(1);
    expect(findLayOnHandsDefault(0, 10)).toBe(0);
  });
});
