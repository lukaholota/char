import { describe, expect, it } from "vitest";
import {
  getEditionFromPathname,
  getRulesetFromPathname,
  getTargetEditionPath,
  get2014FallbackPath,
  canAccess2024Route,
} from "@/rules/route-helpers";
import { getAllSpells } from "@/lib/spellsData";
import { getAllFeats } from "@/lib/featsData";
import { getAllCreatures } from "@/lib/bestiaryData";

describe("KR7.2 / KR7.3 — Platform & Routing Segregation Architecture", () => {
  describe("Edition & Ruleset Resolution from Pathname", () => {
    it("resolves default 2014 routes to edition 2014 and RULES_2014", () => {
      const routes2014 = [
        "/",
        "/spells",
        "/spells/123",
        "/magic-items",
        "/magic-items/456",
        "/feats",
        "/bestiary",
        "/rules",
        "/rules/combat",
        "/char",
        "/char/create",
        "/char/home",
      ];

      for (const route of routes2014) {
        expect(getEditionFromPathname(route)).toBe("2014");
        expect(getRulesetFromPathname(route)).toBe("RULES_2014");
      }
    });

    it("resolves /2024 routes to edition 2024 and RULES_2024", () => {
      const routes2024 = [
        "/2024",
        "/2024/",
        "/2024/spells",
        "/2024/spells/123",
        "/2024/magic-items",
        "/2024/magic-items/456",
        "/2024/feats",
        "/2024/bestiary",
        "/2024/rules",
        "/2024/rules/combat",
        "/2024/char",
        "/2024/char/home",
      ];

      for (const route of routes2024) {
        expect(getEditionFromPathname(route)).toBe("2024");
        expect(getRulesetFromPathname(route)).toBe("RULES_2024");
      }
    });
  });

  describe("Target Edition Path Translation", () => {
    it("correctly translates 2014 paths to 2024 paths", () => {
      expect(getTargetEditionPath("/", "2024")).toBe("/2024");
      expect(getTargetEditionPath("/spells", "2024")).toBe("/2024/spells");
      expect(getTargetEditionPath("/spells/10", "2024")).toBe("/2024/spells/10");
      expect(getTargetEditionPath("/magic-items", "2024")).toBe("/2024/magic-items");
      expect(getTargetEditionPath("/feats", "2024")).toBe("/2024/feats");
      expect(getTargetEditionPath("/char", "2024")).toBe("/2024/char");
      expect(getTargetEditionPath("/char/create", "2024")).toBe("/2024/char");
      expect(getTargetEditionPath("/bestiary", "2024")).toBe("/2024/bestiary");
      expect(getTargetEditionPath("/rules", "2024")).toBe("/2024/rules");
      expect(getTargetEditionPath("/rules/combat", "2024")).toBe("/2024/rules/combat");
    });

    it("correctly translates 2024 paths to 2014 paths", () => {
      expect(getTargetEditionPath("/2024", "2014")).toBe("/");
      expect(getTargetEditionPath("/2024/", "2014")).toBe("/");
      expect(getTargetEditionPath("/2024/spells", "2014")).toBe("/spells");
      expect(getTargetEditionPath("/2024/spells/10", "2014")).toBe("/spells/10");
      expect(getTargetEditionPath("/2024/magic-items", "2014")).toBe("/magic-items");
      expect(getTargetEditionPath("/2024/feats", "2014")).toBe("/feats");
      expect(getTargetEditionPath("/2024/char", "2014")).toBe("/char/create");
      expect(getTargetEditionPath("/2024/bestiary", "2014")).toBe("/bestiary");
      expect(getTargetEditionPath("/2024/rules", "2014")).toBe("/rules");
      expect(getTargetEditionPath("/2024/rules/combat", "2014")).toBe("/rules/combat");
    });

    it("returns the exact same path if already in the target edition", () => {
      expect(getTargetEditionPath("/spells", "2014")).toBe("/spells");
      expect(getTargetEditionPath("/2024/spells", "2024")).toBe("/2024/spells");
      expect(getTargetEditionPath("/feats", "2014")).toBe("/feats");
      expect(getTargetEditionPath("/2024/feats", "2024")).toBe("/2024/feats");
      expect(getTargetEditionPath("/rules", "2014")).toBe("/rules");
      expect(getTargetEditionPath("/2024/rules", "2024")).toBe("/2024/rules");
    });

    it("computes the correct 2014 fallback path for unauthorized redirects", () => {
      expect(get2014FallbackPath("/2024")).toBe("/");
      expect(get2014FallbackPath("/2024/spells")).toBe("/spells");
      expect(get2014FallbackPath("/2024/char")).toBe("/char/create");
      expect(get2014FallbackPath("/2024/magic-items")).toBe("/magic-items");
      expect(get2014FallbackPath("/2024/feats")).toBe("/feats");
      expect(get2014FallbackPath("/2024/bestiary")).toBe("/bestiary");
      expect(get2014FallbackPath("/2024/rules")).toBe("/rules");
      expect(get2014FallbackPath("/2024/rules/combat")).toBe("/rules/combat");
    });
  });

  /// Передрелізний гейт знято 2026-08-28 — реформа вийшла назагал. Тест лишається
  /// зворотним: він ловить спробу знову звузити доступ мовчки, бо саме на цьому
  /// тримається статичність каталогів 2024 (без auth() немає динамічного рендеру).
  describe("Access Guard", () => {
    it("opens 2024 to everyone, including anonymous visitors", () => {
      expect(canAccess2024Route()).toBe(true);
    });
  });

  describe("Data Providers Edition Segregation", () => {
    it("serves 2014 spells by default and 2024 spells when requested", () => {
      const spells2014 = getAllSpells();
      const spells2024 = getAllSpells("RULES_2024");

      expect(spells2014.length).toBeGreaterThan(0);
      expect(spells2024.length).toBe(391);
      expect(spells2014.every((s) => s.ruleset === "RULES_2014")).toBe(true);
      expect(spells2024.every((s) => s.ruleset === "RULES_2024")).toBe(true);
    });

    it("serves 2014 feats by default and 2024 feats when requested", () => {
      const feats2014 = getAllFeats();
      const feats2024 = getAllFeats("RULES_2024");

      expect(feats2014.length).toBe(92);
      expect(feats2024.length).toBe(75);
      expect(feats2014.every((f) => f.ruleset === "RULES_2014")).toBe(true);
      expect(feats2024.every((f) => f.ruleset === "RULES_2024")).toBe(true);
    });

    it("serves creatures by edition", () => {
      const creatures2014 = getAllCreatures();
      const creatures2024 = getAllCreatures("RULES_2024");

      expect(creatures2014.length).toBeGreaterThan(0);
      expect(creatures2024.length).toBeGreaterThan(0);
      expect(creatures2014.every((c) => c.ruleset === "RULES_2014")).toBe(true);
      expect(creatures2024.every((c) => c.ruleset === "RULES_2024")).toBe(true);
    });
  });
});
