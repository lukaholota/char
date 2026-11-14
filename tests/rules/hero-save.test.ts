import { describe, expect, it } from "vitest";
import { resolveHeroSave, type HeroSaveInput } from "@/rules/hero-save";

const fire = { ability: "DEX" as const, damageType: "fire" as const, isHalfOnSave: true };
const base: HeroSaveInput = { bonus: 3, mode: "NORMAL", conditions: [], resistances: [], effect: fire, dc: 15, rolledDamage: 28, d20Pair: [12, 5] };

describe("ряткидок героя в зоні", () => {
  it("успіх — половина шкоди, провал — уся", () => {
    expect(resolveHeroSave(base)).toMatchObject({ d20: [12], total: 15, isSaved: true, damage: 14 });
    expect(resolveHeroSave({ ...base, d20Pair: [11, 20] })).toMatchObject({ isSaved: false, damage: 28 });
  });

  it("перевага з листа бере кращий к20, а скутість на Спритність її гасить", () => {
    expect(resolveHeroSave({ ...base, mode: "ADVANTAGE", d20Pair: [5, 12] })).toMatchObject({ mode: "ADVANTAGE", d20: [5, 12], total: 15 });
    expect(resolveHeroSave({ ...base, mode: "ADVANTAGE", conditions: ["restrained"], d20Pair: [5, 12] })).toMatchObject({ mode: "NORMAL", d20: [5], isSaved: false });
    expect(resolveHeroSave({ ...base, conditions: ["restrained"], d20Pair: [5, 12] })).toMatchObject({ mode: "DISADVANTAGE", total: 8 });
  });

  it("непритомний герой автоматично провалює Спритність, опір з листа ділить шкоду", () => {
    expect(resolveHeroSave({ ...base, conditions: ["unconscious"], d20Pair: [20, 20] })).toMatchObject({ isAutoFail: true, isSaved: false, damage: 28 });
    expect(resolveHeroSave({ ...base, resistances: ["FIRE"], d20Pair: [2, 2] })).toMatchObject({ defense: "resistant", damage: 14 });
  });

  it("к4 «Благословення» додається до ряткидку й рятує на межі", () => {
    expect(resolveHeroSave({ ...base, d20Pair: [9, 1], dice: [{ sides: 4, value: 3 }] })).toMatchObject({ total: 15, isSaved: true, damage: 14, dice: [{ sides: 4, value: 3 }] });
    expect(resolveHeroSave({ ...base, d20Pair: [12, 1], dice: [{ sides: 4, value: -1 }] })).toMatchObject({ total: 14, isSaved: false });
    expect(resolveHeroSave(base)).not.toHaveProperty("dice");
  });
});

describe("ряткидок героя без шкоди", () => {
  const charm = { ability: "CHA" as const, damageType: null, isHalfOnSave: false, condition: "charmed" as const };

  it("провал — стан без шкоди й без опору, успіх — без стану", () => {
    expect(resolveHeroSave({ ...base, effect: charm, rolledDamage: 0, resistances: ["FIRE"], d20Pair: [2, 2] })).toMatchObject({ isSaved: false, defense: null, damage: 0, condition: "charmed" });
    expect(resolveHeroSave({ ...base, effect: charm, rolledDamage: 0, d20Pair: [19, 2] })).not.toHaveProperty("condition");
  });
});

describe("шкода двох типів", () => {
  const iceStorm = { ability: "DEX" as const, damageType: "bludgeoning" as const, isHalfOnSave: true, secondDamageType: "cold" as const };
  const hit = { ...base, effect: iceStorm, resistances: ["COLD"], rolledDamage: 9, secondRolledDamage: 15 };

  it("опір героя діє лише на свій тип, половина — до опору", () => {
    expect(resolveHeroSave({ ...hit, d20Pair: [2, 2] })).toMatchObject({ isSaved: false, defense: null, secondDefense: "resistant", damage: 16 });
    expect(resolveHeroSave(hit)).toMatchObject({ isSaved: true, damage: 7 });
    expect(resolveHeroSave(base)).not.toHaveProperty("secondDefense");
  });
});
