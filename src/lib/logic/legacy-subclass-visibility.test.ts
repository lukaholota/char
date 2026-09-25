import { describe, expect, it } from "vitest";

import { hasLegacySubclasses, isLegacyChosen, splitSubclassesForStep } from "./legacy-subclass-visibility";

const NAMES: Record<string, string> = {
  FIEND_PATRON: "Покровитель-Виродок",
  ARCHFEY_PATRON: "Покровитель-Архіфея",
  THE_GENIE: "Джин",
  HEXBLADE: "Відьмацький клинок",
};
const sortName = (subclass: { name: string }) => NAMES[subclass.name] ?? subclass.name;

const warlock2024 = [
  { subclassId: 1, name: "FIEND_PATRON", legacySource: null },
  { subclassId: 2, name: "THE_GENIE", legacySource: "TCOE" },
  { subclassId: 3, name: "ARCHFEY_PATRON", legacySource: null },
  { subclassId: 4, name: "HEXBLADE", legacySource: "XGTE" },
];

const warlock2014 = [
  { subclassId: 11, name: "THE_GENIE", legacySource: null },
  { subclassId: 12, name: "HEXBLADE" },
];

describe("O43 — видимість легасі-підкласів у кроці підкласу", () => {
  it("у контенті 2014 легасі немає — перемикача немає, блок порожній навіть увімкнений", () => {
    expect(hasLegacySubclasses(warlock2014)).toBe(false);
    expect(splitSubclassesForStep(warlock2014, true, sortName).legacy).toEqual([]);
    expect(splitSubclassesForStep(warlock2014, true, sortName).current).toHaveLength(2);
  });

  it("вимкнений перемикач ховає легасі, увімкнений — показує окремим блоком", () => {
    expect(hasLegacySubclasses(warlock2024)).toBe(true);

    const hidden = splitSubclassesForStep(warlock2024, false, sortName);
    expect(hidden.current.map((subclass) => subclass.name)).toEqual(["ARCHFEY_PATRON", "FIEND_PATRON"]);
    expect(hidden.legacy).toEqual([]);

    const shown = splitSubclassesForStep(warlock2024, true, sortName);
    expect(shown.current.map((subclass) => subclass.name)).toEqual(["ARCHFEY_PATRON", "FIEND_PATRON"]);
    expect(shown.legacy.map((subclass) => subclass.name)).toEqual(["HEXBLADE", "THE_GENIE"]);
  });

  it("обраний легасі-підклас упізнається, звичайний — ні", () => {
    expect(isLegacyChosen(warlock2024, 2)).toBe(true);
    expect(isLegacyChosen(warlock2024, 1)).toBe(false);
    expect(isLegacyChosen(warlock2024, null)).toBe(false);
    expect(isLegacyChosen(warlock2014, 11)).toBe(false);
  });
});
