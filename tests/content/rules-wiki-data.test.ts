import { describe, expect, it } from "vitest";
import {
  getAllRuleCategories,
  getRuleCategory,
  getAllRuleArticles,
  getRuleArticlesByCategory,
  getRuleArticleBySlug,
  getAllConditions,
  getConditionById,
} from "@/lib/rulesData";
import dictionary from "@/lib/refs/dictionary.json";

describe("KR10.1 — D&D Rules Wiki / SRD Reference Data & Segregation", () => {
  describe("Rule Categories", () => {
    it("provides all 6 core SRD rule categories", () => {
      const categories = getAllRuleCategories();
      expect(categories.length).toBe(6);

      const keys = categories.map((c) => c.key);
      expect(keys).toContain("combat");
      expect(keys).toContain("spellcasting");
      expect(keys).toContain("abilities");
      expect(keys).toContain("conditions");
      expect(keys).toContain("adventuring");
      expect(keys).toContain("gamemaster");
    });

    it("retrieves each category by key with metadata", () => {
      const combat = getRuleCategory("combat");
      expect(combat).toBeDefined();
      expect(combat?.title).toBe("Бій");
      expect(combat?.engTitle).toBe("Combat");

      const spellcasting = getRuleCategory("spellcasting");
      expect(spellcasting).toBeDefined();
      expect(spellcasting?.title).toBe("Магія та Чарування");

      const gamemaster = getRuleCategory("gamemaster");
      expect(gamemaster).toBeDefined();
      expect(gamemaster?.title).toBe("Правила Майстра");
    });
  });

  describe("Rule Articles (2014 & 2024)", () => {
    it("loads 2014 articles with all required categories populated", () => {
      const articles2014 = getAllRuleArticles("RULES_2014");
      expect(articles2014.length).toBeGreaterThanOrEqual(6);
      expect(articles2014.every((a) => a.ruleset === "RULES_2014")).toBe(true);

      const combatArticles = getRuleArticlesByCategory("combat", "RULES_2014");
      expect(combatArticles.length).toBeGreaterThan(0);
      expect(combatArticles.some((a) => a.slug === "actions-in-combat")).toBe(true);

      const spellArticles = getRuleArticlesByCategory("spellcasting", "RULES_2014");
      expect(spellArticles.length).toBeGreaterThan(0);
      expect(spellArticles.some((a) => a.slug === "rules-of-magic")).toBe(true);

      const gmArticles = getRuleArticlesByCategory("gamemaster", "RULES_2014");
      expect(gmArticles.length).toBe(8);
      const gmSlugs = gmArticles.map((a) => a.slug);
      expect(gmSlugs).toContain("diseases");
      expect(gmSlugs).toContain("madness");
      expect(gmSlugs).toContain("traps");
      expect(gmSlugs).toContain("poisons");
      expect(gmSlugs).toContain("objects");
      expect(gmSlugs).toContain("monster-rules");
      expect(gmSlugs).toContain("sentient-magic-items");
      expect(gmSlugs).toContain("magic-items-rules");
    });

    it("loads 2024 articles with PHB 2024 specific mechanics", () => {
      const articles2024 = getAllRuleArticles("RULES_2024");
      expect(articles2024.length).toBeGreaterThanOrEqual(6);
      expect(articles2024.every((a) => a.ruleset === "RULES_2024")).toBe(true);

      const combat2024 = getRuleArticleBySlug("combat", "actions-in-combat", "RULES_2024");
      expect(combat2024).toBeDefined();

      // Check 2024 specific actions exist in subsections
      const subTitles = combat2024?.subsections.map((s) => s.title) || [];
      expect(subTitles.some((t) => t.includes("Магічна дія") || t.includes("Magic Action"))).toBe(true);
      expect(subTitles.some((t) => t.includes("Вивчення") || t.includes("Study"))).toBe(true);
      expect(subTitles.some((t) => t.includes("Застосування") || t.includes("Utilize"))).toBe(true);
    });

    it("ensures articles have subsections with non-empty content", () => {
      const allArticles = [...getAllRuleArticles("RULES_2014"), ...getAllRuleArticles("RULES_2024")];
      for (const article of allArticles) {
        expect(article.subsections.length).toBeGreaterThan(0);
        for (const sub of article.subsections) {
          expect(sub.title.trim().length).toBeGreaterThan(0);
          expect(sub.content.trim().length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("Conditions Reference & Dictionary Alignment", () => {
    it("contains all 15 core conditions from dictionary.json for 2014", () => {
      const conditions2014 = getAllConditions("RULES_2014");
      expect(conditions2014.length).toBe(15);

      const dictConditions = dictionary.DND_DICTIONARY.conditions;
      expect(conditions2014.some((c) => c.name === dictConditions.blinded)).toBe(true);
      expect(conditions2014.some((c) => c.name === dictConditions.charmed)).toBe(true);
      expect(conditions2014.some((c) => c.name === dictConditions.deafened)).toBe(true);
      expect(conditions2014.some((c) => c.name === dictConditions.exhaustion)).toBe(true);
      expect(conditions2014.some((c) => c.name === dictConditions.frightened)).toBe(true);
      expect(conditions2014.some((c) => c.name === dictConditions.grappled)).toBe(true);
      expect(conditions2014.some((c) => c.name === dictConditions.incapacitated)).toBe(true);
      expect(conditions2014.some((c) => c.name === dictConditions.invisible)).toBe(true);
      expect(conditions2014.some((c) => c.name === dictConditions.paralyzed)).toBe(true);
      expect(conditions2014.some((c) => c.name === dictConditions.petrified)).toBe(true);
      expect(conditions2014.some((c) => c.name === dictConditions.poisoned)).toBe(true);
      expect(conditions2014.some((c) => c.name === dictConditions.prone)).toBe(true);
      expect(conditions2014.some((c) => c.name === dictConditions.restrained)).toBe(true);
      expect(conditions2014.some((c) => c.name === dictConditions.stunned)).toBe(true);
      expect(conditions2014.some((c) => c.name === dictConditions.unconscious)).toBe(true);
    });

    it("includes 2024 conditions (such as Bloodied) when RULES_2024 is requested", () => {
      const conditions2024 = getAllConditions("RULES_2024");
      expect(conditions2024.length).toBeGreaterThan(15);

      const bloodied = getConditionById("bloodied", "RULES_2024");
      expect(bloodied).toBeDefined();
      expect(bloodied?.name).toBe("Закривавлений");
      expect(bloodied?.engName).toBe("Bloodied");
    });
  });
});
