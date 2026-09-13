import { describe, expect, it } from "vitest";
import { collectDamageResistances, findDarkvisionRange } from "./senses-and-resistances";

describe("опори до шкоди з активних фіч", () => {
  it("без фіч опорів немає", () => {
    expect(collectDamageResistances([])).toEqual([]);
  });

  it("тифлінг Безодні 2024: один опір від родоводу", () => {
    expect(collectDamageResistances([{ damageResistances: ["POISON"] }, { darkvisionRange: 60 }])).toEqual(["POISON"]);
  });

  it("аасімар 2024: два типи з однієї фічі, у порядку enum", () => {
    expect(collectDamageResistances([{ damageResistances: ["RADIANT", "NECROTIC"] }])).toEqual(["NECROTIC", "RADIANT"]);
  });

  it("однаковий опір із двох джерел показується один раз", () => {
    const dwarf = { damageResistances: ["POISON" as const] };
    const abyssal = { damageResistances: ["POISON" as const] };
    expect(collectDamageResistances([dwarf, abyssal])).toEqual(["POISON"]);
  });
});

describe("дальність Темнозору з активних фіч", () => {
  it("без Темнозору — null, а не 0", () => {
    expect(findDarkvisionRange([{ damageResistances: ["FIRE"] }])).toBeNull();
  });

  it("дроу 2014: расові 60 і підрасові 120 зводяться до 120", () => {
    expect(findDarkvisionRange([{ darkvisionRange: 60 }, { darkvisionRange: 120 }])).toBe(120);
  });

  it("порядок фіч не впливає на результат", () => {
    expect(findDarkvisionRange([{ darkvisionRange: 120 }, { darkvisionRange: 60 }])).toBe(120);
  });
});
