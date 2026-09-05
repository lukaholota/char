import { describe, expect, it } from "vitest";

import {
  findCatalogHrefs,
  RULES_2014_CATALOG_PREFIX,
  RULES_2024_CATALOG_PREFIX,
} from "../../scripts/srd/catalog-table-links";
import { getImportedRuleArticles2014, getRuleArticles2014ByCategory } from "@/lib/rules2014Data";
import { getImportedRuleArticles2024, getRuleArticles2024ByCategory } from "@/lib/rules2024Data";
import { getRuleCategory } from "@/lib/rulesData";
import sitemap from "@/app/sitemap";
import { generateStaticParams as findRuleCategoryParams2014 } from "@/app/rules/[category]/page";
import { generateStaticParams as findRuleCategoryParams2024 } from "@/app/2024/rules/[category]/page";
import { ImportedRuleArticle } from "@/lib/rulesProvenance";

const EQUIPMENT_2014_SLUGS = [
  "armor",
  "weapons",
  "adventuring-gear",
  "tools",
  "mounts-and-vehicles",
  "trade-goods",
  "expenses",
  "selling-treasure",
];
const EXPECTED_2014_SUBSECTIONS = 18;
const EXPECTED_2024_ARTICLES = 14;
const EXPECTED_2024_SUBSECTIONS = 133;
/// 2024: 13 зі SRD equipment.md + 1 «Firearms and Explosives» поза SRD (KR23.4, глава 3 XDMG).
const EXPECTED_CATEGORY_ARTICLES = { 2014: 7, 2024: 14 };

const imported2014 = getImportedRuleArticles2014();
const imported2024 = getImportedRuleArticles2024();
const equipment2014 = imported2014.filter((article) => EQUIPMENT_2014_SLUGS.includes(article.slug));
const equipment2024 = imported2024.filter(
  (article) => "file" in article.provenance && article.provenance.file === "equipment.md"
);

/// Сім правил, яких у довіднику не було до KR20.7 — рядки таблиці «Підстава» в
/// docs/o20-rules-canon/kr20.7-srd-equipment.md. Проза українська з KR20.8, тому й проби такі.
const EXPECTED_RULES: { rule: string; probe: RegExp; in2014: string; in2024: string }[] = [
  {
    rule: "вдягання й знімання обладунку",
    probe: /вдягти\{\{don\}\}|вдягання/i,
    in2014: "armor--getting-into-and-out-of-armor",
    in2024: "armor--armor",
  },
  {
    rule: "перешкода на Непомітність у важкому обладунку",
    probe: /[Пп]ерешкоду на перевірки Спритності \(Непомітність\)/,
    in2014: "armor--armor",
    in2024: "armor--armor",
  },
  {
    rule: "властивості зброї",
    probe: /Боєприпас/,
    in2014: "weapons--weapon-properties",
    in2024: "weapons--properties",
  },
  {
    rule: "вантажопідйомність верхових тварин і транспорту",
    probe: /вантажопідйомност/i,
    in2014: "mounts-and-vehicles--mounts-and-vehicles",
    in2024: "mounts-and-vehicles--mounts-and-cargo",
  },
  {
    rule: "витрати на життя і спосіб життя",
    probe: /спосіб життя|способу життя/i,
    in2014: "expenses--lifestyle-expenses",
    in2024: "lifestyle-expenses--lifestyle-expenses",
  },
  {
    rule: "барда, сідла й транспорт",
    probe: /[Кк]інський обладунок/,
    in2014: "mounts-and-vehicles--mounts-and-vehicles",
    in2024: "mounts-and-vehicles--barding",
  },
  {
    rule: "використання інструментів і майстерність з ними",
    probe: /[Вв]олоді(ння|єте) інструмент/,
    in2014: "tools--tools",
    in2024: "tools--tool-proficiency",
  },
];

function findSubsection(articles: ImportedRuleArticle[], subsectionId: string) {
  return articles.flatMap((article) => article.subsections).find((subsection) => subsection.id === subsectionId);
}

function joinContent(articles: ImportedRuleArticle[]): string {
  return articles.flatMap((article) => article.subsections.map((subsection) => subsection.content)).join("\n");
}

describe("KR20.7 — спорядження зі SRD у довіднику обох редакцій", () => {
  describe("Корпус", () => {
    it("2014: вісім статей із теки 04_Equipment і 18 підрозділів", () => {
      expect(equipment2014.map((article) => article.slug)).toEqual(EQUIPMENT_2014_SLUGS);
      expect(equipment2014.reduce((sum, article) => sum + article.subsections.length, 0)).toBe(
        EXPECTED_2014_SUBSECTIONS
      );

      for (const article of equipment2014) {
        expect(article.provenance.kind).toBe("srd-5.1");
        if (article.provenance.kind !== "srd-5.1") throw new Error("очікували SRD 5.1");
        expect(article.provenance.file, article.slug).toMatch(/^04_Equipment\//);
      }
    });

    it("2024: чотирнадцять статей з equipment.md і 133 підрозділи", () => {
      expect(equipment2024.length).toBe(EXPECTED_2024_ARTICLES);
      expect(equipment2024.reduce((sum, article) => sum + article.subsections.length, 0)).toBe(
        EXPECTED_2024_SUBSECTIONS
      );
    });

    it("жодного порожнього тіла і жодного повтореного якоря", () => {
      for (const articles of [equipment2014, equipment2024]) {
        const subsectionIds = articles.flatMap((article) => article.subsections.map((subsection) => subsection.id));
        expect(new Set(subsectionIds).size).toBe(subsectionIds.length);

        for (const article of articles) {
          expect(article.subsections.length, article.slug).toBeGreaterThan(0);
          for (const subsection of article.subsections) {
            expect(subsection.content.trim().length, subsection.id).toBeGreaterThan(0);
          }
        }
      }
    });

    it("перекладене українською — KR20.8", () => {
      for (const article of [...equipment2014, ...equipment2024]) {
        expect(article.isTranslated, article.slug).toBe(true);
      }
    });
  });

  describe("Категорія «Спорядження»", () => {
    it("є в довіднику й тримає статті обох редакцій", () => {
      const category = getRuleCategory("equipment");
      expect(category).toBeDefined();
      expect(category?.title).toBe("Спорядження");

      expect(getRuleArticles2014ByCategory("equipment").length).toBe(EXPECTED_CATEGORY_ARTICLES[2014]);
      expect(getRuleArticles2024ByCategory("equipment").length).toBe(EXPECTED_CATEGORY_ARTICLES[2024]);
    });

    it("має сторінку в обох редакціях і статті в sitemap", async () => {
      for (const [label, findParams] of [
        ["2014", findRuleCategoryParams2014],
        ["2024", findRuleCategoryParams2024],
      ] as const) {
        const params = await findParams();
        expect(params.map((param) => param.category), label).toContain("equipment");
      }

      const urls = sitemap().map((entry) => entry.url);
      expect(urls).toContain("https://char.holota.family/rules/equipment");
      expect(urls).toContain("https://char.holota.family/2024/rules/equipment");
      for (const article of [...equipment2014, ...equipment2024]) {
        const prefix = article.ruleset === "RULES_2024" ? "/2024" : "";
        expect(urls, article.slug).toContain(
          `https://char.holota.family${prefix}/rules/${article.category}#${article.slug}`
        );
      }
    });

    it("матеріал майстра лишився в «Правилах Майстра»", () => {
      const gamemaster = getRuleArticles2014ByCategory("gamemaster").map((article) => article.slug);
      expect(gamemaster).toContain("trade-goods");
      expect(gamemaster).toContain("selling-treasure");
    });
  });

  describe("Оракул: сім правил, яких довідник не мав", () => {
    for (const { rule, probe, in2014, in2024 } of EXPECTED_RULES) {
      it(`${rule} — знаходиться в обох редакціях`, () => {
        for (const [label, articles, subsectionId] of [
          ["2014", equipment2014, in2014],
          ["2024", equipment2024, in2024],
        ] as const) {
          const subsection = findSubsection(articles, subsectionId);
          expect(subsection, `${label} ${subsectionId}`).toBeDefined();
          expect(subsection!.content, `${label} ${subsectionId}`).toMatch(probe);
        }
      });
    }
  });

  describe("Таблиці, які вже є каталогами", () => {
    it("проза веде на каталог, а не несе копію таблиці", () => {
      for (const [label, articles, prefix] of [
        ["2014", equipment2014, RULES_2014_CATALOG_PREFIX],
        ["2024", equipment2024, RULES_2024_CATALOG_PREFIX],
      ] as const) {
        const body = joinContent(articles);
        for (const link of findCatalogHrefs(prefix)) {
          expect(body, `${label}: ${link}`).toContain(link);
        }
      }
    });

    it("копії таблиць зброї й обладунків у корпусі не лишилося", () => {
      for (const [label, articles] of [
        ["2014", imported2014],
        ["2024", imported2024],
      ] as const) {
        const rows = joinContent(articles)
          .split("\n")
          .filter((line) => /^\|\s*(Padded|Chain shirt|Studded [Ll]eather|Greatclub|Handaxe)\b/.test(line));
        expect(rows, `${label}: ${rows.join(" / ")}`).toEqual([]);
      }
    });
  });
});
