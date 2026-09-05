import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { parseRules2014 } from "../../scripts/srd/parse-rules-2014";
import { SRD_2014_COMMIT, SRD_2014_REPO } from "../../scripts/srd/2014-srd-source";
import {
  getAllRuleArticles2014,
  getImportedRuleArticles2014,
  getRuleArticle2014BySlug,
  SRD_5_1_ATTRIBUTION,
} from "@/lib/rules2014Data";
import { findHandwrittenArticles, RULE_ARTICLES_2014, RULE_CATEGORIES } from "@/lib/rulesData";
import { isFromSrd } from "@/lib/rulesProvenance";
import { getBeyondSrdArticlesByRuleset } from "@/lib/rulesBeyondSrdData";
import oracle from "./fixtures/5e-bits-rule-sections-2014.json";

const EXPECTED_ARTICLES = 53;
const EXPECTED_SUBSECTIONS = 173;
const EXPECTED_PER_CATEGORY = {
  combat: 7,
  adventuring: 5,
  abilities: 13,
  spellcasting: 8,
  conditions: 1,
  equipment: 7,
  gamemaster: 12,
};

/// Той самий розділ, названий інакше: ліворуч слаг оракула, праворуч наш.
/// Розбіжності зафіксовані розвідкою KR12.7 і не мають рости.
const ORACLE_SLUG_ALIASES: Record<string, string> = {
  "the-order-of-combat": "order-of-combat",
  "standard-exchange-rates": "coinage",
  "sentient-magic-items": "sentient-magic",
  "fantasy-historical-pantheons": "pantheons",
  "the-planes-of-existence": "planes",
};

const imported = getImportedRuleArticles2014();

describe("KR20.1 — імпорт правил 2014 з SRD 5.1 у довідник", () => {
  describe("Парсер", () => {
    it("розкладає 31 файл SRD 5.1 у 53 статті і 173 підрозділи", () => {
      const parsed = parseRules2014();
      expect(parsed.length).toBe(EXPECTED_ARTICLES);
      expect(parsed.reduce((sum, article) => sum + article.subsections.length, 0)).toBe(EXPECTED_SUBSECTIONS);
    });

    it("дає кожній статті унікальний slug і жодного порожнього тіла", () => {
      const parsed = parseRules2014();
      const slugs = parsed.map((article) => article.slug);
      expect(new Set(slugs).size).toBe(slugs.length);

      for (const article of parsed) {
        expect(article.subsections.length).toBeGreaterThan(0);
        const subsectionIds = article.subsections.map((subsection) => subsection.id);
        expect(new Set(subsectionIds).size).toBe(subsectionIds.length);
        for (const subsection of article.subsections) {
          expect(subsection.engContent.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it("не перетинається slug'ами з рукописними статтями 2014", () => {
      const handwritten = new Set(findHandwrittenArticles("RULES_2014").map((article) => article.slug));
      const parsed = parseRules2014({ reservedSlugs: [...handwritten] });
      for (const article of parsed) {
        expect(handwritten.has(article.slug)).toBe(false);
      }
    });

    it("лагодить дефекти апстріму: appendix ##, мʼякі переноси, збите тире", () => {
      const body = parseRules2014()
        .flatMap((article) => article.subsections.map((subsection) => subsection.engContent))
        .join("\n");

      expect(body).not.toContain("appendix ##");
      expect(body).not.toMatch(/[­​‐‑̶]/);
      expect(body).toContain("appendix A");
    });
  });

  describe("Звірка з незалежним оракулом 5e-bits", () => {
    it("містить усі 33 правилові секції dnd5eapi", () => {
      const parsed = parseRules2014();
      const slugs = new Set<string>();
      for (const article of parsed) {
        slugs.add(article.slug);
        for (const subsection of article.subsections) slugs.add(subsection.id.split("--")[1]);
      }

      const missing = oracle.sections
        .map((section) => ORACLE_SLUG_ALIASES[section.index] ?? section.index)
        .filter((slug) => !slugs.has(slug));

      expect(missing).toEqual([]);
      expect(oracle.sections.length).toBe(33);
    });

    it("не накопичує нових розбіжностей у назвах", () => {
      expect(Object.keys(ORACLE_SLUG_ALIASES).length).toBe(5);
    });
  });

  describe("Згенерований каталог", () => {
    it("містить усі статті, розкладені по семи категоріях довідника", () => {
      expect(imported.length).toBe(EXPECTED_ARTICLES);

      const categoryKeys = RULE_CATEGORIES.map((category) => category.key);
      const counted = Object.fromEntries(
        categoryKeys.map((key) => [key, imported.filter((article) => article.category === key).length])
      );
      expect(counted).toEqual(EXPECTED_PER_CATEGORY);
    });

    it("не має порожніх тіл, назв і підсумків", () => {
      for (const article of imported) {
        expect(article.title.trim().length).toBeGreaterThan(0);
        expect(article.summary.trim().length).toBeGreaterThan(0);
        expect(article.ruleset).toBe("RULES_2014");
        expect(article.subsections.length).toBeGreaterThan(0);

        for (const subsection of article.subsections) {
          expect(subsection.title.trim().length).toBeGreaterThan(0);
          expect(subsection.content.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it("додає до рукописних статей 2014, які пережили зведення дублів", () => {
      const all = getAllRuleArticles2014();
      expect(all.length).toBe(
        findHandwrittenArticles("RULES_2014").length +
          EXPECTED_ARTICLES +
          getBeyondSrdArticlesByRuleset("RULES_2014").length
      );
      expect(all.some((article) => article.slug === "reactions")).toBe(true);
    });

    it("веде статті, яких власник не знаходив у пошуку 2014", () => {
      for (const engTitle of ["Reactions", "Mounted Combat", "Actions in Combat", "Underwater Combat"]) {
        const article = imported.find((candidate) => candidate.engTitle === engTitle);
        expect(article, engTitle).toBeDefined();
        expect(article?.subsections.length).toBeGreaterThan(0);
        for (const subsection of article!.subsections) {
          expect(subsection.id.startsWith(`${article!.slug}--`), subsection.id).toBe(true);
        }
        expect(getRuleArticle2014BySlug(article!.category, article!.slug)?.id).toBe(article!.id);
      }
    });

    it("після KR20.4 не мусить відступати з суфіксом — поглинуті рукописні звільнили слаги", () => {
      const handwritten = new Set(findHandwrittenArticles("RULES_2014").map((article) => article.slug));
      expect(imported.filter((article) => article.slug.endsWith("-rule"))).toEqual([]);

      for (const article of imported) {
        expect(handwritten.has(article.slug), article.slug).toBe(false);
      }
    });
  });

  describe("Походження і атрибуція CC-BY-4.0", () => {
    it("кожна стаття несе вид, репозиторій, коміт і файл джерела", () => {
      for (const article of imported) {
        expect(article.provenance.kind).toBe("srd-5.1");
        expect(isFromSrd(article.provenance)).toBe(true);
        if (article.provenance.kind !== "srd-5.1") throw new Error("очікували SRD 5.1");
        expect(article.provenance.repo).toBe(SRD_2014_REPO);
        expect(article.provenance.commit).toBe(SRD_2014_COMMIT);
        expect(article.provenance.file).toMatch(/\.md$/);
        expect(article.provenance.url).toContain(SRD_2014_COMMIT);
      }
    });

    it("названа в шарі даних", () => {
      expect(SRD_5_1_ATTRIBUTION.licenseName).toBe("CC BY 4.0");
      expect(SRD_5_1_ATTRIBUTION.licenseUrl).toContain("creativecommons.org");
      expect(SRD_5_1_ATTRIBUTION.sourceName).toBe("SRD 5.1");
      expect(SRD_5_1_ATTRIBUTION.text).toContain("5.1");
    });

    it("виведена на обох сторінках довідника 2014", () => {
      for (const page of ["src/app/rules/page.tsx", "src/app/rules/[category]/page.tsx"]) {
        const source = readFileSync(join(process.cwd(), page), "utf-8");
        expect(source, page).toContain("SRD_5_1_ATTRIBUTION");
      }
    });
  });
});
