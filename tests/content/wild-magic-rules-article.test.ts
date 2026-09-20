import { describe, expect, it } from "vitest";
import { readSubclassFeatureSeedInputs } from "../../prisma/seed/subclassFeatureSeed";
import { getAllRuleArticles2014 } from "@/lib/rules2014Data";
import { searchOmniIndex } from "@/lib/omniSearchData";
import { WILD_MAGIC_ARTICLE_SLUG } from "@/lib/wild-magic-surge-article";

const SURGE_FEATURE_ENG_NAME = "Wild Magic Surge";
const SURGE_ROW = /^(\d\d-\d\d): (.+)$/gm;

function readSeedDescription(): string {
  const feature = readSubclassFeatureSeedInputs().find((input) => input.engName === SURGE_FEATURE_ENG_NAME);
  if (!feature?.description) throw new Error("У сіді підкласів немає риси Wild Magic Surge");
  return feature.description;
}

function findArticle() {
  const article = getAllRuleArticles2014().find((candidate) => candidate.slug === WILD_MAGIC_ARTICLE_SLUG);
  if (!article) throw new Error("У довіднику 2014 немає статті про дику магію");
  return article;
}

describe("Дика магія в довіднику правил 2014", () => {
  it("стаття стоїть у розділі магії й має вступ та таблицю", () => {
    const article = findArticle();
    expect(article.category).toBe("spellcasting");
    expect(article.subsections.map((subsection) => subsection.id)).toEqual([
      "wild-magic-surge",
      "wild-magic-surge-table",
    ]);
  });

  it("вступ узято з сіду підкласів, а не переписано вручну", () => {
    const [intro] = findArticle().subsections;
    expect(readSeedDescription()).toContain(intro.content);
    expect(intro.content).toContain("Майстер може наказати вам кинути к20");
  });

  it("у таблиці всі 50 рядків сіду з їхнім текстом", () => {
    const [, table] = findArticle().subsections;
    const seedRows = [...readSeedDescription().matchAll(SURGE_ROW)];
    expect(seedRows).toHaveLength(50);
    for (const [, roll, description] of seedRows) {
      expect(table.content).toContain(`| ${roll.replace("-", "–")} | ${description} |`);
    }
  });

  it("запит про дику магію першим віддає довідник, а не підклас Чародія", () => {
    for (const query of ["дика магія", "дикої магії", "сплеск дикої магії"]) {
      const [first] = searchOmniIndex(query, "RULES_2014");
      expect(first?.category, `запит «${query}»`).toBe("rules");
      expect(first?.href, `запит «${query}»`).toContain(`/rules/spellcasting#${WILD_MAGIC_ARTICLE_SLUG}`);
    }
  });
});
