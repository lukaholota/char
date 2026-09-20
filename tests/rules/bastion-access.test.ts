import { describe, expect, it } from "vitest";
import { BASTION_STANDARD_LEVEL, findBastionAccess } from "@/rules/bastions";

describe("доступ до бастіону", () => {
  it("персонажу 2014 бастіон не пропонується на жодному рівні", () => {
    const access = findBastionAccess({ ruleset: "RULES_2014", characterLevel: 20, hasBastion: false });

    expect(access).toEqual({
      isOffered: false,
      isBelowStandardLevel: false,
      isEntryCardShown: false,
      isEntryCardMuted: false,
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

  /// KR31.15 (L14-bastions-09): до 5-го рівня картка є, але приглушена — вхід, який дозволяє Р26.
  it("нижче стандартного рівня картка приглушена, а не прихована", () => {
    const below = findBastionAccess({ ruleset: "RULES_2024", characterLevel: 1, hasBastion: false });
    const at = findBastionAccess({ ruleset: "RULES_2024", characterLevel: 5, hasBastion: false });

    expect(below).toMatchObject({ isEntryCardShown: true, isEntryCardMuted: true });
    expect(at).toMatchObject({ isEntryCardShown: true, isEntryCardMuted: false });
  });

  it("створений бастіон нижче стандартного рівня — звичайна картка", () => {
    const access = findBastionAccess({ ruleset: "RULES_2024", characterLevel: 4, hasBastion: true });

    expect(access).toMatchObject({ isEntryCardShown: true, isEntryCardMuted: false });
  });

  it("бастіон 2014-персонажа картки не дає навіть якщо рядок у базі є", () => {
    const access = findBastionAccess({ ruleset: "RULES_2014", characterLevel: 12, hasBastion: true });

    expect(access.isEntryCardShown).toBe(false);
  });
});
