import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { parseRules2024 } from "../../scripts/srd/parse-rules";
import {
  getAllRuleArticles2024,
  getImportedRuleArticles2024,
  getRuleArticle2024BySlug,
  SRD_2024_ATTRIBUTION,
} from "@/lib/rules2024Data";
import { RULE_ARTICLES_2024, RULE_CATEGORIES } from "@/lib/rulesData";
import dictionary from "@/lib/refs/dictionary.json";

const EXPECTED_ARTICLES = 203;
const EXPECTED_PER_SOURCE = { "playing-the-game": 48, "rules-glossary": 155 };
const EXPECTED_PER_CATEGORY = {
  combat: 73,
  adventuring: 47,
  abilities: 32,
  spellcasting: 19,
  conditions: 16,
  gamemaster: 16,
};

const imported = getImportedRuleArticles2024();
const CYRILLIC = /[а-яіїєґ]/i;

describe("KR12.6 — імпорт правил 2024 з SRD у довідник", () => {
  describe("Парсер", () => {
    it("розкладає обидва файли SRD у 203 статті", () => {
      const parsed = parseRules2024();
      expect(parsed.length).toBe(EXPECTED_ARTICLES);

      for (const [source, count] of Object.entries(EXPECTED_PER_SOURCE)) {
        expect(parsed.filter((article) => article.source === source).length).toBe(count);
      }
    });

    it("дає кожній статті унікальний slug і жодного порожнього тіла", () => {
      const parsed = parseRules2024();
      const slugs = parsed.map((article) => article.slug);
      expect(new Set(slugs).size).toBe(slugs.length);

      for (const article of parsed) {
        expect(article.subsections.length).toBeGreaterThan(0);
        for (const subsection of article.subsections) {
          expect(subsection.engContent.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it("не перетинається slug'ами з рукописними статтями 2024", () => {
      const handwritten = new Set(RULE_ARTICLES_2024.map((article) => article.slug));
      const parsed = parseRules2024({ reservedSlugs: [...handwritten] });
      for (const article of parsed) {
        expect(handwritten.has(article.slug)).toBe(false);
      }
    });
  });

  describe("Згенерований каталог", () => {
    it("містить усі статті, розкладені по шести наявних категоріях", () => {
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
        expect(article.ruleset).toBe("RULES_2024");
        expect(article.subsections.length).toBeGreaterThan(0);

        for (const subsection of article.subsections) {
          expect(subsection.title.trim().length).toBeGreaterThan(0);
          expect(subsection.content.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it("перекладений українською, без англійських залишків у назвах", () => {
      const untranslated = imported.filter((article) => !article.isTranslated);
      expect(untranslated.map((article) => article.id)).toEqual([]);

      for (const article of imported) {
        expect(article.title, `стаття ${article.id}`).toMatch(CYRILLIC);
        for (const subsection of article.subsections) {
          expect(subsection.content, `підрозділ ${subsection.id}`).toMatch(CYRILLIC);
        }
      }
    });

    it("додає до наявних рукописних статей 2024, а не заміняє їх", () => {
      const all = getAllRuleArticles2024();
      expect(all.length).toBe(RULE_ARTICLES_2024.length + EXPECTED_ARTICLES);
      expect(all.some((article) => article.slug === "actions-in-combat")).toBe(true);
    });
  });

  describe("Те, чого власник не знаходив у пошуку", () => {
    const wanted = [
      { category: "combat", slug: "bonus-action", title: dictionary.DND_DICTIONARY.rules.bonusAction },
      { category: "combat", slug: "reaction", title: dictionary.DND_DICTIONARY.rules.reaction },
      { category: "combat", slug: "mounted-combat", title: null },
    ] as const;

    for (const { category, slug, title } of wanted) {
      it(`«${slug}» є в довіднику 2024 і має якір`, () => {
        const article = getRuleArticle2024BySlug(category, slug);
        expect(article).toBeDefined();
        expect(article?.subsections[0]?.id).toContain(slug);
        if (title) expect(article?.title).toBe(title);
      });
    }
  });

  describe("Терміни збігаються з уже вжитими у фічах", () => {
    const body = imported
      .flatMap((article) => [article.title, article.summary, ...article.subsections.map((s) => s.content)])
      .join("\n");

    it("вживає назви станів зі словника", () => {
      const conditions = dictionary.DND_DICTIONARY.conditions;
      for (const name of [conditions.grappled, conditions.prone, conditions.incapacitated, conditions.frightened]) {
        expect(body).toContain(name);
      }
    });

    it("не вводить паралельних назв для дій і станів", () => {
      const forbidden = [
        /додаткова\s+дія/i,
        /додаткову\s+дію/i,
        /зачарован/i,
        /ошелешен/i,
        /спасброс/i,
        /бонус-екшн/i,
      ];
      for (const pattern of forbidden) {
        expect(body, `заборонений варіант ${pattern}`).not.toMatch(pattern);
      }
    });

    it("вживає ті самі форми дій, що й фічі 2024", () => {
      expect(body).toContain(dictionary.DND_DICTIONARY.rules.bonusAction);
      expect(body).toContain(dictionary.DND_DICTIONARY.rules.reaction);
      expect(body).toContain(dictionary.DND_DICTIONARY.combatActions.dash);
      expect(body).toContain(dictionary.DND_DICTIONARY.combatActions.disengage);
      expect(body).toContain(dictionary.DND_DICTIONARY.rules2024.coreConceptTerms.magicAction);
      expect(body).toContain(dictionary.DND_DICTIONARY.rules2024.coreConceptTerms.d20Test);
    });
  });

  describe("Атрибуція CC-BY-4.0", () => {
    it("названа в шарі даних", () => {
      expect(SRD_2024_ATTRIBUTION.licenseName).toBe("CC BY 4.0");
      expect(SRD_2024_ATTRIBUTION.licenseUrl).toContain("creativecommons.org");
      expect(SRD_2024_ATTRIBUTION.sourceName).toBe("SRD 5.2.1");
      expect(SRD_2024_ATTRIBUTION.text).toContain("5.2.1");
    });

    it("виведена на обох сторінках довідника 2024", () => {
      const pages = ["src/app/2024/rules/page.tsx", "src/app/2024/rules/[category]/page.tsx"];
      for (const page of pages) {
        const source = readFileSync(join(process.cwd(), page), "utf-8");
        expect(source, page).toContain("SRD_2024_ATTRIBUTION");
      }
    });
  });
});
