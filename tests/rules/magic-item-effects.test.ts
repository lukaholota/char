import { describe, expect, it } from "vitest";
import {
  collectItemDamageTypes,
  explainItemAbilityParts,
  explainItemBonusParts,
  findItemDarkvisionRange,
  findItemMovementSpeeds,
  findMagicItemEffects,
  pickArmorClassBonus,
  pickCheckBonus,
  pickProficiencyBonus,
  pickRangedDamageBonus,
  pickSaveBonus,
  pickSkillBonus,
  pickSpellAttackBonus,
  pickSpellDcBonus,
  type ActiveMagicItem,
} from "@/rules/magic-item-effects";

const activate = (name: string, ruleset = "RULES_2014", columns: Record<string, unknown> = {}): ActiveMagicItem => ({
  name,
  effects: findMagicItemEffects({ engName: name, ruleset, ...columns }),
});

describe("findMagicItemEffects", () => {
  it("бере числа з колонок і не дублює їх реєстром", () => {
    const effects = findMagicItemEffects({ engName: "Cloak of Protection", ruleset: "RULES_2014", bonusToAC: 1, bonusToSavingThrows: { all: 1 } });
    expect(effects.filter((effect) => effect.kind === "AC_BONUS")).toHaveLength(1);
    expect(effects.filter((effect) => effect.kind === "SAVE_BONUS")).toHaveLength(1);
  });

  it("читає ряткидок окремої характеристики й ігнорує нулі та сміття", () => {
    const effects = findMagicItemEffects({ engName: "Невідомий", bonusToSavingThrows: { wis: 2, dex: 0, con: "x" }, bonusToRangedDamage: 2, bonusToAC: 2, noArmorOrShieldForACBonus: true });
    expect(effects).toEqual([
      { kind: "AC_BONUS", bonus: 2, unarmoredOnly: true },
      { kind: "SAVE_BONUS", bonus: 2, ability: "WIS" },
      { kind: "RANGED_DAMAGE_BONUS", bonus: 2 },
    ]);
  });

  it("2024 без колонок отримує числа з реєстру", () => {
    expect(findMagicItemEffects({ engName: "Cloak of Protection", ruleset: "RULES_2024" }).map((effect) => effect.kind)).toEqual(["AC_BONUS", "SAVE_BONUS"]);
  });

  it("розрізняє редакції й не вигадує ефектів", () => {
    expect(findMagicItemEffects({ engName: "Winged Boots", ruleset: "RULES_2024" })).toEqual([]);
    expect(findMagicItemEffects({ engName: "Scarab of Protection", ruleset: "RULES_2024" })).toEqual([{ kind: "AC_BONUS", bonus: 1 }]);
    expect(findMagicItemEffects({ engName: "Scarab of Protection", ruleset: "RULES_2014" })).toEqual([]);
    expect(findMagicItemEffects({ engName: null })).toEqual([]);
    expect(findMagicItemEffects({ engName: "Невідомий", bonusToSavingThrows: "all" })).toEqual([]);
  });

  it("пасивна перевага 2024 там, де у 2014 вона залежить від каптура чи тихого руху", () => {
    const advantages = (engName: string, ruleset: string) =>
      findMagicItemEffects({ engName, ruleset }).filter((effect) => effect.kind === "ADVANTAGE");
    expect(advantages("Cloak of Elvenkind", "RULES_2024")).toEqual([{ kind: "ADVANTAGE", scope: "STEALTH_CHECK" }]);
    expect(advantages("Cloak of Elvenkind", "RULES_2014")).toEqual([]);
    expect(advantages("Boots of Elvenkind", "RULES_2024")).toEqual([{ kind: "ADVANTAGE", scope: "STEALTH_CHECK" }]);
    expect(advantages("Boots of Elvenkind", "RULES_2014")).toEqual([]);
    expect(advantages("Sentinel Shield", "RULES_2014").map((effect) => effect.kind === "ADVANTAGE" && effect.scope)).toEqual(["INITIATIVE", "PERCEPTION_CHECK"]);
  });
});

describe("explainItemAbilityParts", () => {
  it("встановлення діє лише вгору, найсильніше з кількох", () => {
    const items = [activate("Headband of Intellect"), activate("Gauntlets of Ogre Power"), activate("Belt of Hill Giant Strength")];
    expect(explainItemAbilityParts(items, "INT", 10)).toEqual([{ label: "Headband of Intellect", value: 9 }]);
    expect(explainItemAbilityParts(items, "INT", 20)).toEqual([]);
    expect(explainItemAbilityParts(items, "STR", 12)).toEqual([{ label: "Belt of Hill Giant Strength", value: 9 }]);
  });

  it("приріст +2 не піднімає вище 20", () => {
    expect(explainItemAbilityParts([activate("Ioun Stone (Fortitude)")], "CON", 19)).toEqual([{ label: "Ioun Stone (Fortitude)", value: 1 }]);
    expect(explainItemAbilityParts([activate("Ioun Stone (Fortitude)")], "CON", 20)).toEqual([]);
    expect(explainItemAbilityParts([activate("Amulet of Health"), activate("Ioun Stone (Fortitude)")], "CON", 12)).toEqual([
      { label: "Amulet of Health", value: 7 },
      { label: "Ioun Stone (Fortitude)", value: 1 },
    ]);
  });
});

describe("бонуси предметів", () => {
  const luckstone = activate("Stone of Good Luck (Luckstone)");
  const gloves = activate("Gloves of Thievery");

  it("рахує кожен предмет окремим рядком", () => {
    expect(explainItemBonusParts([luckstone, gloves], pickSkillBonus("SLEIGHT_OF_HAND"))).toEqual([
      { label: "Stone of Good Luck (Luckstone)", value: 1 },
      { label: "Gloves of Thievery", value: 5 },
    ]);
    expect(explainItemBonusParts([luckstone, gloves], pickSkillBonus("STEALTH"))).toEqual([{ label: "Stone of Good Luck (Luckstone)", value: 1 }]);
    expect(explainItemBonusParts([gloves], pickCheckBonus)).toEqual([]);
  });

  it("ряткидок окремої характеристики не діє на інші", () => {
    const bonus = { name: "Амулет", effects: [{ kind: "SAVE_BONUS" as const, bonus: 2, ability: "WIS" as const }] };
    expect(explainItemBonusParts([bonus], pickSaveBonus("WIS"))).toEqual([{ label: "Амулет", value: 2 }]);
    expect(explainItemBonusParts([bonus], pickSaveBonus("DEX"))).toEqual([]);
    expect(explainItemBonusParts([luckstone], pickSaveBonus("DEX"))).toEqual([{ label: "Stone of Good Luck (Luckstone)", value: 1 }]);
  });

  it("КБ наручів зникає з обладунком або щитом", () => {
    const bracers = activate("Bracers of Defense");
    expect(explainItemBonusParts([bracers], pickArmorClassBonus(false))).toEqual([{ label: "Bracers of Defense", value: 2 }]);
    expect(explainItemBonusParts([bracers], pickArmorClassBonus(true))).toEqual([]);
    expect(explainItemBonusParts([activate("Armor +2")], pickArmorClassBonus(true))).toEqual([{ label: "Armor +2", value: 2 }]);
  });

  it("майстерність, заклинання й дальня шкода", () => {
    expect(explainItemBonusParts([activate("Ioun Stone (Mastery)")], pickProficiencyBonus)).toEqual([{ label: "Ioun Stone (Mastery)", value: 1 }]);
    const rod = activate("Rod of the Pact Keeper +2");
    expect(explainItemBonusParts([rod], pickSpellAttackBonus)).toEqual([{ label: "Rod of the Pact Keeper +2", value: 2 }]);
    expect(explainItemBonusParts([rod], pickSpellDcBonus)).toEqual([{ label: "Rod of the Pact Keeper +2", value: 2 }]);
    expect(explainItemBonusParts([activate("Wand of the War Mage +1")], pickSpellDcBonus)).toEqual([]);
    expect(explainItemBonusParts([activate("Bracers of Archery")], pickRangedDamageBonus)).toEqual([{ label: "Bracers of Archery", value: 2 }]);
  });
});

describe("рух, зір і шкода", () => {
  it("швидкість «як ходьба» і найбільша з кількох", () => {
    expect(findItemMovementSpeeds([activate("Winged Boots"), activate("Ring of Swimming"), activate("Mariner's Armor")], 30)).toEqual({ FLY: 30, SWIM: 40 });
    expect(findItemMovementSpeeds([activate("Ring of Swimming"), activate("Mariner's Armor")], 45)).toEqual({ SWIM: 45 });
    expect(findItemMovementSpeeds([], 30)).toEqual({});
  });

  it("окуляри додають до наявного темнозору або дають 60", () => {
    expect(findItemDarkvisionRange([activate("Goggles of Night")], 60)).toBe(120);
    expect(findItemDarkvisionRange([activate("Goggles of Night")], null)).toBe(60);
    expect(findItemDarkvisionRange([activate("Belt of Dwarvenkind")], null)).toBe(60);
    expect(findItemDarkvisionRange([activate("Belt of Dwarvenkind")], 120)).toBe(120);
    expect(findItemDarkvisionRange([], null)).toBeNull();
  });

  it("опори й імунітети з предметів", () => {
    const items = [activate("Ring of Warmth"), activate("Efreeti Chain"), activate("Ring of Warmth", "RULES_2024")];
    expect(collectItemDamageTypes(items, "RESISTANCE")).toEqual(["COLD"]);
    expect(collectItemDamageTypes(items, "IMMUNITY")).toEqual(["FIRE"]);
  });
});
