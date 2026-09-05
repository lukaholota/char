import { describe, expect, it } from "vitest";
import { BASTION_STANDARD_LEVEL, findBastionAccess } from "@/rules/bastions";

describe("доступ до бастіону", () => {
  it("персонажу 2014 бастіон не пропонується на жодному рівні", () => {
    const access = findBastionAccess({ ruleset: "RULES_2014", characterLevel: 20, hasBastion: false });

    expect(access).toEqual({
      isOffered: false,
      isBelowStandardLevel: false,
      isEntryCardShown: false,
    });
  });

  it("персонаж 2024 нижче стандартного рівня отримує попередження, а не заборону", () => {
    const access = findBastionAccess({
      ruleset: "RULES_2024",
      characterLevel: BASTION_STANDARD_LEVEL - 1,
      hasBastion: false,
    });

    expect(access.isOffered).toBe(true);
    expect(access.isBelowStandardLevel).toBe(true);
  });

  it("картка на слайді фіч зʼявляється зі стандартного рівня", () => {
    const below = findBastionAccess({ ruleset: "RULES_2024", characterLevel: 4, hasBastion: false });
    const at = findBastionAccess({ ruleset: "RULES_2024", characterLevel: 5, hasBastion: false });

    expect(below.isEntryCardShown).toBe(false);
    expect(at.isEntryCardShown).toBe(true);
  });

  it("створений бастіон лишає картку видимою й нижче стандартного рівня", () => {
    const access = findBastionAccess({ ruleset: "RULES_2024", characterLevel: 4, hasBastion: true });

    expect(access.isEntryCardShown).toBe(true);
  });

  it("бастіон 2014-персонажа картки не дає навіть якщо рядок у базі є", () => {
    const access = findBastionAccess({ ruleset: "RULES_2014", characterLevel: 12, hasBastion: true });

    expect(access.isEntryCardShown).toBe(false);
  });
});
