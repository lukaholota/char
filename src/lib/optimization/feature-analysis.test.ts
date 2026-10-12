import { describe, expect, it } from "vitest";
import { getAllClasses } from "@/lib/classesData";
import { bindingSchema, entitySchema } from "./schema";
import { findBoundFeatureContent } from "./feature-analysis";
import { readSliceArticle, readSliceBindings, readSlicePreview, collectSliceCatalog } from "./slice-reader";
import { validateCorpus } from "./validation";
import { collectFeatureBindingCandidates } from "../../../scripts/rpgbot/generate-feature-bindings";
import { collectAll2014Bindings, collectDedicatedFeatureBindingCandidates } from "../../../scripts/rpgbot/generate-feature-bindings";

async function readFeatureFixture() {
  const document = (await readSliceArticle("monk-subclasses-2014", "RULES_2014"))!;
  const bindings = (await readSliceBindings()).filter((binding) => binding.entity.kind === "feature" && binding.articleId === document.article.articleId);
  const corpus = { schemaVersion: 1, sources: document.sources, sourceRevisions: document.sourceRevisions,
    articles: [document.article], translations: document.translations, ratings: document.ratings, bindings, recipes: [] };
  return { document, bindings, corpus };
}

describe("Monk feature bindings", () => {
  it("requires a parent and exact option for a feature", async () => {
    const { bindings } = await readFeatureFixture();
    expect(entitySchema.safeParse({ ...bindings[0].entity, parentKey: undefined }).success).toBe(false);
    expect(bindingSchema.safeParse({ ...bindings[0], optionId: undefined }).success).toBe(false);
    expect(bindingSchema.safeParse(bindings[0]).success).toBe(true);
  });

  it("validates every reviewed feature and rejects missing options and unrelated ratings", async () => {
    const { corpus } = await readFeatureFixture();
    expect(validateCorpus(corpus, collectSliceCatalog("RULES_2014")).issues).toEqual([]);
    const missing = structuredClone(corpus);
    missing.bindings[0].optionId = "missing-option";
    expect(validateCorpus(missing, collectSliceCatalog("RULES_2014")).issues.map((issue) => issue.code)).toContain("invalid-binding-option");
    const unrelated = structuredClone(corpus);
    unrelated.bindings[0].ratingIds = [unrelated.bindings[1].ratingIds[0]];
    expect(validateCorpus(unrelated, collectSliceCatalog("RULES_2014")).issues.map((issue) => issue.code)).toContain("invalid-preview-rating");
  });

  it("generates the reviewed set deterministically and reports unpaired options", async () => {
    const { document, bindings } = await readFeatureFixture();
    const characterClass = getAllClasses("RULES_2014").find((entry) => entry.key === "MONK_2014")!;
    const generated = collectFeatureBindingCandidates(characterClass, document, await readSliceBindings());
    expect(generated.candidates).toEqual(bindings);
    expect(generated.candidates).toHaveLength(42);
    expect(generated.unmatched.some((option) => option.includes("Agile Parry"))).toBe(true);
    const mismatched = structuredClone(characterClass);
    mismatched.subclasses[0].features[0].engName = "Unrelated feature";
    expect(collectFeatureBindingCandidates(mismatched, document, await readSliceBindings()).candidates).toHaveLength(41);
  });

  it("returns only this subclass and edition with full item text and section links", async () => {
    const preview = (await readSlicePreview({ ruleset: "RULES_2014", kind: "subclass", parentKey: "MONK_2014", entityKey: "WAY_OF_MERCY" }))!;
    expect(preview.features).toHaveLength(6);
    const healing = preview.features.find((feature) => feature.engName === "Hand of Healing")!;
    expect(healing.content.map((node) => node.text).join("").length).toBeGreaterThan(600);
    expect(healing.href).toContain("#section-mercy");
    expect(healing.rating?.optionId).toBe(healing.binding.optionId);
    const otherEdition = await readSlicePreview({ ruleset: "RULES_2024", kind: "subclass", parentKey: "MONK_2024", entityKey: "WAY_OF_MERCY" });
    expect(otherEdition?.features ?? []).toEqual([]);
  });

  it("keeps suggested Sun Soul changes separate from the actual ability analysis", async () => {
    const { document, bindings } = await readFeatureFixture();
    const sunBolt = bindings.find((binding) => binding.entity.entityKey === "radiant-sun-bolt-3")!;
    expect(sunBolt.ratingIds).toEqual([]);
    expect(findBoundFeatureContent(document.translations[0], sunBolt)?.blockId).toBe("block-section-sun-soul-6");
  });

  it("includes nested author explanations for composite abilities without the next feature", async () => {
    const { document, bindings } = await readFeatureFixture();
    const disciple = bindings.find((binding) => binding.entity.entityKey === "draconic-disciple-3")!;
    const bound = findBoundFeatureContent(document.translations[0], disciple)!;
    expect(bound.childrenBlock?.items).toHaveLength(3);
    expect(bound.childrenBlock?.depths).toEqual([0, 0, 0]);
    expect(bound.childrenBlock?.items.flat().map((node) => node.text).join("")).toContain("Draconic Presence");
    expect(bound.childrenBlock?.items.flat().map((node) => node.text).join("")).not.toContain("Breath of the Dragon");
  });
});

it("validates all 2014 comparison candidates against their own articles and catalog", async () => {
  const generated = await collectAll2014Bindings(await readSliceBindings());
  expect(new Set(generated.candidates.map((binding) => binding.articleId)).size).toBe(13);
  for (const articleId of new Set(generated.candidates.map((binding) => binding.articleId))) {
    const document = (await readSliceArticle(articleId.replace(/^rpgbot-/, ""), "RULES_2014"))!;
    const bindings = generated.candidates.filter((binding) => binding.articleId === articleId);
    const corpus = { schemaVersion: 1, sources: document.sources, sourceRevisions: document.sourceRevisions,
      articles: [document.article], translations: document.translations, ratings: document.ratings, bindings, recipes: [] };
    expect(validateCorpus(corpus, collectSliceCatalog("RULES_2014")).issues, articleId).toEqual([]);
    for (const binding of bindings.filter((binding) => binding.entity.kind === "feature")) {
      expect(findBoundFeatureContent(document.translations.at(-1)!, binding)?.content.length).toBeGreaterThan(0);
    }
  }
});

it("returns exact Echo Knight ability analyses through the shared subclass preview", async () => {
  const preview = (await readSlicePreview({ ruleset: "RULES_2014", kind: "subclass", parentKey: "FIGHTER_2014", entityKey: "ECHO_KNIGHT" }))!;
  expect(preview.features.length).toBeGreaterThanOrEqual(4);
  const echo = preview.features.find((feature) => feature.engName === "Manifest Echo")!;
  expect(echo.binding.entity.parentKey).toBe("ECHO_KNIGHT");
  expect(echo.href).toContain("#section-echo-knight");
  expect(echo.rating?.optionId).toBe(echo.binding.optionId);
  expect(echo.content.map((node) => node.text).join("").length).toBeGreaterThan(100);
  expect(await readSlicePreview({ ruleset: "RULES_2024", kind: "subclass", parentKey: "FIGHTER_2024", entityKey: "ECHO_KNIGHT" })).toBeNull();
});

it("joins the dedicated Beast Master guide to its native subclass and four exact abilities", async () => {
  const preview = (await readSlicePreview({ ruleset: "RULES_2014", kind: "subclass", parentKey: "RANGER_2014", entityKey: "BEAST_MASTER_CONCLAVE" }))!;
  expect(preview.slug).toBe("ranger-beast-master-2014");
  expect(preview.features.map((feature) => feature.binding.entity.entityKey)).toEqual([
    "primal-companion-optional-3", "exceptional-training-7", "bestial-fury-11", "share-spells-15",
  ]);
  for (const feature of preview.features) {
    expect(feature.binding.articleId).toBe("rpgbot-ranger-beast-master-2014");
    expect(feature.content.length).toBeGreaterThan(0);
    expect(feature.href).toContain("#section-features");
  }
});

it("generates missing dedicated bindings by exact native identity without replacing existing primary analyses", async () => {
  const document = (await readSliceArticle("ranger-beast-master-2014", "RULES_2014"))!;
  const ranger = getAllClasses("RULES_2014").find((entry) => entry.key === "RANGER_2014")!;
  const bindings = await readSliceBindings();
  const missing = bindings.filter((binding) => binding.articleId !== document.article.articleId);
  const generated = collectDedicatedFeatureBindingCandidates(ranger, document, missing);
  expect(generated.candidates).toHaveLength(5);
  expect(generated.candidates.filter((binding) => binding.entity.kind === "feature")).toHaveLength(4);
  expect(validateCorpus({ schemaVersion: 1, sources: document.sources, sourceRevisions: document.sourceRevisions,
    articles: [document.article], translations: document.translations, ratings: document.ratings,
    bindings: generated.candidates, recipes: [] }, collectSliceCatalog("RULES_2014")).issues).toEqual([]);
  expect(collectDedicatedFeatureBindingCandidates(ranger, document, bindings).candidates).toEqual([]);
  expect(collectDedicatedFeatureBindingCandidates(getAllClasses("RULES_2024")[0], document, []).candidates).toEqual([]);
  const ambiguous = structuredClone(document);
  ambiguous.article.topics.push(ranger.subclasses.find((subclass) => subclass.key !== "BEAST_MASTER_CONCLAVE")!.name);
  expect(collectDedicatedFeatureBindingCandidates(ranger, ambiguous, []).candidates).toEqual([]);
});
