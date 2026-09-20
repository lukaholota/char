import { describe, expect, it } from "vitest";

import { describeArmorStats, describeWeaponStats, type ArmorStats, type WeaponStats } from "./equipment-stats";

const melee = (fields: Partial<WeaponStats>): WeaponStats => ({
  damage: "1d6",
  damageType: "BLUDGEONING",
  properties: [],
  versatileDamage: null,
  normalRange: null,
  longRange: null,
  isRanged: false,
  ...fields,
});

const armor = (fields: Partial<ArmorStats>): ArmorStats => ({
  armorType: "LIGHT",
  baseAC: 11,
  abilityBonusType: "FULL",
  strengthReq: null,
  stealthDisadvantage: false,
  ...fields,
});

describe("рядок характеристик зброї у кроці спорядження", () => {
  it("посох: кубик, характеристика, тип шкоди й дворучний кубик універсальної", () => {
    expect(describeWeaponStats(melee({ properties: ["VERSATILE"], versatileDamage: "1d8" }))).toBe(
      "1к6 + СИЛ, дробяча шкода · універсальна (1к8)",
    );
  });

  it("кинджал: фехтувальна дає вибір СИЛ або СПР, кидальна — дальність", () => {
    expect(
      describeWeaponStats(
        melee({ damage: "1к4", damageType: "PIERCING", properties: ["FINESSE", "LIGHT", "THROWN"], normalRange: 20, longRange: 60 }),
      ),
    ).toBe("1к4 + СИЛ або СПР, колюча шкода · спритність · легка · кидальна (20/60 фт)");
  });

  it("довгий лук: дальня зброя б'є Спритністю", () => {
    expect(
      describeWeaponStats(
        melee({ damage: "1d8", damageType: "PIERCING", properties: ["AMMUNITION", "HEAVY", "TWO_HANDED"], normalRange: 150, longRange: 600, isRanged: true }),
      ),
    ).toBe("1к8 + СПР, колюча шкода · боєприпас (150/600 фт) · важка · дворучна");
  });

  it("зброя без кубика шкоди не пише «+ СИЛ» у порожнечу", () => {
    expect(describeWeaponStats(melee({ damage: "—", properties: ["SPECIAL", "THROWN"], normalRange: 5, longRange: 15 }))).toBe(
      "спеціальна · кидальна (5/15 фт)",
    );
  });
});

describe("рядок характеристик обладунку у кроці спорядження", () => {
  it("легкий: повний модифікатор Спритності", () => {
    expect(describeArmorStats(armor({}))).toBe("легкі обладунки · КБ 11 + Мод. СПР");
  });

  it("середній: Спритність не більше +2 і перешкода на Непомітність", () => {
    expect(describeArmorStats(armor({ armorType: "MEDIUM", baseAC: 14, abilityBonusType: "MAX2", stealthDisadvantage: true }))).toBe(
      "середні обладунки · КБ 14 + Мод. СПР (макс. +2) · перешкода на Непомітність",
    );
  });

  it("важкий: без Спритності, з вимогою Сили", () => {
    expect(
      describeArmorStats(armor({ armorType: "HEAVY", baseAC: 18, abilityBonusType: "NONE", strengthReq: 15, stealthDisadvantage: true })),
    ).toBe("важкі обладунки · КБ 18 · Сила 15 · перешкода на Непомітність");
  });

  it("щит", () => {
    expect(describeArmorStats(armor({ armorType: "SHIELD", baseAC: 2 }))).toBe("+2 до КБ");
  });
});
