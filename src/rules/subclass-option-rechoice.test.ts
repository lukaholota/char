import { describe, expect, it } from "vitest";
import { findRechoosableSubclassOptionGroup } from "./subclass-option-rechoice";

describe("findRechoosableSubclassOptionGroup", () => {
  it("Коло землі 2024 перевибирається, і підказка називає довгий відпочинок", () => {
    const group = findRechoosableSubclassOptionGroup("Коло землі", "RULES_2024");
    expect(group?.actionLabel).toBe("Змінити землю");
    expect(group?.hint).toContain("довгого відпочинку");
  });

  it("та сама група в 2014 і чужа група — ні", () => {
    expect(findRechoosableSubclassOptionGroup("Коло землі", "RULES_2014")).toBeNull();
    expect(findRechoosableSubclassOptionGroup("Здобич мисливця", "RULES_2024")).toBeNull();
  });
});
