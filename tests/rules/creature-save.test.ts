import { describe, expect, it } from "vitest";
import {
  findCreatureSaveBonus,
  findCreatureSaveMode,
  findDamageDefense,
  findSaveDamage,
  findSpellSaveDamage,
  isCreatureSaveAutoFail,
  resolveCreatureSave,
  type CreatureSaveStats,
} from "@/rules/creature-save";

const creature = (overrides: Partial<CreatureSaveStats> = {}): CreatureSaveStats => ({
  savingThrows: "",
  strength: "10 (+0)",
  dexterity: "14 (+2)",
  constitution: "16 (+3)",
  intelligence: "8 (-1)",
  wisdom: "12 (+1)",
  charisma: "10 (+0)",
  specialAbilities: "",
  damageImmunity: "",
  damageResistance: "",
  ...overrides,
});

const shatter = { ability: "CON", damageType: "thunder", isHalfOnSave: true } as const;

describe("шкода заклинань з ряткидком", () => {
  it("знає характеристику, тип шкоди й половину при успіху", () => {
    expect(findSpellSaveDamage({ engName: "Shatter", level: 2, ruleset: "RULES_2014" })).toEqual(shatter);
    expect(findSpellSaveDamage({ engName: "Fireball", level: 3, ruleset: "RULES_2024" })).toEqual({ ability: "DEX", damageType: "fire", isHalfOnSave: true });
    expect(findSpellSaveDamage({ engName: "Sacred Flame", level: 0 })).toEqual({ ability: "DEX", damageType: "radiant", isHalfOnSave: false });
    expect(findSpellSaveDamage({ engName: "Catapult", level: 1 })?.isHalfOnSave).toBe(false);
  });

  it("пропускає заклинання без ряткидка від шкоди, з атакою чи шкодою пізніше — і не плутає редакції", () => {
    expect(findSpellSaveDamage({ engName: "Heat Metal", level: 2 })).toBeNull();
    expect(findSpellSaveDamage({ engName: "Ice Knife", level: 1 })).toBeNull();
    expect(findSpellSaveDamage({ engName: "Spirit Guardians", level: 3 })).toBeNull();
    expect(findSpellSaveDamage({ engName: "Hail of Thorns", level: 1, ruleset: "RULES_2014" })).toBeNull();
    expect(findSpellSaveDamage({ engName: "Hail of Thorns", level: 1, ruleset: "RULES_2024" })).toEqual({ ability: "DEX", damageType: "piercing", isHalfOnSave: true });
    expect(findSpellSaveDamage({ engName: "Inflict Wounds", level: 1, ruleset: "RULES_2014" })).toBeNull();
    expect(findSpellSaveDamage({ engName: "Poison Spray", level: 0, ruleset: "RULES_2024" })).toBeNull();
    expect(findSpellSaveDamage({ engName: "Fire Bolt", level: 0 })).toBeNull();
  });
});

describe("опори істоти", () => {
  it("читає імунітет, опір і вразливість з тексту статблока", () => {
    expect(findDamageDefense(creature({ damageImmunity: "вогонь, отрута" }), "fire")).toBe("immune");
    expect(findDamageDefense(creature({ damageResistance: "Холодна, Некротична, Отруйна" }), "necrotic")).toBe("resistant");
    expect(findDamageDefense(creature({ damageResistance: "Сяючі, некротичні" }), "radiant")).toBe("resistant");
    expect(findDamageDefense(creature({ damageVulnerability: "Громова" }), "thunder")).toBe("vulnerable");
    expect(findDamageDefense(creature({ damageResistance: "Дробильна" }), "bludgeoning")).toBe("resistant");
    expect(findDamageDefense(creature({ damageResistance: "Холодна" }), "fire")).toBeNull();
  });

  it("не застосовує опір лише до немагічної зброї чи на вибір майстра", () => {
    const nonmagical = creature({ damageResistance: "Блискавична, Громова; Дробляча, Колюча, Рубляча від немагічної зброї" });
    expect(findDamageDefense(nonmagical, "thunder")).toBe("resistant");
    expect(findDamageDefense(nonmagical, "bludgeoning")).toBeNull();
    expect(findDamageDefense(creature({ damageResistance: "Кислота, холод, вогонь, блискавка (залежно від стихії)" }), "fire")).toBeNull();
  });

  it("опір і вразливість разом гасять одне одного", () => {
    expect(findDamageDefense(creature({ damageResistance: "вогняна", damageVulnerability: "вогняна" }), "fire")).toBeNull();
  });
});

describe("ряткидок істоти", () => {
  it("бере бонус зі статблока, інакше модифікатор характеристики", () => {
    expect(findCreatureSaveBonus(creature({ savingThrows: "Спр +3, Ста +7" }), "CON")).toBe(7);
    expect(findCreatureSaveBonus(creature({ savingThrows: "Спр +3, Ста +7" }), "WIS")).toBe(1);
    expect(findCreatureSaveBonus(creature({ savingThrows: "Спр +2 + БМ, Ста +2 + БМ" }), "DEX")).toBe(2);
    expect(findCreatureSaveBonus(creature({ savingThrows: "Інт −1" }), "INT")).toBe(-1);
  });

  it("опір магії дає перевагу, схоплення — перешкоду на Спритність", () => {
    const resistant = creature({ specialAbilities: "<p><b>Опір магії{{Magic Resistance}}.</b> …</p>" });
    expect(findCreatureSaveMode(resistant, [], "CON")).toBe("ADVANTAGE");
    expect(findCreatureSaveMode(creature(), ["restrained"], "DEX")).toBe("DISADVANTAGE");
    expect(findCreatureSaveMode(creature(), ["restrained"], "CON")).toBe("NORMAL");
    expect(findCreatureSaveMode(resistant, ["restrained"], "DEX")).toBe("NORMAL");
  });

  it("паралізована чи непритомна істота автоматично провалює Силу й Спритність", () => {
    expect(isCreatureSaveAutoFail(["paralyzed"], "DEX")).toBe(true);
    expect(isCreatureSaveAutoFail(["unconscious"], "STR")).toBe(true);
    expect(isCreatureSaveAutoFail(["unconscious"], "CON")).toBe(false);
    expect(isCreatureSaveAutoFail(["prone"], "DEX")).toBe(false);
  });

  it("половина при успіху й опори округлюються вниз, опір — після половини", () => {
    expect(findSaveDamage(15, true, shatter, null)).toBe(7);
    expect(findSaveDamage(15, true, shatter, "resistant")).toBe(3);
    expect(findSaveDamage(15, false, shatter, "vulnerable")).toBe(30);
    expect(findSaveDamage(15, false, shatter, "immune")).toBe(0);
    expect(findSaveDamage(15, true, { ...shatter, isHalfOnSave: false }, null)).toBe(0);
  });

  it("зводить кидок, бонус, СК і шкоду в один результат", () => {
    const ogre = creature({ savingThrows: "Ста +7" });
    expect(resolveCreatureSave({ creature: ogre, conditions: [], effect: shatter, dc: 15, rolledDamage: 20, d20Pair: [8, 19] })).toEqual({
      d20: [8], mode: "NORMAL", bonus: 7, total: 15, isSaved: true, isAutoFail: false, defense: null, damage: 10,
    });
    const golem = creature({ specialAbilities: "Опір магії", damageImmunity: "громова" });
    expect(resolveCreatureSave({ creature: golem, conditions: [], effect: shatter, dc: 15, rolledDamage: 20, d20Pair: [3, 11] })).toMatchObject({ d20: [3, 11], mode: "ADVANTAGE", total: 14, isSaved: false, defense: "immune", damage: 0 });
    const asleep = resolveCreatureSave({ creature: ogre, conditions: ["unconscious"], effect: { ...shatter, ability: "DEX" }, dc: 5, rolledDamage: 9, d20Pair: [20, 20] });
    expect(asleep).toMatchObject({ isSaved: false, isAutoFail: true, damage: 9 });
    expect(resolveCreatureSave({ creature: null, conditions: [], effect: shatter, dc: 10, rolledDamage: 9, d20Pair: [10, 1] })).toMatchObject({ bonus: 0, isSaved: true, damage: 4 });
  });
});
