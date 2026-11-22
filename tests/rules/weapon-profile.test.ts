import { describe, expect, it } from "vitest";
import { buildExtraDamage, EXTRA_DAMAGE_LIMIT, parseExtraDamage, parseWeaponProfile, toExtraDamageDrafts } from "@/rules/weapon-profile";

describe("parseExtraDamage", () => {
  it("keeps valid dice and drops broken entries", () => {
    expect(parseExtraDamage([{ count: 1, sides: 6, damageType: "FIRE" }, { count: 0, sides: 6, damageType: "FIRE" }, { count: 1, sides: 1, damageType: "ACID" }, { count: 1, sides: 6, damageType: "LASER" }, "1к6", null])).toEqual([{ count: 1, sides: 6, damageType: "FIRE" }]);
    expect(parseExtraDamage("1к6")).toEqual([]);
    expect(parseExtraDamage(null)).toEqual([]);
  });

  it("keeps a campaign damage type name when no book type is set", () => {
    expect(parseExtraDamage([{ count: 1, sides: 4, damageType: null, customType: " Світло " }, { count: 1, sides: 4, customType: "  " }])).toEqual([{ count: 1, sides: 4, damageType: null, customType: "Світло" }]);
    expect(buildExtraDamage(toExtraDamageDrafts([{ count: 2, sides: 6, damageType: "FIRE", customType: "Хаос" }]))).toEqual([{ count: 2, sides: 6, damageType: "FIRE" }]);
  });

  it("caps the number of extra damage types", () => {
    const many = Array.from({ length: EXTRA_DAMAGE_LIMIT + 2 }, () => ({ count: 1, sides: 4, damageType: "NECROTIC" }));
    expect(parseExtraDamage(many)).toHaveLength(EXTRA_DAMAGE_LIMIT);
  });
});

describe("parseWeaponProfile", () => {
  it("reads a full profile", () => {
    expect(parseWeaponProfile({ attackAbility: "DEX", damage: " 1к8+СПР ", damageType: "PIERCING", extraDamage: [{ count: 1, sides: 4, damageType: "ACID" }], normalRange: 100, longRange: 400 })).toEqual({
      attackAbility: "DEX",
      damage: "1к8+СПР",
      damageType: "PIERCING",
      extraDamage: [{ count: 1, sides: 4, damageType: "ACID" }],
      normalRange: 100,
      longRange: 400,
    });
  });

  it("drops invalid fields and returns null for an empty profile", () => {
    expect(parseWeaponProfile({ attackAbility: "LUCK", damage: "  ", damageType: "LASER", extraDamage: [], normalRange: 0, longRange: 1.5 })).toBeNull();
    expect(parseWeaponProfile(null)).toBeNull();
    expect(parseWeaponProfile([])).toBeNull();
    expect(parseWeaponProfile({ normalRange: 30 })).toMatchObject({ normalRange: 30, attackAbility: null });
    expect(parseWeaponProfile({ damage: "x".repeat(80) })?.damage).toHaveLength(60);
  });
});

describe("extra damage drafts", () => {
  it("round-trips form rows and drops rows with bad dice", () => {
    const drafts = toExtraDamageDrafts([{ count: 2, sides: 6, damageType: "FIRE" }]);
    expect(drafts).toEqual([{ dice: "2к6", damageType: "FIRE" }]);
    expect(buildExtraDamage([...drafts, { dice: "вогонь", damageType: "ACID" }, { dice: "", damageType: "ACID" }])).toEqual([{ count: 2, sides: 6, damageType: "FIRE" }]);
  });
});
