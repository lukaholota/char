import { describe, expect, it } from "vitest";
import { findMagicWeaponTraits } from "@/rules/magic-weapons";
import { describeHitDamage, describeMagicWeaponTraits } from "@/lib/logic/magic-item-effect-text";

const PLUS_TWO = "Ви маєте бонус +2 до кидків атаки й шкоди, зроблених цією магічною зброєю.";

describe("findMagicWeaponTraits", () => {
  it("reads +N from the Ukrainian description in all three wordings", () => {
    expect(findMagicWeaponTraits({ engName: "Weapon +2", description: PLUS_TWO })).toEqual({ bonus: 2, hits: [], profile: null });
    expect(findMagicWeaponTraits({ engName: "X", description: "бонус +1 до кидків атаки та кидків ушкоджень" })?.bonus).toBe(1);
    expect(findMagicWeaponTraits({ engName: "X", description: "бонус +3 до кидків атаки і шкоди" })?.bonus).toBe(3);
  });

  it("ignores ammunition, conditional bonuses, card results and spell attack bonuses", () => {
    expect(findMagicWeaponTraits({ engName: "Ammunition +2", description: PLUS_TWO })).toBeNull();
    expect(findMagicWeaponTraits({ engName: "Bloodrage Greataxe", description: PLUS_TWO })).toBeNull();
    expect(findMagicWeaponTraits({ engName: "Oil of Sharpness", description: PLUS_TWO })).toBeNull();
    expect(findMagicWeaponTraits({ engName: "Rod of the Pact Keeper +1", description: "бонус +1 до кидків атаки заклинаннями" })).toBeNull();
    expect(findMagicWeaponTraits({ engName: null, description: null })).toBeNull();
  });

  it("takes the homebrew weapon bonus column before the description", () => {
    expect(findMagicWeaponTraits({ engName: "homebrew:7", description: "Сокира.", weaponBonus: 2 })).toEqual({ bonus: 2, hits: [], profile: null });
    expect(findMagicWeaponTraits({ engName: "homebrew:7", description: PLUS_TWO, weaponBonus: null })?.bonus).toBe(2);
  });

  it("adds hit dice from the table and picks the edition wording", () => {
    expect(findMagicWeaponTraits({ engName: "Frost Brand", description: "" })).toEqual({
      bonus: 0,
      hits: [{ count: 1, sides: 6, damageType: "COLD", condition: null }],
      profile: null,
    });
    expect(findMagicWeaponTraits({ engName: "Sun Blade", ruleset: "RULES_2014", description: PLUS_TWO })?.hits[0].condition).toBe("проти нежиті");
    expect(findMagicWeaponTraits({ engName: "Sun Blade", ruleset: "RULES_2024", description: PLUS_TWO })?.hits[0].condition).toBe("проти Невмерлих");
    expect(findMagicWeaponTraits({ engName: "Vicious Weapon", ruleset: "RULES_2014", description: "" })).toBeNull();
    expect(findMagicWeaponTraits({ engName: "Vicious Weapon", ruleset: "RULES_2024", description: "" })?.hits).toEqual([
      { count: 2, sides: 6, damageType: null, condition: null },
    ]);
  });

  it("turns a homebrew weapon profile into hits and lines", () => {
    const profile = { attackAbility: "DEX", damage: "1к10+СПР", damageType: "PIERCING", extraDamage: [{ count: 1, sides: 4, damageType: "FIRE" }], normalRange: 150, longRange: 600 };
    const traits = findMagicWeaponTraits({ engName: "homebrew:9", description: "Лук.", weaponProfile: profile });
    expect(traits).toMatchObject({ bonus: 0, hits: [{ count: 1, sides: 4, damageType: "FIRE", condition: null }], profile: { damage: "1к10+СПР" } });
    expect(describeMagicWeaponTraits(traits!)[0]).toBe("Влучання від характеристики: Спритність");
    expect(findMagicWeaponTraits({ engName: "homebrew:9", description: "", weaponProfile: { damage: "  " } })).toBeNull();
  });
});

describe("weapon trait text", () => {
  it("names the damage type and joins the condition", () => {
    expect(describeHitDamage({ count: 2, sides: 6, damageType: "FIRE", condition: "поки зброя палає" })).toBe("+2к6 шкоди вогнем, поки зброя палає");
    expect(describeHitDamage({ count: 3, sides: 6, damageType: null, condition: "проти драконів" })).toBe("+3к6 шкоди проти драконів");
    expect(describeHitDamage({ count: 1, sides: 8, damageType: "ACID", condition: null })).toBe("+1к8 шкоди кислотою");
    expect(describeHitDamage({ count: 1, sides: 4, damageType: null, customType: "Світло", condition: null })).toBe("+1к4 шкоди «Світло»");
    expect(describeMagicWeaponTraits({ bonus: 1, hits: [{ count: 1, sides: 6, damageType: "COLD", condition: null }], profile: null })).toEqual([
      "+1 до атаки й шкоди цією зброєю",
      "При влучанні +1к6 шкоди холодом",
    ]);
  });
});
