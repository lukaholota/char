import { describe, expect, it } from "vitest";
import { readRuleset } from "@/rules/ruleset";

describe("редакція правил", () => {
  it("без явної 2024 бере 2014", () => {
    expect(readRuleset("RULES_2024")).toBe("RULES_2024");
    expect(readRuleset("RULES_2014")).toBe("RULES_2014");
    expect(readRuleset(null)).toBe("RULES_2014");
    expect(readRuleset(undefined)).toBe("RULES_2014");
  });
});
