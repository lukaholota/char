import { describe, expect, it } from "vitest";
import { applyMaxHitPointShift, findRetroactiveConstitutionHitPoints } from "@/rules/health";

describe("ретроактивні хіти від Статури (PHB 2014, с. 15)", () => {
  it("піднята Статура додає хіти за всі попередні рівні", () => {
    const shift = findRetroactiveConstitutionHitPoints({
      previousConstitutionModifier: 1,
      nextConstitutionModifier: 2,
      level: 7,
    });
    expect(shift).toBe(7);
  });

  it("зростання характеристики без зміни модифікатора хітів не дає", () => {
    const shift = findRetroactiveConstitutionHitPoints({
      previousConstitutionModifier: 2,
      nextConstitutionModifier: 2,
      level: 7,
    });
    expect(shift).toBe(0);
  });

  it("знижена Статура забирає хіти за всі рівні", () => {
    const shift = findRetroactiveConstitutionHitPoints({
      previousConstitutionModifier: 2,
      nextConstitutionModifier: 0,
      level: 5,
    });
    expect(shift).toBe(-10);
  });

  it("зсув рухає і максимум, і поточні хіти", () => {
    expect(applyMaxHitPointShift({ maxHp: 52, currentHp: 30, shift: 7 })).toEqual({
      maxHp: 59,
      currentHp: 37,
    });
  });

  it("поточні хіти не падають нижче нуля", () => {
    expect(applyMaxHitPointShift({ maxHp: 20, currentHp: 3, shift: -10 })).toEqual({
      maxHp: 10,
      currentHp: 0,
    });
  });

  it("максимум не падає нижче одиниці, а персонаж падає в нуль", () => {
    expect(applyMaxHitPointShift({ maxHp: 4, currentHp: 4, shift: -20 })).toEqual({
      maxHp: 1,
      currentHp: 0,
    });
  });

  it("нульовий зсув підтягує поточні хіти під зменшений максимум", () => {
    expect(applyMaxHitPointShift({ maxHp: 30, currentHp: 45, shift: 0 })).toEqual({
      maxHp: 30,
      currentHp: 30,
    });
  });
});
