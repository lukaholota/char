import { expect, it } from "vitest";
import { findSubclassSource } from "../../scripts/generate-classes";

it("підклас отримує свою книгу, а не книгу батьківського класу", () => {
  expect(findSubclassSource("ARTIFICER_2024", "ALCHEMIST", "RULES_2024")).toBe("EFA");
  expect(findSubclassSource("ARTIFICER_2024", "REANIMATOR", "RULES_2024")).toBe("RHW");
  expect(findSubclassSource("FIGHTER_2024", "CHAMPION", "RULES_2024")).toBe("PHB_2024");
  expect(findSubclassSource("ARTIFICER", "ALCHEMIST", "RULES_2014")).toBeNull();
  expect(() => findSubclassSource("ARTIFICER_2024", "UNKNOWN", "RULES_2024")).toThrow("No source");
});
