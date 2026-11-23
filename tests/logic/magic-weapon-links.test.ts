import { describe, expect, it } from "vitest";
import { calculateWeaponAttackBonus, calculateWeaponDamageBonus, calculateWeaponDamageDice, findWeaponDamageType, findWeaponRange } from "@/lib/logic/bonus-calculator";
import { hasManualWeaponBonus, listWeaponExtraDice, listWeaponMagicItems, sumWeaponExtraDamageBonus } from "@/lib/logic/magic-weapon-links";
import { buildPersWithItems } from "./magic-item-pers-fixture";
import { buildExtraDamage, toExtraDamageDrafts } from "@/rules/weapon-profile";

const LONGSWORD = { persWeaponId: 7, isProficient: true, weapon: { name: "LONGSWORD", weaponType: "MARTIAL_WEAPON", properties: ["VERSATILE"], isRanged: false, damage: "1d8" } };
const DAGGER = { ...LONGSWORD, persWeaponId: 8, weapon: { ...LONGSWORD.weapon, name: "DAGGER", properties: ["FINESSE"] } };
const PLUS_TWO = { engName: "Weapon +2", requiresAttunement: false, description: "Ви маєте бонус +2 до кидків атаки й шкоди цією магічною зброєю." };
const FROST_BRAND = { engName: "Frost Brand", requiresAttunement: true, description: "" };

const withItems = (items: Parameters<typeof buildPersWithItems>[0]) =>
  buildPersWithItems(items, { str: 16, weapons: [LONGSWORD, DAGGER] });

describe("магічна зброя, привʼязана до рядка зброї листа", () => {
  it("додає +N до атаки й шкоди лише привʼязаної зброї", () => {
    const pers = withItems([{ ...PLUS_TWO, persWeaponId: 7 }]);
    expect(calculateWeaponAttackBonus(pers, LONGSWORD as never)).toBe(3 + 3 + 2);
    expect(calculateWeaponDamageBonus(pers, LONGSWORD as never)).toBe(3 + 2);
    expect(calculateWeaponAttackBonus(pers, DAGGER as never)).toBe(3 + 3);
  });

  it("не рахує непривʼязаний, знятий або ненастроєний предмет", () => {
    expect(calculateWeaponAttackBonus(withItems([PLUS_TWO]), LONGSWORD as never)).toBe(6);
    expect(calculateWeaponDamageBonus(withItems([{ ...PLUS_TWO, persWeaponId: 7, isEquipped: false }]), LONGSWORD as never)).toBe(3);
    const unattuned = withItems([{ ...FROST_BRAND, persWeaponId: 7, isAttuned: false }]);
    expect(listWeaponMagicItems(unattuned, LONGSWORD)).toEqual([
      { name: "Frost Brand", bonus: 0, hits: [{ count: 1, sides: 6, damageType: "COLD", condition: null }], profile: null, isActive: false },
    ]);
  });

  it("кидає кубики при влучанні лише від активного предмета й без умови", () => {
    expect(listWeaponExtraDice(withItems([{ ...FROST_BRAND, persWeaponId: 7 }]), LONGSWORD)).toEqual([{ sides: 6, sign: 1, label: "Frost Brand" }]);
    expect(listWeaponExtraDice(withItems([{ ...FROST_BRAND, persWeaponId: 7, isAttuned: false }]), LONGSWORD)).toEqual([]);
    expect(listWeaponExtraDice(withItems([{ engName: "Flame Tongue", requiresAttunement: true, description: "", persWeaponId: 7 }]), LONGSWORD)).toEqual([]);
  });

  it("кидає додаткову шкоду, вписану в листі, разом з кубиками предмета", () => {
    const flaming = { ...LONGSWORD, extraDamage: [{ count: 2, sides: 6, damageType: "FIRE" }, { count: 1, sides: 4, damageType: "BOGUS" }] };
    expect(listWeaponExtraDice(withItems([{ ...FROST_BRAND, persWeaponId: 7 }]), flaming)).toEqual([
      { sides: 6, sign: 1, label: "Вогняна" },
      { sides: 6, sign: 1, label: "Вогняна" },
      { sides: 6, sign: 1, label: "Frost Brand" },
    ]);
  });

  it("зберігає старий запис додаткової шкоди після редагування", () => {
    const extraDamage = [{ count: 1, sides: 4, damageType: "FIRE" }];
    const drafts = toExtraDamageDrafts(extraDamage);
    expect(drafts).toMatchObject([{ dice: "1к4", damageType: "FIRE" }]);
    expect(buildExtraDamage(drafts)).toEqual(extraDamage);
    expect(listWeaponExtraDice(withItems([]), { ...LONGSWORD, extraDamage })).toEqual([{ sides: 4, sign: 1, label: "Вогняна" }]);
  });

  it("бачить ручний бонус на зброї, щоб попередити про подвійний облік", () => {
    expect(hasManualWeaponBonus({ attackBonus: 2, customDamageBonus: null })).toBe(true);
    expect(hasManualWeaponBonus({ attackBonus: 0, customDamageBonus: 1 })).toBe(true);
    expect(hasManualWeaponBonus({ attackBonus: null, customDamageBonus: null })).toBe(false);
  });
});

describe("хомбрю-зброя з профілем", () => {
  const COMPOUND_BOW = { engName: "Блочний лук", requiresAttunement: false, isMundane: true, description: "", persWeaponId: 7, weaponProfile: { attackAbility: "DEX", damage: "1к10+СПР", damageType: "PIERCING", extraDamage: [{ count: 1, sides: 4, damageType: "FIRE" }], normalRange: 150, longRange: 600 } };

  it("рахує формули з листа й профілю кожного разу за модифікаторами героя", () => {
    const own = buildExtraDamage([{ dice: "1к4+СИЛ", damageType: "BLUDGEONING" }]);
    const attached = buildExtraDamage([{ dice: "1к6+СПР*2-1", damageType: "FIRE" }]);
    const bow = { ...COMPOUND_BOW, weaponProfile: { ...COMPOUND_BOW.weaponProfile, extraDamage: attached } };
    const pers = withItems([bow]);
    const weapon = { ...LONGSWORD, extraDamage: own };
    expect(toExtraDamageDrafts(own)).toMatchObject([{ dice: "1к4+СИЛ", damageType: "BLUDGEONING" }]);
    expect(toExtraDamageDrafts(attached)).toMatchObject([{ dice: "1к6+СПР*2-1", damageType: "FIRE" }]);
    expect(listWeaponExtraDice(pers, weapon).map(({ sides }) => sides)).toEqual([4, 6]);
    expect(sumWeaponExtraDamageBonus(pers, weapon, (ability) => ability === "STR" ? -1 : 2)).toBe(2);
    expect(sumWeaponExtraDamageBonus(pers, weapon, (ability) => ability === "STR" ? 3 : 2)).toBe(6);
  });

  it("профіль привʼязаного предмета задає атаку, шкоду, тип і дальність", () => {
    const pers = withItems([COMPOUND_BOW]);
    expect(calculateWeaponAttackBonus(pers, LONGSWORD as never)).toBe(2 + 3);
    expect(calculateWeaponDamageBonus(pers, LONGSWORD as never)).toBe(2);
    expect(calculateWeaponDamageDice(pers, LONGSWORD as never)).toBe("1d10");
    expect(findWeaponDamageType(pers, LONGSWORD as never)).toBe("PIERCING");
    expect(findWeaponRange(pers, LONGSWORD as never)).toEqual({ normal: 150, long: 600 });
    expect(listWeaponExtraDice(pers, LONGSWORD)).toEqual([{ sides: 4, sign: 1, label: "Блочний лук" }]);
  });

  it("ручні налаштування рядка мають перевагу над профілем", () => {
    const pers = withItems([COMPOUND_BOW]);
    const tuned = { ...LONGSWORD, customDamageDice: "1d12", overrideAttackAbility: "STR" };
    expect(calculateWeaponDamageDice(pers, tuned as never)).toBe("1d12");
    expect(calculateWeaponAttackBonus(pers, tuned as never)).toBe(3 + 3);
  });
});
