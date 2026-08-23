import { describe, expect, it } from "vitest";
import {
  getEditionFromPathname,
  getRulesetFromPathname,
  getTargetEditionPath,
  get2014FallbackPath,
  canAccess2024Route,
} from "@/rules/route-helpers";

describe("Coverage — route-helpers.ts", () => {
  it("resolves edition correctly", () => {
    expect(getEditionFromPathname("/2024")).toBe("2024");
    expect(getEditionFromPathname("/2024/")).toBe("2024");
    expect(getEditionFromPathname("/2024/spells")).toBe("2024");
    expect(getEditionFromPathname("/")).toBe("2014");
    expect(getEditionFromPathname("/spells")).toBe("2014");
  });

  it("resolves ruleset correctly", () => {
    expect(getRulesetFromPathname("/2024/char")).toBe("RULES_2024");
    expect(getRulesetFromPathname("/char")).toBe("RULES_2014");
  });

  it("translates paths correctly across all branches", () => {
    // Same edition
    expect(getTargetEditionPath("/spells", "2014")).toBe("/spells");
    expect(getTargetEditionPath("/2024/spells", "2024")).toBe("/2024/spells");

    // To 2024
    expect(getTargetEditionPath("/", "2024")).toBe("/2024");
    expect(getTargetEditionPath("/char", "2024")).toBe("/2024/char");

    // To 2014
    expect(getTargetEditionPath("/2024", "2014")).toBe("/");
    expect(getTargetEditionPath("/2024/", "2014")).toBe("/");
    expect(getTargetEditionPath("/2024/char", "2014")).toBe("/char");
    expect(getTargetEditionPath("/2024/", "2014")).toBe("/");
    expect(getTargetEditionPath("/other-route", "2014")).toBe("/other-route");
  });

  it("returns correct fallback path", () => {
    expect(get2014FallbackPath("/2024/magic-items")).toBe("/magic-items");
  });

  it("checks canAccess2024Route", () => {
    expect(canAccess2024Route({ email: "lukagolota1@gmail.com" })).toBe(true);
    expect(canAccess2024Route(null)).toBe(false);
  });
});
