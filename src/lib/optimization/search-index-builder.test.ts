import { describe, expect, it } from "vitest";
import { buildRpgbotSearchArticles } from "./search-index-builder";
import { fixtureCorpus } from "./fixtures.test-helper";
import type { ArticleDocument } from "./types";

function buildDocument(): ArticleDocument {
  const corpus = fixtureCorpus();
  return { sources: corpus.sources, sourceRevisions: corpus.sourceRevisions, article: corpus.articles[0],
    translations: corpus.translations, ratings: corpus.ratings };
}

describe("RPGbot section search generation", () => {
  it("collects body, lists, tables and rating explanations without numeric rating signals", () => {
    const [article] = buildRpgbotSearchArticles([buildDocument()]);
    const section = article.sections.find((section) => section.sectionId === "comparison-section")!;
    expect(section.text).toContain("technical");
    expect(section.text).toContain("list");
    expect(section.text).toContain("header");
    expect(section.text).toContain("cell");
    expect(section.text).toContain("rationale");
    expect(section.text.split(" ").filter((word) => word === "fixture")).toHaveLength(1);
    expect(section.text).not.toMatch(/\b[14]\b/);
    expect(article.href).toBe("/rules/optimization/stable-comparison");
  });

  it("preserves Ukrainian and original terms while omitting markup syntax", () => {
    const document = buildDocument();
    document.translations[0].sections[0].blocks = [{ blockId: "terms", type: "paragraph",
      content: [{ type: "text", text: "{{Шквал ударів|Flurry of Blows}} Шквал ударів" }] }];
    const [{ sections }] = buildRpgbotSearchArticles([document]);
    expect(sections[0].text).toContain("flurry");
    expect(sections[0].text).toContain("шквал");
    expect(sections[0].text).not.toMatch(/[{}|]/);
  });

  it("omits private 2024, empty sections, repeated legends and table of contents", () => {
    const document = buildDocument();
    for (const [sectionId, heading] of [["legend", "Як читати оцінки RPGbot"], ["contents", "Зміст"], ["empty", "Порожньо"]]) {
      document.translations[0].sections.push({ sectionId, heading, blocks: sectionId === "empty" ? [] :
        [{ blockId: sectionId, type: "paragraph", content: [{ type: "text", text: "Службовий текст" }] }] });
    }
    const privateDocument = structuredClone(document);
    privateDocument.article.ruleset = "RULES_2024";
    privateDocument.article.articleId = "private-2024";
    const articles = buildRpgbotSearchArticles([document, privateDocument]);
    expect(articles).toHaveLength(1);
    expect(articles[0].sections.map((section) => section.sectionId)).toEqual(["overview", "comparison-section"]);
  });

  it("rejects duplicate article and section targets", () => {
    const document = buildDocument();
    expect(() => buildRpgbotSearchArticles([document, document])).toThrow("Duplicate RPGbot search target");
    document.translations[0].sections.push(document.translations[0].sections[0]);
    expect(() => buildRpgbotSearchArticles([document])).toThrow("Duplicate RPGbot search target");
  });
});
