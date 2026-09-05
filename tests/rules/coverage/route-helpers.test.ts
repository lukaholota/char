import { describe, expect, it } from "vitest";
import {
  getEditionFromPathname,
  getRulesetFromPathname,
  getTargetEditionPath,
  get2014FallbackPath,
  canAccess2024Route,
  resolveLegacyCreatorRedirect,
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
    expect(getTargetEditionPath("/2024/char", "2014")).toBe("/char/create");
    expect(getTargetEditionPath("/2024/", "2014")).toBe("/");
    expect(getTargetEditionPath("/other-route", "2014")).toBe("/other-route");
  });

  it("returns correct fallback path", () => {
    expect(get2014FallbackPath("/2024/magic-items")).toBe("/magic-items");
  });

  it("конструктор має одну адресу на редакцію: /char/create ↔ /2024/char", () => {
    expect(getTargetEditionPath("/char/create", "2024")).toBe("/2024/char");
    expect(getTargetEditionPath("/2024/char", "2014")).toBe("/char/create");
    expect(get2014FallbackPath("/2024/char")).toBe("/char/create");
    expect(getTargetEditionPath("/char/create", "2014")).toBe("/char/create");
  });

  it("старий /char веде на /char/create і не чіпає решту маршрутів", () => {
    expect(resolveLegacyCreatorRedirect("/char")).toBe("/char/create");
    expect(resolveLegacyCreatorRedirect("/no-ai/char")).toBe("/no-ai/char/create");
    expect(resolveLegacyCreatorRedirect("/char/create")).toBeNull();
    expect(resolveLegacyCreatorRedirect("/char/home")).toBeNull();
    expect(resolveLegacyCreatorRedirect("/char/123")).toBeNull();
    expect(resolveLegacyCreatorRedirect("/2024/char")).toBeNull();
    expect(resolveLegacyCreatorRedirect("/chart")).toBeNull();
  });

  it("checks canAccess2024Route", () => {
    expect(canAccess2024Route()).toBe(true);
  });
});
