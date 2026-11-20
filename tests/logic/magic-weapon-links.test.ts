import { describe, expect, it } from "vitest";
import { calculateWeaponAttackBonus, calculateWeaponDamageBonus } from "@/lib/logic/bonus-calculator";
import { hasManualWeaponBonus, listWeaponItemExtraDice, listWeaponMagicItems } from "@/lib/logic/magic-weapon-links";
import { buildPersWithItems } from "./magic-item-pers-fixture";

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
      { name: "Frost Brand", bonus: 0, hits: [{ count: 1, sides: 6, damageType: "COLD", condition: null }], isActive: false },
    ]);
  });

  it("кидає кубики при влучанні лише від активного предмета й без умови", () => {
    expect(listWeaponItemExtraDice(withItems([{ ...FROST_BRAND, persWeaponId: 7 }]), LONGSWORD)).toEqual([{ sides: 6, sign: 1, label: "Frost Brand" }]);
    expect(listWeaponItemExtraDice(withItems([{ ...FROST_BRAND, persWeaponId: 7, isAttuned: false }]), LONGSWORD)).toEqual([]);
    expect(listWeaponItemExtraDice(withItems([{ engName: "Flame Tongue", requiresAttunement: true, description: "", persWeaponId: 7 }]), LONGSWORD)).toEqual([]);
  });

  it("бачить ручний бонус на зброї, щоб попередити про подвійний облік", () => {
    expect(hasManualWeaponBonus({ attackBonus: 2, customDamageBonus: null })).toBe(true);
    expect(hasManualWeaponBonus({ attackBonus: 0, customDamageBonus: 1 })).toBe(true);
    expect(hasManualWeaponBonus({ attackBonus: null, customDamageBonus: null })).toBe(false);
  });
});
