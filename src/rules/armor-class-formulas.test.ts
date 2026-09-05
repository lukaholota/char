import { describe, expect, it } from "vitest";
import { findAlternativeArmorClassFormulas } from "./armor-class-formulas";

describe("findAlternativeArmorClassFormulas", () => {
  it("Монах 2024 має одну формулу", () => {
    expect(findAlternativeArmorClassFormulas(["Monk: Unarmored Defense (2024)"])).toEqual([
      "UNARMORED_DEFENSE_MONK",
    ]);
  });

  it("Монах/Чародій має дві формули — приклад книги", () => {
    const monkSorcerer = ["Monk: Unarmored Defense (2024)", "Draconic Sorcery: Draconic Resilience (2024)"];

    expect(findAlternativeArmorClassFormulas(monkSorcerer)).toEqual([
      "UNARMORED_DEFENSE_MONK",
      "DRACONIC_RESILIENCE",
    ]);
  });

  it("клас без альтернативної формули не отримує жодної", () => {
    expect(findAlternativeArmorClassFormulas(["Sorcerer: Font of Magic (2024)"])).toEqual([]);
  });

  it("Захист без обладунків 2014 сюди не потрапляє — його рядок видає створення персонажа", () => {
    expect(findAlternativeArmorClassFormulas(["Unarmored Defense", "Barbarian Extra Attack"])).toEqual([]);
  });
});
