import { describe, expect, it } from "vitest";
import { articleHref, generateIndices } from "./indices";
import { validateCorpus } from "./validation";
import { applySourceRevision } from "./revisions";
import { catalogSubclassEntity, constructorSubclassEntity, resolvePrimaryBinding } from "./bindings";
import { fixtureCorpus, fixtureEntity } from "./fixtures.test-helper";
import type { Corpus } from "./types";

const validate = (corpus: Corpus) => validateCorpus(corpus, [fixtureEntity]);
const codes = (corpus: Corpus) => validate(corpus).issues.map((issue) => issue.code);

describe("optimization content contract", () => {
  it("preserves conditional ratings and missing scores without aggregation", () => {
    const corpus = fixtureCorpus();
    expect(validate(corpus).issues).toEqual([]);
    const indices = generateIndices(corpus, [fixtureEntity]);
    expect(indices.bindings[0].ratings.map((rating) => [rating.context, rating.score])).toEqual([["Condition A", 1], ["Condition B", 4]]);
    expect(corpus.ratings[2].score).toBeUndefined();
    expect(indices.bindings[0].href).toBe("/optimization/stable-comparison#comparison-section");
    expect(indices.search[1].text).toContain("List text Header Cell");
    expect(indices.search[1].text).toContain("Fixture rationale A");
    expect(JSON.stringify(indices.articles)).not.toContain("Original introduction");
    expect(JSON.stringify(indices.bindings)).not.toContain("Fixture rationale");
  });
  it("validates inline rating references in paragraph and table cells", () => {
    const corpus = fixtureCorpus();
    corpus.translations[0].sections[1].blocks.push({ blockId: "inline", type: "paragraph",
      content: [{ type: "rating", text: "Rated option", ratingId: "rating-a" }] });
    expect(validate(corpus).issues).toEqual([]);
    corpus.translations[0].sections[1].blocks.push({ blockId: "inline-table", type: "table",
      headers: [[{ type: "text", text: "H" }]], rows: [[[{ type: "rating", text: "Bad reference", ratingId: "missing" }]]] });
    expect(codes(corpus)).toContain("invalid-rating-marker");
  });
  it("permits an article with no bindings or ratings", () => {
    const corpus = fixtureCorpus(); corpus.bindings = []; corpus.ratings = [];
    corpus.translations[0].sections = [corpus.translations[0].sections[0]];
    expect(validate(corpus).issues).toEqual([]);
    expect(generateIndices(corpus).bindings).toEqual([]);
    expect(generateIndices(corpus).articles).toHaveLength(1);
  });
  it("uses catalog and constructor enum keys, not names, DB ids or slugs", () => {
    expect(catalogSubclassEntity({ key: "FIGHTER_2014", ruleset: "RULES_2014" }, { key: "CHAMPION" })).toEqual(fixtureEntity);
    expect(constructorSubclassEntity({ name: "FIGHTER_2014", ruleset: "RULES_2014" }, { name: "CHAMPION" })).toEqual(fixtureEntity);
  });
  it("never falls back across editions or parent classes for legacy subclasses", () => {
    const bindings = fixtureCorpus().bindings;
    expect(resolvePrimaryBinding(bindings, { ...fixtureEntity, ruleset: "RULES_2024" }).status).toBe("missing");
    expect(resolvePrimaryBinding(bindings, { ...fixtureEntity, parentKey: "WIZARD" }).status).toBe("missing");
    expect(resolvePrimaryBinding(bindings, fixtureEntity).status).toBe("resolved");
  });
  it("distinguishes identical subclass keys under different parents", () => {
    const corpus = fixtureCorpus();
    const anotherEntity = { ...fixtureEntity, parentKey: "OTHER_FIXTURE_CLASS" };
    corpus.bindings.push({ ...corpus.bindings[0], bindingId: "other-parent", entity: anotherEntity, ratingIds: [] });
    expect(validateCorpus(corpus, [fixtureEntity, anotherEntity]).issues).toEqual([]);
    const resolved = resolvePrimaryBinding(corpus.bindings, anotherEntity);
    expect(resolved.status).toBe("resolved");
    if (resolved.status === "resolved") expect(resolved.binding.bindingId).toBe("other-parent");
  });
  it("validates separate edition revisions while publishing only the 2014 MVP", () => {
    const corpus = fixtureCorpus(); corpus.sources[0].rulesets.push("RULES_2024");
    corpus.articles.push({ ...corpus.articles[0], articleId: "edition-2024", ruleset: "RULES_2024", publishedRevisionId: "translation-2024" });
    corpus.translations.push({ ...corpus.translations[0], articleId: "edition-2024", translationRevisionId: "translation-2024",
      sections: [corpus.translations[0].sections[0]] });
    const indices = generateIndices(corpus, [fixtureEntity]);
    expect(indices.articles).toHaveLength(1);
    expect(indices.articles[0].ruleset).toBe("RULES_2014");
    expect(indices.search.some((entry) => entry.ruleset === "RULES_2024")).toBe(false);
    expect(articleHref(corpus.articles[1])).toBe("/2024/optimization/stable-comparison");
    expect(indices.articles[0].sourceRevisionId).toBe("source-r1");
    expect(indices.bindings.filter((binding) => binding.entity.ruleset === "RULES_2024")).toEqual([]);
  });
  it("reports duplicate and absent primary, independent of array order", () => {
    const corpus = fixtureCorpus(); corpus.bindings.push({ ...corpus.bindings[0], bindingId: "another" });
    expect(codes(corpus)).toContain("ambiguous-primary");
    expect(resolvePrimaryBinding(corpus.bindings.reverse(), fixtureEntity).status).toBe("ambiguous");
    corpus.bindings = [{ ...corpus.bindings[0], primary: false }];
    expect(codes(corpus)).toContain("ambiguous-primary");
  });
  it("reports missing entity without making the unbound article unreadable", () => {
    const corpus = fixtureCorpus();
    expect(validateCorpus(corpus).issues.map((issue) => issue.code)).toContain("missing-entity");
    corpus.bindings = [];
    expect(validateCorpus(corpus).issues).toEqual([]);
  });
  it.each(["binding", "rating", "source"])("reports %s edition mismatch", (kind) => {
    const corpus = fixtureCorpus();
    if (kind === "binding") corpus.bindings[0].entity = { ...fixtureEntity, ruleset: "RULES_2024" };
    if (kind === "rating") corpus.ratings[0].entity = { ...fixtureEntity, ruleset: "RULES_2024" };
    if (kind === "source") corpus.sources[0].rulesets = ["RULES_2024"];
    expect(codes(corpus)).toContain("edition-mismatch");
    expect(() => generateIndices(corpus, [fixtureEntity])).toThrow("edition-mismatch");
  });
  it("preserves IDs, URLs and deterministic output after a title change and input reordering", () => {
    const corpus = fixtureCorpus(); const first = generateIndices(corpus, [fixtureEntity]);
    corpus.ratings.reverse();
    expect(generateIndices(corpus, [fixtureEntity])).toEqual(first);
    corpus.articles[0].titleUk = "Змінена назва"; corpus.translations[0].sections[1].heading = "New heading";
    const second = generateIndices(corpus, [fixtureEntity]);
    expect(second.articles[0].articleId).toBe(first.articles[0].articleId);
    expect(second.bindings[0].href).toBe(first.bindings[0].href);
    expect(second.articles[0].sections.map((section) => section.sectionId)).toEqual(first.articles[0].sections.map((section) => section.sectionId));
  });
  it("marks translations stale on source hash update and preserves published text and section IDs", () => {
    const corpus = fixtureCorpus();
    const updated = applySourceRevision(corpus, { ...corpus.sourceRevisions[0], revisionId: "source-r2", contentHash: "b".repeat(64) }, [fixtureEntity]);
    expect(updated.translations[0].status).toBe("stale");
    expect(updated.translations[0].sections).toEqual(corpus.translations[0].sections);
    expect(updated.articles[0].publishedRevisionId).toBe("translation-r1");
    expect(updated.translations[0].sourceRevisionId).toBe("source-r1");
    expect(generateIndices(updated, [fixtureEntity]).articles[0].stale).toBe(true);
    expect(corpus.translations[0].status).toBe("reviewed");
    expect(applySourceRevision(updated, updated.sourceRevisions[1], [fixtureEntity])).toEqual(updated);
    expect(() => applySourceRevision(corpus, { ...corpus.sourceRevisions[0], contentHash: "c".repeat(64) }, [fixtureEntity])).toThrow("immutable");
    expect(applySourceRevision(corpus, { ...corpus.sourceRevisions[0], revisionId: "same-hash" }, [fixtureEntity]).translations[0].status).toBe("reviewed");
  });
  it.each(["section", "block", "marker", "publication", "duplicate"])("rejects invalid %s reference", (kind) => {
    const corpus = fixtureCorpus();
    if (kind === "section") corpus.bindings[0].sectionId = "missing";
    if (kind === "block") corpus.ratings[0].targetBlockId = "missing";
    if (kind === "marker") corpus.ratings = corpus.ratings.filter((rating) => rating.ratingId !== "rating-a");
    if (kind === "publication") corpus.articles[0].publishedRevisionId = "missing";
    if (kind === "duplicate") corpus.translations[0].sections.push(corpus.translations[0].sections[0]);
    expect(validate(corpus).issues.length).toBeGreaterThan(0);
  });
  it("rejects raw HTML nodes, unsafe links, score/color mismatch and malformed tables", () => {
    const corpus = fixtureCorpus();
    for (const block of [{ blockId: "html", type: "html", html: "<script>bad</script>" },
      { blockId: "link", type: "paragraph", content: [{ type: "link", text: "Bad", href: "javascript:alert(1)" }] },
      { blockId: "table", type: "table", headers: [[{ type: "text", text: "H" }]], rows: [[]] }]) {
      const input = structuredClone(corpus);
      expect(validateCorpus({ ...input, translations: [{ ...input.translations[0], sections: [{ sectionId: "bad", heading: "Bad", blocks: [block] }] }] }).issues[0].code).toBe("schema");
    }
    corpus.ratings[0].score = 4;
    expect(codes(corpus)).toContain("schema");
  });
  it("publishes an explicit 2024 article without copying a 2014 binding", () => {
    const corpus = fixtureCorpus(); corpus.sources[0].rulesets.push("RULES_2024");
    corpus.articles.push({ ...corpus.articles[0], articleId: "new-edition", ruleset: "RULES_2024", status: "unpublished", publishedRevisionId: undefined });
    expect(validate(corpus).issues).toEqual([]);
    expect(generateIndices(corpus, [fixtureEntity]).articles).toHaveLength(1);
  });
});
