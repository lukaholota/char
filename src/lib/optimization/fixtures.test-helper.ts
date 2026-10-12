import type { Corpus, EntityRef } from "./types";

export const fixtureEntity: EntityRef = { ruleset: "RULES_2014", kind: "subclass", parentKey: "FIGHTER_2014", entityKey: "CHAMPION" };
export const fixtureDate = "2026-09-29T00:00:00Z";
const paragraph = (blockId: string, text: string) => ({ blockId, type: "paragraph" as const, content: [{ type: "text" as const, text }] });

// Original technical examples, not RPGbot text or author ratings.
export function fixtureCorpus(): Corpus {
  return {
    schemaVersion: 1,
    sources: [{ sourceId: "fixture-source", rulesets: ["RULES_2014"] }],
    sourceRevisions: [{ revisionId: "source-r1", sourceId: "fixture-source", fetchedAt: fixtureDate,
      contentHash: "a".repeat(64), title: "Technical fixture", authors: ["Test author"],
      sourceFile: "source/fixture.txt", evidence: "Original test fixture" }],
    articles: [{ articleId: "comparison", sourceId: "fixture-source", slug: "stable-comparison", ruleset: "RULES_2014",
      titleUk: "Технічний приклад", titleEn: "Technical example", topics: ["fixture"], status: "published", publishedRevisionId: "translation-r1" }],
    translations: [{ translationRevisionId: "translation-r1", articleId: "comparison", sourceRevisionId: "source-r1",
      status: "reviewed", reviewedAt: fixtureDate, sections: [
        { sectionId: "overview", heading: "Overview", blocks: [paragraph("intro", "Original introduction.")] },
        { sectionId: "comparison-section", parentSectionId: "overview", sourceAnchor: "original-anchor", heading: "Comparison", blocks: [
          paragraph("option", "A technical option has different ratings under different conditions."),
          { blockId: "marker-a", type: "rating", ratingId: "rating-a" },
          { blockId: "marker-b", type: "rating", ratingId: "rating-b" },
          { blockId: "list", type: "list", ordered: true, items: [[{ type: "strong", text: "List text" }]] },
          { blockId: "table", type: "table", headers: [[{ type: "text", text: "Header" }]],
            rows: [[[{ type: "link", text: "Cell", href: "https://example.org/" }]]] },
        ] },
      ] }],
    ratings: [
      { ratingId: "rating-a", articleId: "comparison", translationRevisionId: "translation-r1", sectionId: "comparison-section",
        targetBlockId: "option", context: "Condition A", score: 1, sourceColor: "red", explanation: "Fixture rationale A", entity: fixtureEntity },
      { ratingId: "rating-b", articleId: "comparison", translationRevisionId: "translation-r1", sectionId: "comparison-section",
        targetBlockId: "option", context: "Condition B", score: 4, sourceColor: "blue", explanation: "Fixture rationale B", entity: fixtureEntity },
      { ratingId: "partial", articleId: "comparison", translationRevisionId: "translation-r1", sectionId: "comparison-section",
        targetBlockId: "option", context: "Unscored option", explanationBlockId: "option" },
    ],
    bindings: [{ bindingId: "binding", entity: fixtureEntity, articleId: "comparison", sectionId: "comparison-section",
      role: "comparison", primary: true, preview: "Original short fixture excerpt.", ratingIds: ["rating-a", "rating-b"],
      evidence: "Technical fixture verification", reviewedAt: fixtureDate }],
    recipes: [],
  };
}
