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
import { findHandwrittenArticles, RULE_ARTICLES_2024, RULE_CATEGORIES } from "@/lib/rulesData";
import { getBeyondSrdArticlesByRuleset } from "@/lib/rulesBeyondSrdData";
import dictionary from "@/lib/refs/dictionary.json";
import slugsBeforeChapters from "./fixtures/rules-2024-slugs-before-kr20.3.json";

const EXPECTED_ARTICLES = 286;
const EXPECTED_SUBSECTIONS = 526;
const EXPECTED_PER_SOURCE = {
  "playing-the-game": 48,
  "rules-glossary": 155,
  "gameplay-toolbox": 44,
  "character-creation": 21,
  "character-origins": 4,
  equipment: 14,
};
const EXPECTED_PER_CATEGORY = {
  combat: 73,
  adventuring: 63,
  abilities: 56,
  spellcasting: 19,
  conditions: 16,
  equipment: 13,
  gamemaster: 46,
};

/// Спорядження прийшло з KR20.7 англійською й перекладене в KR20.8 — винятків більше немає.
const EQUIPMENT_FILE = "equipment.md";

const imported = getImportedRuleArticles2024();
const fromEquipmentFile = imported.filter(
  (article) => "file" in article.provenance && article.provenance.file === EQUIPMENT_FILE
);
const translated = imported;
const CYRILLIC = /[а-яіїєґ]/i;

describe("KR12.6 — імпорт правил 2024 з SRD у довідник", () => {
  describe("Парсер", () => {
    it("розкладає шість файлів SRD у 286 статей", () => {
      const parsed = parseRules2024();
      expect(parsed.length).toBe(EXPECTED_ARTICLES);
      expect(parsed.reduce((sum, article) => sum + article.subsections.length, 0)).toBe(EXPECTED_SUBSECTIONS);

      for (const [source, count] of Object.entries(EXPECTED_PER_SOURCE)) {
        expect(parsed.filter((article) => article.source === source).length, source).toBe(count);
      }
    });

    it("не зрушив жодного слага й жодного якоря, які вже опубліковані", () => {
      const parsed = parseRules2024({
        reservedSlugs: findHandwrittenArticles("RULES_2024").map((article) => article.slug),
      });
      const slugs = parsed.map((article) => article.slug);
      const subsectionIds = parsed.flatMap((article) => article.subsections.map((subsection) => subsection.id));

      expect(slugs.slice(0, slugsBeforeChapters.slugs.length)).toEqual(slugsBeforeChapters.slugs);
      expect(subsectionIds.slice(0, slugsBeforeChapters.subsectionIds.length)).toEqual(
        slugsBeforeChapters.subsectionIds
      );
    });

    it("не тягне в довідник каталог видів і передісторій", () => {
      const parsed = parseRules2024();
      const titles = parsed.map((article) => article.engTitle);

      expect(titles).not.toContain("Species Descriptions");
      expect(titles).not.toContain("Background Descriptions");
      for (const catalogEntry of ["Dragonborn", "Tiefling", "Acolyte", "Soldier"]) {
        expect(titles, catalogEntry).not.toContain(catalogEntry);
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
      const handwritten = new Set(findHandwrittenArticles("RULES_2024").map((article) => article.slug));
      const parsed = parseRules2024({ reservedSlugs: [...handwritten] });
      for (const article of parsed) {
        expect(handwritten.has(article.slug)).toBe(false);
      }
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
        expect(article.ruleset).toBe("RULES_2024");
        expect(article.subsections.length).toBeGreaterThan(0);

        for (const subsection of article.subsections) {
          expect(subsection.title.trim().length).toBeGreaterThan(0);
          expect(subsection.content.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it("перекладений українською, без англійських залишків у назвах", () => {
      const untranslated = translated.filter((article) => !article.isTranslated);
      expect(untranslated.map((article) => article.id)).toEqual([]);

      for (const article of translated) {
        expect(article.title, `стаття ${article.id}`).toMatch(CYRILLIC);
        for (const subsection of article.subsections) {
          expect(subsection.content, `підрозділ ${subsection.id}`).toMatch(CYRILLIC);
        }
      }
    });

    it("не лишає жодної статті без перекладу, разом зі спорядженням із KR20.8", () => {
      expect(imported.filter((article) => !article.isTranslated).map((article) => article.id)).toEqual([]);
      expect(fromEquipmentFile.length).toBe(EXPECTED_PER_SOURCE.equipment);
    });

    it("додає до рукописних статей 2024, які пережили зведення дублів", () => {
      const all = getAllRuleArticles2024();
      /// KR23.4 додав главі 1–3 XDMG поза SRD у той самий список — інакше тут порахувалося б
      /// без 32 нових статей.
      expect(all.length).toBe(
        findHandwrittenArticles("RULES_2024").length +
          EXPECTED_ARTICLES +
          getBeyondSrdArticlesByRuleset("RULES_2024").length
      );
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
