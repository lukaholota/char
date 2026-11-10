import { describe, expect, it } from "vitest";

import { calculateCustomRollBonus, parseCustomRollFormulas, type CustomRollStats } from "@/rules/custom-roll-formula";

const stats: CustomRollStats = {
  abilityModifiers: { STR: 3, DEX: -1, CON: 2, INT: 0, WIS: 4, CHA: 1 },
  proficiencyBonus: 3,
  level: 7,
};

function parseOne(text: string) {
  const { formulas, error } = parseCustomRollFormulas(text);
  expect(error).toBeNull();
  expect(formulas).toHaveLength(1);
  return formulas[0];
}

describe("формули власних здібностей", () => {
  it("порожнє поле — це просто здібність без кидка", () => {
    expect(parseCustomRollFormulas("  ")).toEqual({ formulas: [], error: null });
  });

  it("рахує кубик, характеристику, майстерність, рівень і число", () => {
    const formula = parseOne("2к6 + СИЛ + БМ - 1 + рівень");

    expect(formula).toMatchObject({ count: 2, sides: 6, label: "2к6+СИЛ+БМ-1+рівень" });
    expect(calculateCustomRollBonus(formula, stats)).toBe(3 + 3 - 1 + 7);
  });

  it("від'ємний модифікатор характеристики зменшує бонус, а мінус перед нею обертає знак", () => {
    expect(calculateCustomRollBonus(parseOne("1к20+СПР"), stats)).toBe(-1);
    expect(calculateCustomRollBonus(parseOne("1к20-СПР"), stats)).toBe(1);
  });

  it.each([
    ["1d8+str", "1к8+СИЛ"],
    ["1k8+str", "1к8+СИЛ"],
    ["1д8+STR", "1к8+СИЛ"],
    ["к20+pb", "1к20+БМ"],
    ["1к20+ПР", "1к20+БМ"],
    ["1к6 − 2", "1к6-2"],
    ["+1к4+lvl", "1к4+рівень"],
  ])("приймає запис «%s» і показує його як «%s»", (text, label) => {
    expect(parseOne(text).label).toBe(label);
  });

  it("кожна формула через кому — окрема кнопка кидка", () => {
    const { formulas, error } = parseCustomRollFormulas("1к20+МУД+БМ, 1к8+МУД,");

    expect(error).toBeNull();
    expect(formulas.map((formula) => formula.label)).toEqual(["1к20+МУД+БМ", "1к8+МУД"]);
  });

  it.each([
    ["СИЛ+БМ", "немає кубика"],
    ["5", "немає кубика"],
    ["1к8+1к6", "більше одного кубика"],
    ["1к7", "Такого кубика немає: к7"],
    ["0к6", "від 1 до 40"],
    ["41к6", "від 1 до 40"],
    ["1к8+удача", "Не впізнали «удача»"],
    ["1к8++2", "Не вийшло прочитати"],
    ["1к8СИЛ", "Не вийшло прочитати"],
    ["-1к8", "Не вийшло прочитати"],
    ["1к8*2", "Не вийшло прочитати"],
  ])("відхиляє «%s» і пояснює чому", (text, message) => {
    const { formulas, error } = parseCustomRollFormulas(text);

    expect(formulas).toEqual([]);
    expect(error).toContain(message);
  });

  it("одна погана формула відхиляє все поле, бо зберігається воно цілим", () => {
    expect(parseCustomRollFormulas("1к20, 1к7").formulas).toEqual([]);
  });

  it("обмежує кількість формул", () => {
    expect(parseCustomRollFormulas(Array(7).fill("1к6").join(",")).error).toContain("Не більше 6");
  });
});
