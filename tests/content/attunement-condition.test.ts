import { describe, expect, it } from "vitest";
import items from "../../data/2024/normalized/magic-items.json";
import { translateAttunementCondition } from "@/lib/components/magicItems/attunement-condition";

describe("умова налаштування", () => {
  it("перекладає всі поточні умови 2024, не гублячи обмежень", () => {
    const conditions = [...new Set(items.flatMap((item) => item.attunementConditionEng ? [item.attunementConditionEng] : []))];
    expect(conditions.length).toBeGreaterThan(10);
    for (const condition of conditions) expect(translateAttunementCondition(condition), condition).toBeTruthy();
  });
  it("розрізняє порожню, невідому й класову умову", () => {
    expect(translateAttunementCondition(null)).toBeNull();
    expect(translateAttunementCondition("a Future Class")).toBeNull();
    expect(translateAttunementCondition("a Sorcerer, Warlock, or Wizard")).toBe("чародій або чорнокнижник або чарівник");
  });
});
