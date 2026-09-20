import { describe, expect, it } from "vitest";
import { parseNotation, rollFallbackDice } from "./dice-fallback";

/// Числовий фолбек кубиків: коли dice-box не піднявся (Sentry -8/-A, D-005), кидок усе одно
/// має дати результат у тих самих межах і з тими самими полями, що й 3D-кидок.

describe("parseNotation", () => {
  it.each([
    ["1d20", { count: 1, sides: 20 }],
    ["3D6", { count: 3, sides: 6 }],
    [" 2d8 ", { count: 2, sides: 8 }],
  ])("reads %s", (notation, expected) => {
    expect(parseNotation(notation)).toEqual(expected);
  });

  it.each(["d20", "0d6", "2d0", "2d6+1", ""])("rejects %s", (notation) => {
    expect(parseNotation(notation)).toBeNull();
  });
});

describe("rollFallbackDice", () => {
  it("rolls one die per notation count with values inside 1..sides", () => {
    const dice = rollFallbackDice(["2d6", "1d20"], 10);
    expect(dice.map((die) => die.sides)).toEqual([6, 6, 20]);
    for (const die of dice) {
      expect(die.value).toBeGreaterThanOrEqual(1);
      expect(die.value).toBeLessThanOrEqual(die.sides);
    }
  });

  it("numbers dice from the given rollId so removal by id stays unambiguous", () => {
    const dice = rollFallbackDice(["3d4"], 7, () => 1);
    expect(dice.map((die) => die.rollId)).toEqual([7, 8, 9]);
  });

  it("uses the injected picker and skips unreadable notations", () => {
    const dice = rollFallbackDice(["1d8", "junk", "1d12"], 0, (sides) => sides);
    expect(dice).toEqual([
      { sides: 8, value: 8, rollId: 0 },
      { sides: 12, value: 12, rollId: 1 },
    ]);
  });

  it("covers the whole range over many rolls", () => {
    const seen = new Set(rollFallbackDice(Array(400).fill("1d4"), 0).map((die) => die.value));
    expect([...seen].sort()).toEqual([1, 2, 3, 4]);
  });
});
