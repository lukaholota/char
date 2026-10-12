import { describe, expect, it } from "vitest";
import { findFeatChoicePickCount, findMetamagicAdeptPickProblem } from "./feat-choice-pick-count";

const plainGroup = { isSkill: false, isAbility: false, isManeuver: false };

describe("скільки опцій обирати в групі риси", () => {
  it("Умілець бере число навичок із риси, а без нього — три", () => {
    expect(findFeatChoicePickCount({ name: "SKILLED", grantedSkillCount: 4 }, { ...plainGroup, isSkill: true })).toBe(4);
    expect(findFeatChoicePickCount({ name: "SKILLED", grantedSkillCount: 0 }, { ...plainGroup, isSkill: true })).toBe(3);
  });

  it("Бойовий адепт обирає два маневри", () => {
    expect(findFeatChoicePickCount({ name: "MARTIAL_ADEPT" }, { ...plainGroup, isManeuver: true })).toBe(2);
  });

  it("Дар опору стихіям обирає два типи шкоди й одну характеристику", () => {
    expect(findFeatChoicePickCount({ name: "BOON_OF_ENERGY_RESISTANCE" }, plainGroup)).toBe(2);
    expect(findFeatChoicePickCount({ name: "BOON_OF_ENERGY_RESISTANCE" }, { ...plainGroup, isAbility: true })).toBe(1);
  });

  it("Адепт метамагії обирає дві метамагії", () => {
    expect(findFeatChoicePickCount({ name: "METAMAGIC_ADEPT" }, plainGroup)).toBe(2);
  });

  it("решта груп — одна опція", () => {
    expect(findFeatChoicePickCount({ name: "ELEMENTAL_ADEPT" }, plainGroup)).toBe(1);
    expect(findFeatChoicePickCount(null, { ...plainGroup, isSkill: true })).toBe(1);
  });
});

describe("перевірка вибору Адепта метамагії", () => {
  it("приймає рівно дві різні опції", () => {
    expect(findMetamagicAdeptPickProblem([76, 83])).toBeNull();
  });

  it("відхиляє одну, три й повтор", () => {
    expect(findMetamagicAdeptPickProblem([76])).toBe("Оберіть дві різні метамагії");
    expect(findMetamagicAdeptPickProblem([76, 77, 78])).toBe("Оберіть дві різні метамагії");
    expect(findMetamagicAdeptPickProblem([])).toBe("Оберіть дві різні метамагії");
    expect(findMetamagicAdeptPickProblem([76, 76])).toBe("Оберіть дві різні метамагії");
  });
});
