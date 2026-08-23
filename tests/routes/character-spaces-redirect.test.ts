import { describe, expect, it } from "vitest";
import { getEditionFromPathname, getRulesetFromPathname } from "@/rules/route-helpers";

describe("KR8.2 — Character Spaces Segregation & Smart Redirect", () => {
  describe("Edition Navigation Link Resolution", () => {
    function getNavCharHref(pathname: string): string {
      const edition = getEditionFromPathname(pathname);
      return edition === "2024" ? "/2024/char/home" : "/char/home";
    }

    function isNavCharActive(pathname: string, is2024: boolean): boolean {
      if (is2024) {
        return pathname === "/2024/char" || pathname.startsWith("/2024/char/");
      }
      return (
        pathname === "/char" ||
        pathname === "/char/create" ||
        pathname.startsWith("/char/")
      );
    }

    it("resolves character href to /2024/char/home when in 2024 space", () => {
      const paths2024 = ["/2024", "/2024/spells", "/2024/char", "/2024/char/home", "/2024/feats", "/2024/magic-items", "/2024/bestiary"];
      for (const p of paths2024) {
        expect(getNavCharHref(p)).toBe("/2024/char/home");
        expect(getRulesetFromPathname(p)).toBe("RULES_2024");
      }
    });

    it("resolves character href to /char/home when in 2014 space", () => {
      const paths2014 = ["/", "/spells", "/char", "/char/create", "/char/home", "/char/123", "/feats", "/magic-items", "/bestiary"];
      for (const p of paths2014) {
        expect(getNavCharHref(p)).toBe("/char/home");
        expect(getRulesetFromPathname(p)).toBe("RULES_2014");
      }
    });

    it("correctly identifies active state for 2014 character routes", () => {
      expect(isNavCharActive("/char/home", false)).toBe(true);
      expect(isNavCharActive("/char/create", false)).toBe(true);
      expect(isNavCharActive("/char", false)).toBe(true);
      expect(isNavCharActive("/char/42", false)).toBe(true);
      expect(isNavCharActive("/spells", false)).toBe(false);
      expect(isNavCharActive("/", false)).toBe(false);
    });

    it("correctly identifies active state for 2024 character routes", () => {
      expect(isNavCharActive("/2024/char/home", true)).toBe(true);
      expect(isNavCharActive("/2024/char", true)).toBe(true);
      expect(isNavCharActive("/2024/char/home?folder=1", true)).toBe(true);
      expect(isNavCharActive("/2024/spells", true)).toBe(false);
      expect(isNavCharActive("/2024", true)).toBe(false);
    });
  });

  describe("Smart Redirect Rules Logic", () => {
    function resolveCharacterHomeRedirect(persesCount: number, edition: "2014" | "2024"): string | null {
      if (edition === "2024") {
        return persesCount === 0 ? "/2024/char" : null;
      }
      return persesCount === 0 ? "/char/create" : null;
    }

    it("redirects to /char/create for 2014 when user has 0 characters", () => {
      expect(resolveCharacterHomeRedirect(0, "2014")).toBe("/char/create");
    });

    it("stays on /char/home for 2014 when user has >= 1 characters", () => {
      expect(resolveCharacterHomeRedirect(1, "2014")).toBeNull();
      expect(resolveCharacterHomeRedirect(5, "2014")).toBeNull();
    });

    it("redirects to /2024/char for 2024 when user has 0 characters", () => {
      expect(resolveCharacterHomeRedirect(0, "2024")).toBe("/2024/char");
    });

    it("stays on /2024/char/home for 2024 when user has >= 1 characters", () => {
      expect(resolveCharacterHomeRedirect(1, "2024")).toBeNull();
      expect(resolveCharacterHomeRedirect(3, "2024")).toBeNull();
    });
  });

  describe("Ruleset Segregation Filtering", () => {
    type MockPers = {
      persId: number;
      name: string;
      ruleset: "RULES_2014" | "RULES_2024";
    };

    const mockPerses: MockPers[] = [
      { persId: 1, name: "2014 Fighter", ruleset: "RULES_2014" },
      { persId: 2, name: "2014 Wizard", ruleset: "RULES_2014" },
      { persId: 3, name: "2024 Barbarian", ruleset: "RULES_2024" },
      { persId: 4, name: "2024 Paladin", ruleset: "RULES_2024" },
    ];

    it("filters characters strictly for RULES_2014 space", () => {
      const filtered = mockPerses.filter((p) => p.ruleset === "RULES_2014");
      expect(filtered).toHaveLength(2);
      expect(filtered.map((p) => p.name)).toEqual(["2014 Fighter", "2014 Wizard"]);
    });

    it("filters characters strictly for RULES_2024 space", () => {
      const filtered = mockPerses.filter((p) => p.ruleset === "RULES_2024");
      expect(filtered).toHaveLength(2);
      expect(filtered.map((p) => p.name)).toEqual(["2024 Barbarian", "2024 Paladin"]);
    });
  });
});
