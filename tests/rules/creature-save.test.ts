import { describe, expect, it } from "vitest";
import spells2014 from "@/lib/generated/spells.json";
import spells2024 from "../../data/2024/normalized/spells.json";
import { listSpellDice } from "@/rules/spell-dice";
import {
  findCreatureSaveBonus,
  findCreatureSaveMode,
  findDamageDefense,
  findDamageTypeIn,
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

describe("ряткидок без шкоди накладає стан при провалі", () => {
  const honey = { ability: "DEX", damageType: null, isHalfOnSave: false, condition: "restrained" } as const;

  it("провал — стан, успіх — нічого, шкоди немає", () => {
    expect(resolveCreatureSave({ creature: creature(), conditions: [], effect: honey, dc: 17, rolledDamage: 0, d20Pair: [9, 1] })).toEqual({
      d20: [9], mode: "NORMAL", bonus: 2, total: 11, isSaved: false, isAutoFail: false, defense: null, damage: 0, condition: "restrained",
    });
    expect(resolveCreatureSave({ creature: creature(), conditions: [], effect: honey, dc: 17, rolledDamage: 0, d20Pair: [15, 1] })).not.toHaveProperty("condition");
  });

  it("несприйнятливість до стану — імунітет без стану; до шкоди — стан однаково", () => {
    const ooze = creature({ conditionImmunity: "засліплений, оглухлий, скований" });
    expect(resolveCreatureSave({ creature: ooze, conditions: [], effect: honey, dc: 17, rolledDamage: 0, d20Pair: [1, 1] })).toMatchObject({ isSaved: false, defense: "immune", damage: 0 });
    expect(resolveCreatureSave({ creature: ooze, conditions: [], effect: honey, dc: 17, rolledDamage: 0, d20Pair: [1, 1] })).not.toHaveProperty("condition");
    const wing = { ability: "DEX", damageType: "bludgeoning", isHalfOnSave: false, condition: "prone" } as const;
    expect(resolveCreatureSave({ creature: creature({ damageImmunity: "дроблячі" }), conditions: [], effect: wing, dc: 19, rolledDamage: 13, d20Pair: [1, 1] })).toMatchObject({ defense: "immune", damage: 0, condition: "prone" });
    expect(resolveCreatureSave({ creature: creature({ conditionImmunity: "Окамʼянілий" }), conditions: [], effect: { ...honey, condition: "petrified" }, dc: 17, rolledDamage: 0, d20Pair: [1, 1] })).not.toHaveProperty("condition");
  });

  it("автоматичний провал паралізованого теж накладає стан", () => {
    expect(resolveCreatureSave({ creature: null, conditions: ["paralyzed"], effect: honey, dc: 5, rolledDamage: 0, d20Pair: [20, 20] })).toMatchObject({ isAutoFail: true, condition: "restrained" });
  });
});

const iceStorm = { ability: "DEX", damageType: "bludgeoning", isHalfOnSave: true, secondDamageType: "cold" } as const;

describe("шкода двох типів під одним ряткидком", () => {
  it("таблиця знає другий тип, а 2014 не бере ряткидок залпів із 2024", () => {
    expect(findSpellSaveDamage({ engName: "Ice Storm", level: 4, ruleset: "RULES_2014" })).toEqual(iceStorm);
    expect(findSpellSaveDamage({ engName: "Meteor Swarm", level: 9, ruleset: "RULES_2024" })).toMatchObject({ damageType: "fire", secondDamageType: "bludgeoning" });
    expect(findSpellSaveDamage({ engName: "Disintegrate", level: 6 })).toEqual({ ability: "DEX", damageType: "force", isHalfOnSave: false });
    expect(findSpellSaveDamage({ engName: "Conjure Volley", level: 5, ruleset: "RULES_2014" })).toBeNull();
    expect(findSpellSaveDamage({ engName: "Conjure Volley", level: 5, ruleset: "RULES_2024" })).toEqual({ ability: "DEX", damageType: "force", isHalfOnSave: true });
  });

  it("опір рахується по кожному типу окремо, половина — до опору", () => {
    const save = { conditions: [], effect: iceStorm, dc: 15, rolledDamage: 9, secondRolledDamage: 15 };
    const yeti = creature({ damageImmunity: "холод" });
    expect(resolveCreatureSave({ ...save, creature: yeti, d20Pair: [2, 2] })).toMatchObject({ isSaved: false, defense: null, secondDefense: "immune", damage: 9 });
    const skeleton = creature({ damageVulnerability: "дробляча", damageResistance: "холод" });
    expect(resolveCreatureSave({ ...save, creature: skeleton, d20Pair: [2, 2] })).toMatchObject({ defense: "vulnerable", secondDefense: "resistant", damage: 25 });
    expect(resolveCreatureSave({ ...save, creature: skeleton, d20Pair: [19, 2] })).toMatchObject({ isSaved: true, damage: 11 });
    expect(resolveCreatureSave({ ...save, creature: null, d20Pair: [2, 2] })).toMatchObject({ secondDefense: null, damage: 24 });
  });
});

describe("таблиця шкоди з ряткидком збігається з кубиками й описами", () => {
  type CatalogSpell = { engName: string; description: string; ruleset?: string };
  const catalogs = {
    RULES_2014: (spells2014 as CatalogSpell[]).filter((spell) => (spell.ruleset ?? "RULES_2014") === "RULES_2014"),
    RULES_2024: spells2024 as CatalogSpell[],
  };
  const saveSpells = (["RULES_2014", "RULES_2024"] as const).flatMap((ruleset) =>
    listSpellDice(ruleset).flatMap(([engName, dice]) => {
      const save = findSpellSaveDamage({ engName, level: 1, ruleset });
      return save ? [{ ruleset, engName, dice, save }] : [];
    }),
  );

  /// Каталог не називає типу або називає інакше, ніж книга («чистою енергією», «силовим полем») — звірено вручну.
  const REVIEWED_TYPES = ["RULES_2014 Catapult", "RULES_2014 Disintegrate", "RULES_2014 Time Ravage"];

  it("другий тип шкоди є рівно там, де в кидку є друга група кубиків", () => {
    const mismatches = saveSpells.filter(({ dice, save }) => Boolean(save.secondDamageType) !== Boolean(dice.rolls[0].second)).map(({ ruleset, engName }) => `${ruleset} ${engName}`);
    expect(mismatches).toEqual([]);
  });

  it("кожен тип шкоди з таблиці названо в описі заклинання", () => {
    const unnamed = saveSpells.flatMap(({ ruleset, engName, save }) => {
      const words = catalogs[ruleset].find((spell) => spell.engName === engName)?.description.split(/[^\p{L}]+/u) ?? [];
      const types = [save.damageType, ...(save.secondDamageType ? [save.secondDamageType] : [])];
      return types.every((type) => words.some((word) => findDamageTypeIn(word) === type)) ? [] : [`${ruleset} ${engName}`];
    });
    expect(unnamed).toEqual(REVIEWED_TYPES);
  });
});
