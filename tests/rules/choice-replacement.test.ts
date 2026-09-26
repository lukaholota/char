import { describe, expect, it } from "vitest";
import { findReplacedChoiceGroup, isReplacedGroupMatch } from "@/rules/choice-replacement";

describe("O45 — заміна варіанта вибору на підвищенні", () => {
  it("старі прапорці дають свої групи", () => {
    expect(findReplacedChoiceGroup({ replacesInvocation: true })).toBe("Потойбічні виклики");
    expect(findReplacedChoiceGroup({ replacesFightingStyle: true })).toBe("Бойовий стиль");
    expect(findReplacedChoiceGroup({ replacesManeuver: true })).toBe("Маневри майстра бою");
  });

  it("криваві прокляття й мутагени — через назву групи", () => {
    expect(findReplacedChoiceGroup({ replacesChoiceGroup: "Криваві прокляття" })).toBe("Криваві прокляття");
    expect(findReplacedChoiceGroup({ replacesChoiceGroup: "  " })).toBeNull();
    expect(findReplacedChoiceGroup({})).toBeNull();
  });

  it("бойовий стиль збігається з будь-якою назвою його групи, решта — точно", () => {
    expect(isReplacedGroupMatch("Бойовий стиль", "Fighting Style 2024")).toBe(true);
    expect(isReplacedGroupMatch("Криваві прокляття", "Криваві прокляття")).toBe(true);
    expect(isReplacedGroupMatch("Криваві прокляття", "Мутагени")).toBe(false);
  });
});
