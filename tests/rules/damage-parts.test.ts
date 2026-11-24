import { describe, expect, it } from "vitest";
import { applyDamageDefenses, hasDamageTypes, isDamageTypeKey, splitDamageByType, sumDamagePart, toCreatureDamageType, toDamageTypeKey } from "@/rules/damage-parts";

const longsword = { damageType: "SLASHING" as const, groups: [{ values: [4] }], extra: [{ sign: 1 as const, label: "Громовий удар", value: 2, damageType: "BLUDGEONING" as const }], bonus: 10, bonusParts: [{ label: "Громовий удар", damageType: "BLUDGEONING" as const, value: 5 }] };

describe("шкода за типами", () => {
  it("основний тип бере кубики зброї й решту бонусу, додатковий — свій кубик і свій бонус", () => {
    expect(splitDamageByType(longsword)).toEqual([
      { damageType: "SLASHING", label: "", values: [4], bonus: 5 },
      { damageType: "BLUDGEONING", label: "Громовий удар", values: [2], bonus: 5 },
    ]);
  });

  it("кубик без типу на типовій зброї б'є її типом", () => {
    expect(splitDamageByType({ damageType: "PIERCING", groups: [{ values: [5] }], extra: [{ sign: -1, label: "Зменшення", value: 2 }], bonus: 3 })).toEqual([{ damageType: "PIERCING", label: "", values: [5, -2], bonus: 3 }]);
  });

  it("кубики без типу групуються за назвою, а порожня основна частина зникає", () => {
    const parts = splitDamageByType({ groups: [], extra: [{ sign: 1, label: "Прихована атака", value: 3 }, { sign: -1, label: "Прихована атака", value: 1 }], bonus: 0 });
    expect(parts).toEqual([{ damageType: null, label: "Прихована атака", values: [3, -1], bonus: 0 }]);
    expect(sumDamagePart(parts[0])).toBe(2);
  });

  it("опір ділить навпіл униз лише свій тип, імунітет обнуляє, вразливість подвоює", () => {
    const parts = splitDamageByType(longsword);
    expect(applyDamageDefenses(21, parts, (type) => (type === "BLUDGEONING" ? "resistant" : null))).toEqual({
      damage: 17,
      notes: [{ damageType: "BLUDGEONING", defense: "resistant", before: 7, after: 3 }],
    });
    expect(applyDamageDefenses(21, parts, (type) => (type === "SLASHING" ? "immune" : "vulnerable")).damage).toBe(19);
    expect(applyDamageDefenses(21, parts, () => null)).toEqual({ damage: 21, notes: [] });
  });

  it("шкода не йде в мінус, а від'ємна частина не множиться", () => {
    expect(applyDamageDefenses(0, [{ damageType: "FIRE", label: "", values: [1], bonus: -3 }], () => "vulnerable")).toEqual({
      damage: 0,
      notes: [{ damageType: "FIRE", defense: "vulnerable", before: 0, after: 0 }],
    });
  });

  it("типи перекладаються між регістрами й перевіряються", () => {
    expect(hasDamageTypes({ extra: [] })).toBe(false);
    expect(hasDamageTypes({ extra: [{ sign: 1, label: "", value: 1, damageType: "COLD" }] })).toBe(true);
    expect(toCreatureDamageType("FORCE")).toBe("force");
    expect(toDamageTypeKey("psychic")).toBe("PSYCHIC");
    expect(isDamageTypeKey("ACID")).toBe(true);
    expect(isDamageTypeKey("acid")).toBe(false);
  });
});
