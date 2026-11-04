import { describe, expect, it } from "vitest";
import creatures2014 from "@/lib/generated/creatures.json";
import creatures2024 from "@/lib/generated/creatures2024.json";
import { findCreatureRolls, findSaveBonus, readAbilityModifier, readSignedNumber, splitNamedBonuses } from "@/rules/creature-rolls";

const rollsOf = (text: string) => findCreatureRolls(text).map((spot) => ({ text: text.slice(spot.start, spot.end), roll: spot.roll }));

describe("кубики в тексті статблока", () => {
  it("2014: бонус атаки й шкода з бонусом", () => {
    expect(rollsOf("Кидок ближньої атаки зброєю: +4, досяжність 5 фт. Влучання: 5 (1к6 + 2) рублячих ушкоджень.")).toEqual([
      { text: "+4", roll: { kind: "attack", bonus: 4 } },
      { text: "1к6 + 2", roll: { kind: "damage", count: 1, sides: 6, bonus: 2 } },
    ]);
  });

  it("2024: рукопашна атака, від'ємний бонус шкоди й перезарядка", () => {
    expect(rollsOf("Вогняний подих (Перезарядка 5–6). Рукопашна атака: −1, досяжність 5 фт. Влучання: 1 (1к4 − 1) дроблячих")).toEqual([
      { text: "Перезарядка 5–6", roll: { kind: "recharge", from: 5 } },
      { text: "−1", roll: { kind: "attack", bonus: -1 } },
      { text: "1к4 − 1", roll: { kind: "damage", count: 1, sides: 4, bonus: -1 } },
    ]);
  });

  it("два кубики поспіль не склеюються в бонус", () => {
    expect(rollsOf("11 (1к6 + 3 плюс 1к8) колючих, 2к8 + 1к6")).toEqual([
      { text: "1к6 + 3", roll: { kind: "damage", count: 1, sides: 6, bonus: 3 } },
      { text: "1к8", roll: { kind: "damage", count: 1, sides: 8, bonus: 0 } },
      { text: "2к8", roll: { kind: "damage", count: 2, sides: 8, bonus: 0 } },
      { text: "1к6", roll: { kind: "damage", count: 1, sides: 6, bonus: 0 } },
    ]);
  });

  it("кожна атака з бонусом у бестіарії обох редакцій стає кидком", () => {
    const missed: string[] = [];
    for (const creature of [...creatures2014, ...creatures2024] as Array<{ name: string; actions?: string | null }>) {
      for (const paragraph of (creature.actions ?? "").split("</p>")) {
        const hasAttack = /(Кидок|Рукопашна|Дальня)[^:<]{0,40}атак[аи][^:<]{0,30}:\s*[+−–-]\d/u.test(paragraph);
        if (hasAttack && !findCreatureRolls(paragraph).some((spot) => spot.roll.kind === "attack")) missed.push(`${creature.name}: ${paragraph.slice(0, 80)}`);
      }
    }
    expect(missed).toEqual([]);
  });
});

describe("числа характеристик", () => {
  it("модифікатор із дужок, а без дужок — із значення", () => {
    expect(readAbilityModifier("15 (+2)")).toBe(2);
    expect(readAbilityModifier("8 (−1)")).toBe(-1);
    expect(readAbilityModifier("7")).toBe(-2);
    expect(readAbilityModifier("—")).toBeNull();
    expect(readSignedNumber("ініціатива")).toBeNull();
  });

  it("ряткидки й навички діляться на назву й бонус", () => {
    expect(splitNamedBonuses("Спр +6, Муд −1, Спр плюс БМ")).toEqual([{ name: "Спр", bonus: 6 }, { name: "Муд", bonus: -1 }, "Спр плюс БМ"]);
    expect(findSaveBonus("Спр +6, Муд +7", "МУД")).toBe(7);
    expect(findSaveBonus("Спр +6", "СИЛ")).toBeNull();
    expect(findSaveBonus(null, "СИЛ")).toBeNull();
  });
});
