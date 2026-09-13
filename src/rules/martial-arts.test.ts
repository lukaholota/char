import { describe, expect, it } from "vitest";
import { isWornArmor } from "./armor";
import { canUseDexterousAttacks, findMartialArtsDamageDice, findMartialArtsDie, isMonkWeapon } from "./martial-arts";

const weapon = (name: string, weaponType: string, properties: string[] = [], isRanged = false) => ({
  name,
  weaponType,
  properties,
  isRanged,
});

describe("зброя монаха за редакцією", () => {
  it("посох — зброя монаха в обох редакціях", () => {
    const quarterstaff = weapon("QUARTERSTAFF", "SIMPLE_WEAPON", ["VERSATILE"]);
    expect(isMonkWeapon(quarterstaff, "RULES_2014")).toBe(true);
    expect(isMonkWeapon(quarterstaff, "RULES_2024")).toBe(true);
  });

  it("дворучна проста зброя — лише у 2024", () => {
    const greatclub = weapon("GREATCLUB", "SIMPLE_WEAPON", ["TWO_HANDED"]);
    expect(isMonkWeapon(greatclub, "RULES_2014")).toBe(false);
    expect(isMonkWeapon(greatclub, "RULES_2024")).toBe(true);
  });

  it("бойова легка: скімітар — лише у 2024, короткий меч — в обох", () => {
    const scimitar = weapon("SCIMITAR", "MARTIAL_WEAPON", ["FINESSE", "LIGHT"]);
    const shortsword = weapon("SHORTSWORD", "MARTIAL_WEAPON", ["FINESSE", "LIGHT"]);
    expect(isMonkWeapon(scimitar, "RULES_2014")).toBe(false);
    expect(isMonkWeapon(scimitar, "RULES_2024")).toBe(true);
    expect(isMonkWeapon(shortsword, "RULES_2014")).toBe(true);
  });

  it("бойова не легка й дальня зброя — не зброя монаха", () => {
    expect(isMonkWeapon(weapon("LONGSWORD", "MARTIAL_WEAPON", ["VERSATILE"]), "RULES_2024")).toBe(false);
    expect(isMonkWeapon(weapon("SHORTBOW", "SIMPLE_WEAPON", ["AMMUNITION", "TWO_HANDED"], true), "RULES_2024")).toBe(false);
  });

  it("беззбройний удар рахується як зброя монаха", () => {
    expect(isMonkWeapon(weapon("UNARMED_STRIKE", "SIMPLE_WEAPON"), "RULES_2014")).toBe(true);
  });
});

describe("Спритні атаки", () => {
  const monk = ["Monk: Martial Arts (2024)"];

  it("монах без обладунку й щита може бити від Спритності", () => {
    expect(canUseDexterousAttacks({ featureEngNames: monk, equippedArmorNames: ["UNARMORED_DEFENSE_MONK"], wearsShield: false })).toBe(true);
  });

  it("обладунок або щит вимикають перевагу", () => {
    expect(canUseDexterousAttacks({ featureEngNames: monk, equippedArmorNames: ["LEATHER"], wearsShield: false })).toBe(false);
    expect(canUseDexterousAttacks({ featureEngNames: monk, equippedArmorNames: [], wearsShield: true })).toBe(false);
  });

  it("без Бойових мистецтв перевагу не дає", () => {
    expect(canUseDexterousAttacks({ featureEngNames: ["Rogue: Sneak Attack (2024)"], equippedArmorNames: [], wearsShield: false })).toBe(false);
  });

  it("природний обладунок і формули КЗ — не обладунок", () => {
    expect(isWornArmor("NATURAL_ARMOR_13_DEX")).toBe(false);
    expect(isWornArmor("DRACONIC_RESILIENCE")).toBe(false);
    expect(isWornArmor("HOMEBREW")).toBe(true);
  });
});

describe("кубик Бойових мистецтв", () => {
  it.each([
    ["RULES_2014", 1, "1d4"],
    ["RULES_2014", 5, "1d6"],
    ["RULES_2014", 11, "1d8"],
    ["RULES_2014", 17, "1d10"],
    ["RULES_2024", 1, "1d6"],
    ["RULES_2024", 4, "1d6"],
    ["RULES_2024", 5, "1d8"],
    ["RULES_2024", 11, "1d10"],
    ["RULES_2024", 17, "1d12"],
  ] as const)("%s, Монах %i — %s", (ruleset, monkLevel, die) => {
    expect(findMartialArtsDie(ruleset, monkLevel)).toBe(die);
  });

  it("не монах кубика не має", () => {
    expect(findMartialArtsDie("RULES_2024", 0)).toBeNull();
  });
});

describe("кубик шкоди зброї монаха", () => {
  it("беззбройний удар «1» замінюється кубиком", () => {
    expect(findMartialArtsDamageDice("1", "1d8")).toBe("1d8");
  });

  it("посох 1к6 проти кубика 1d8 — кубик", () => {
    expect(findMartialArtsDamageDice("1к6", "1d8")).toBe("1d8");
  });

  it("кубик менший за зброю — лишається зброя", () => {
    expect(findMartialArtsDamageDice("1d8", "1d4")).toBe("1d8");
  });
});
