import { describe, expect, it } from "vitest";

import { findAttunementCapacity, findAttunementCapacityForPers } from "./attunement";

describe("стеля налаштування на магічні предмети", () => {
  it("база — три, без Артифайсера в жодному класі", () => {
    expect(findAttunementCapacity([{ className: "FIGHTER_2014", classLevel: 20 }])).toBe(3);
    expect(findAttunementCapacity([])).toBe(3);
  });

  it("Артифайсер 2014 нижче 10 рівня класу лишає базову стелю", () => {
    expect(findAttunementCapacity([{ className: "ARTIFICER_2014", classLevel: 9 }])).toBe(3);
  });

  it("Адепт(10)/Знавець(14)/Майстер(18) магічних предметів піднімають стелю до 4/5/6", () => {
    expect(findAttunementCapacity([{ className: "ARTIFICER_2014", classLevel: 10 }])).toBe(4);
    expect(findAttunementCapacity([{ className: "ARTIFICER_2014", classLevel: 13 }])).toBe(4);
    expect(findAttunementCapacity([{ className: "ARTIFICER_2014", classLevel: 14 }])).toBe(5);
    expect(findAttunementCapacity([{ className: "ARTIFICER_2014", classLevel: 17 }])).toBe(5);
    expect(findAttunementCapacity([{ className: "ARTIFICER_2014", classLevel: 18 }])).toBe(6);
    expect(findAttunementCapacity([{ className: "ARTIFICER_2024", classLevel: 18 }])).toBe(6);
  });

  it("мультиклас: Артифайсер рахується за власним рівнем класу, не головним", () => {
    expect(
      findAttunementCapacity([
        { className: "FIGHTER_2014", classLevel: 5 },
        { className: "ARTIFICER_2014", classLevel: 10 },
      ]),
    ).toBe(4);
  });

  it("findAttunementCapacityForPers виводить рівень головного класу як level мінус сума мультикласів", () => {
    expect(
      findAttunementCapacityForPers({
        level: 15,
        class: { name: "ARTIFICER_2014" },
        multiclasses: [{ classLevel: 5, class: { name: "FIGHTER_2014" } }],
      }),
    ).toBe(4);

    expect(
      findAttunementCapacityForPers({
        level: 20,
        class: { name: "FIGHTER_2014" },
        multiclasses: [],
      }),
    ).toBe(3);
  });
});
