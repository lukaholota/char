import { describe, expect, it } from "vitest";
import { countD20Dice, parseDiceNotation, pickD20Value } from "./dice-roll";

describe("кидок к20 з перевагою чи перешкодою", () => {
  it("звичайний кидок — один кубик, перевага й перешкода — два", () => {
    expect(countD20Dice("NORMAL")).toBe(1);
    expect(countD20Dice("ADVANTAGE")).toBe(2);
    expect(countD20Dice("DISADVANTAGE")).toBe(2);
  });

  it("перевага бере більше, перешкода — менше", () => {
    expect(pickD20Value([4, 17], "ADVANTAGE")).toBe(17);
    expect(pickD20Value([4, 17], "DISADVANTAGE")).toBe(4);
    expect(pickD20Value([12], "NORMAL")).toBe(12);
  });
});

describe("запис кубиків шкоди", () => {
  it("читає і латиницю, і кирилицю", () => {
    expect(parseDiceNotation("2d6")).toEqual({ count: 2, sides: 6 });
    expect(parseDiceNotation("1к8")).toEqual({ count: 1, sides: 8 });
    expect(parseDiceNotation("к12")).toEqual({ count: 1, sides: 12 });
  });

  it("незрозумілий запис — к4", () => {
    expect(parseDiceNotation("—")).toEqual({ count: 1, sides: 4 });
  });
});
