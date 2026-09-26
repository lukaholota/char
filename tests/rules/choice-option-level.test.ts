import { describe, expect, it } from "vitest";
import { isChoiceOptionLevelMet } from "@/rules/choice-option-level";

describe("O45 — рівнева передумова варіанта вибору", () => {
  it("Ефір (з 11) закритий на 10-му й відкритий на 11-му", () => {
    expect(isChoiceOptionLevelMet({ level: 11 }, 10)).toBe(false);
    expect(isChoiceOptionLevelMet({ level: 11 }, 11)).toBe(true);
  });

  it("варіант без передумови чи з передумовою без рівня — доступний", () => {
    expect(isChoiceOptionLevelMet(null, 1)).toBe(true);
    expect(isChoiceOptionLevelMet({ pact: "Pact of the Blade" }, 1)).toBe(true);
    expect(isChoiceOptionLevelMet([], 1)).toBe(true);
  });
});
