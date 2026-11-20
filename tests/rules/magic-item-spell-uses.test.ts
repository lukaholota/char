import { describe, expect, it } from "vitest";
import { describeCharges, findItemSpellUse, findMaxChargesPerUse, findSpellLevelForCharges } from "@/rules/magic-item-spell-uses";

describe("заклинання з предмета за заряди", () => {
  const necklace = findItemSpellUse({ engName: "Necklace of Fireballs" })!;

  it("намисто кидає Вогнекулю 3 рівня зі СК 15, і кожна наступна намистина піднімає рівень", () => {
    expect(necklace).toMatchObject({ spellEngName: "Fireball", baseLevel: 3, saveDC: 15 });
    expect(findSpellLevelForCharges(necklace, 1)).toBe(3);
    expect(findSpellLevelForCharges(necklace, 4)).toBe(6);
    expect(describeCharges(necklace, 2)).toBe("2 намистини");
    expect(describeCharges(necklace, 5)).toBe("5 намистин");
  });

  it("за раз не можна витратити більше, ніж лишилось, чи піднятися понад 9 рівень", () => {
    expect(findMaxChargesPerUse(necklace, 4)).toBe(4);
    expect(findMaxChargesPerUse(necklace, 9)).toBe(7);
    expect(findMaxChargesPerUse(necklace, null)).toBe(7);
    expect(findMaxChargesPerUse(findItemSpellUse({ engName: "Wand of Magic Missiles" })!, null)).toBe(9);
  });

  it("звичайний предмет заклинань не застосовує", () => {
    expect(findItemSpellUse({ engName: "Cloak of Protection" })).toBeNull();
    expect(findItemSpellUse({ engName: null })).toBeNull();
  });
});
