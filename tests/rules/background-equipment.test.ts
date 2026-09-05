import { describe, expect, it } from "vitest";
import { findBackgroundStartingItems, hasGoldAlternative } from "@/rules/background-equipment";

const SOLDIER_2024 = {
  items: [
    { name: "Спис", quantity: 1 },
    { name: "Набір цілителя", quantity: 1 },
    { name: "зм", quantity: 14 },
  ],
  grantsGoldInstead: 50,
};

const SOLDIER_2014 = {
  items: [{ name: "Знак відзнаки", quantity: 1 }],
  grantsGoldInstead: null,
};

describe("hasGoldAlternative", () => {
  it("походження 2024 має альтернативу в 50 зм", () => {
    expect(hasGoldAlternative(SOLDIER_2024)).toBe(true);
  });

  it("походження 2014 альтернативи не має", () => {
    expect(hasGoldAlternative(SOLDIER_2014)).toBe(false);
  });
});

describe("findBackgroundStartingItems", () => {
  it("без вибору віддає пакунок майна", () => {
    expect(findBackgroundStartingItems(SOLDIER_2024, undefined)).toEqual(SOLDIER_2024.items);
  });

  it("вибір «спорядження» віддає той самий пакунок", () => {
    expect(findBackgroundStartingItems(SOLDIER_2024, "EQUIPMENT")).toEqual(SOLDIER_2024.items);
  });

  it("вибір «золото» заміняє весь пакунок на 50 зм", () => {
    expect(findBackgroundStartingItems(SOLDIER_2024, "GOLD")).toEqual([{ name: "зм", quantity: 50 }]);
  });

  it("вибір «золото» на походженні без альтернативи лишає майно недоторканим", () => {
    expect(findBackgroundStartingItems(SOLDIER_2014, "GOLD")).toEqual(SOLDIER_2014.items);
  });

  it("порожнє й побите майно не ламає розбір", () => {
    const background = { items: [null, { name: "" }, { name: "Спис" }, { name: "Лук", quantity: "2" }], grantsGoldInstead: null };

    expect(findBackgroundStartingItems(background, undefined)).toEqual([{ name: "Лук", quantity: 2 }]);
  });
});
