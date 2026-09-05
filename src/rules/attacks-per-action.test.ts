import { describe, expect, it } from "vitest";
import { findAttacksPerAction } from "./attacks-per-action";

describe("findAttacksPerAction", () => {
  it("без Додаткової атаки дає одну атаку", () => {
    expect(findAttacksPerAction("RULES_2024", ["Fighter: Second Wind (2024)"])).toBe(1);
  });

  it("Додаткова атака з двох класів дає дві атаки, не три", () => {
    const barbarianFighter = ["Barbarian: Extra Attack (2024)", "Fighter: Extra Attack (2024)"];

    expect(findAttacksPerAction("RULES_2024", barbarianFighter)).toBe(2);
  });

  it("Дві додаткові атаки воїна дають три, і Додаткова атака іншого класу їх не збільшує", () => {
    const fighter11Barbarian5 = [
      "Fighter: Extra Attack (2024)",
      "Fighter: Two Extra Attacks (2024)",
      "Barbarian: Extra Attack (2024)",
    ];

    expect(findAttacksPerAction("RULES_2024", fighter11Barbarian5)).toBe(3);
  });

  it("Три додаткові атаки воїна 20-го рівня дають чотири", () => {
    expect(findAttacksPerAction("RULES_2024", ["Fighter: Three Extra Attacks (2024)"])).toBe(4);
  });

  it("Додаткова атака підкласу рахується як класова", () => {
    expect(findAttacksPerAction("RULES_2024", ["College of Valor: Extra Attack (2024)"])).toBe(2);
  });

  it("для 2014 числа немає: дані тієї редакції не розрізняють підвищення воїна", () => {
    expect(findAttacksPerAction("RULES_2014", ["Extra Attack", "Barbarian Extra Attack"])).toBeNull();
  });
});
