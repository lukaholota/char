import { describe, expect, it } from "vitest";
import { addToPurse, emptyPurse, findCoinKind, splitStartingItems } from "@/rules/starting-money";

describe("KR26.3 — розбір стартового майна на гаманець і речі", () => {
  it("впізнає всі пʼять скорочень монет", () => {
    expect(findCoinKind("зм")).toBe("gp");
    expect(findCoinKind("см")).toBe("sp");
    expect(findCoinKind("мм")).toBe("cp");
    expect(findCoinKind("ем")).toBe("ep");
    expect(findCoinKind("пм")).toBe("pp");
  });

  it("не плутає монету з річчю, чия назва починається так само", () => {
    expect(findCoinKind("зміїна шкіра")).toBeNull();
    expect(findCoinKind("Смолоскип")).toBeNull();
    expect(findCoinKind("")).toBeNull();
  });

  it("кладе «зм x50» у гаманець і не лишає рядка майна", () => {
    const { purse, belongings } = splitStartingItems([{ name: "зм", quantity: 50 }]);

    expect(purse.gp).toBe(50);
    expect(belongings).toEqual([]);
  });

  it("річ лишає річчю", () => {
    const { purse, belongings } = splitStartingItems([{ name: "Набір травника", quantity: 1 }]);

    expect(purse).toEqual(emptyPurse());
    expect(belongings).toEqual([{ name: "Набір травника", quantity: 1 }]);
  });

  it("змішаний список ділить надвоє, зберігаючи порядок речей", () => {
    const { purse, belongings } = splitStartingItems([
      { name: "Спис", quantity: 1 },
      { name: "зм", quantity: 15 },
      { name: "Рюкзак", quantity: 1 },
      { name: "см", quantity: 4 },
    ]);

    expect(purse.gp).toBe(15);
    expect(purse.sp).toBe(4);
    expect(belongings).toEqual([
      { name: "Спис", quantity: 1 },
      { name: "Рюкзак", quantity: 1 },
    ]);
  });

  it("додає монети одного номіналу з різних джерел", () => {
    const origin = splitStartingItems([{ name: "зм", quantity: 50 }]).purse;
    const fromClass = splitStartingItems([{ name: "зм", quantity: 75 }]).purse;

    expect(addToPurse(origin, fromClass).gp).toBe(125);
  });

  /// «зм x0» не гроші — але й губитися воно не сміє, інакше рядок зникає беззвучно.
  it("нульову кількість монетою не вважає й рядка не губить", () => {
    const { purse, belongings } = splitStartingItems([{ name: "зм", quantity: 0 }]);

    expect(purse).toEqual(emptyPurse());
    expect(belongings).toEqual([{ name: "зм", quantity: 0 }]);
  });

  it("дробову кількість обрізає до цілої", () => {
    expect(splitStartingItems([{ name: "зм", quantity: 7.9 }]).purse.gp).toBe(7);
  });
});
