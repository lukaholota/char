import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { getAllClasses } from "@/lib/classesData";
import { entityIdentity } from "./bindings";
import { buildLevelOneDraft, findBuildCreatorStep, type BuildCatalog } from "./build-assembly";
import { readSliceArticle, readSliceBindings, readSliceEntityKeys, readSlicePreview, readSliceRecipes, collectSliceCatalog } from "./slice-reader";
import { validateCorpus } from "./validation";
import { generateIndices } from "./indices";
import { loadCorpus } from "../../../scripts/rpgbot/load-corpus";
import type { OptimizationRuleset } from "./types";

const rulesets: OptimizationRuleset[] = ["RULES_2014", "RULES_2024"];

describe.skipIf(!existsSync("data/rpgbot/builds/build-monk-shadow-2014.json"))("private Monk slice", () => {
  it("keeps the real private corpus out of every public index", async () => {
    const loaded = await loadCorpus("data/rpgbot");
    const sliceRecipes = (await Promise.all(rulesets.map(readSliceRecipes))).flat();
    expect(loaded.corpus.recipes.map((recipe) => recipe.buildId).sort()).toEqual(sliceRecipes.map((recipe) => recipe.buildId).sort());
    expect(loaded.corpus.bindings.filter((binding) => binding.entity.kind !== "feature" && binding.articleId.startsWith("rpgbot-monk-"))).toHaveLength(23);
    expect(loaded.corpus.bindings.filter((binding) => binding.entity.kind === "feature" && binding.articleId.startsWith("rpgbot-monk-"))).toHaveLength(42);
    expect(generateIndices(loaded.corpus, loaded.catalog)).toEqual({ articles: [], bindings: [], search: [] });
  });
  it.each(rulesets)("maps every Monk subclass by edition, parent and key: %s", async (ruleset) => {
    const cls = getAllClasses(ruleset).find((entry) => entry.key === (ruleset === "RULES_2024" ? "MONK_2024" : "MONK_2014"))!;
    const bindings = (await readSliceBindings()).filter((entry) => entry.entity.ruleset === ruleset && entry.entity.parentKey === cls.key);
    expect(bindings.map((binding) => binding.entity.entityKey).sort()).toEqual(cls.subclasses.map((sub) => sub.key).sort());
    const keys = new Set((await readSliceEntityKeys()).map(entityIdentity));
    for (const binding of bindings) {
      expect(keys.has(entityIdentity(binding.entity))).toBe(true);
      expect(binding.evidence).toContain(cls.key);
      const document = await readSliceArticle(binding.articleId.replace(/^rpgbot-/, ""), ruleset);
      expect(document?.translations[0].sections.some((section) => section.sectionId === binding.sectionId)).toBe(true);
    }
    expect(await readSlicePreview({ ruleset, kind: "subclass", parentKey: "FIGHTER_2014", entityKey: cls.subclasses[0].key })).toBeNull();
  });

  it.each(rulesets)("validates recipes against source revisions and real catalog: %s", async (ruleset) => {
    const recipes = (await readSliceRecipes(ruleset)).filter((recipe) => recipe.startingClassKey === (ruleset === "RULES_2024" ? "MONK_2024" : "MONK_2014") && recipe.choices.length > 0);
    expect(recipes).toHaveLength(2);
    const documents = await Promise.all(recipes.map((recipe) => readSliceArticle(recipe.sourceRefs[0].articleId.replace(/^rpgbot-/, ""), ruleset)));
    const corpus = { schemaVersion: 1, sources: documents.flatMap((document) => document!.sources), sourceRevisions: documents.flatMap((document) => document!.sourceRevisions), articles: documents.map((document) => document!.article), translations: documents.flatMap((document) => document!.translations), ratings: documents.flatMap((document) => document!.ratings), bindings: [], recipes };
    expect(validateCorpus(corpus, collectSliceCatalog(ruleset)).issues).toEqual([]);
    const missingKey = structuredClone(corpus);
    missingKey.recipes[0].choices[0].alternatives[0].entity.entityKey = "MISSING_MONK_ENTITY";
    expect(validateCorpus(missingKey, collectSliceCatalog(ruleset)).issues.some((issue) => issue.code === "missing-entity")).toBe(true);
    const brokenRef = structuredClone(corpus);
    brokenRef.recipes[0].details!.levelPlans[0].sourceRefs[0].sectionId = "missing-section";
    expect(validateCorpus(brokenRef, collectSliceCatalog(ruleset)).issues.some((issue) => issue.code === "invalid-build-ref")).toBe(true);
    expect(corpus.articles.every((article) => article.status === "unpublished")).toBe(true);
    expect(corpus.translations.every((translation) => translation.status === "draft")).toBe(true);
  });

  it("keeps unavailable Tabaxi explicit and assembles only level-one fields", async () => {
    for (const ruleset of rulesets) {
      const content = findCharacterCreatorOptions(ruleset);
      const catalog: BuildCatalog = {
        classes: content.classes.map((entry) => ({ key: entry.name, id: entry.classId })),
        races: content.races.map((entry) => ({ key: entry.name, id: entry.raceId, variants: entry.raceVariants.map((variant) => ({ key: variant.name, id: variant.raceVariantId })) })),
        backgrounds: content.backgrounds.map((entry) => ({ key: entry.name, id: entry.backgroundId })),
        feats: content.feats.map((entry) => ({ key: entry.name, id: entry.featId })),
      };
      for (const recipe of await readSliceRecipes(ruleset)) {
        const draft = buildLevelOneDraft(recipe, catalog);
        expect(draft.ruleset).toBe(ruleset);
        expect(draft.subclassId).toBeUndefined();
        expect(draft.levelUpPath).toBeUndefined();
        expect(draft.equipment).toBeUndefined();
        expect(draft.name).toBeUndefined();
        if (recipe.buildId === "build-monk-open-hand-2024") {
          expect(draft.raceId).toBeUndefined();
          expect(recipe.details!.incomplete.some((entry) => entry.field.includes("Табаксі"))).toBe(true);
          expect(findBuildCreatorStep(draft)).toBe("race");
        }
      }
    }
  });

  it("keeps comparison ratings in their own edition and checks unknown slugs", async () => {
    const preview = await readSlicePreview({ ruleset: "RULES_2014", kind: "subclass", parentKey: "MONK_2014", entityKey: "WAY_OF_SHADOW" });
    expect(preview?.rating?.score).toBe(3);
    expect(preview?.builds[0].buildId).toBe("build-monk-shadow-2014");
    expect(await readSliceArticle("monk-shadow-2014", "RULES_2024")).toBeNull();
    await expect(readSliceArticle("../monk-shadow-2014", "RULES_2014")).rejects.toThrow();
  });
});

describe("початок гайду в превʼю підкласу", () => {
  it("бере перший абзац вступу гайду, минаючи епіграф і маркери глосарію", async () => {
    const evoker = await readSlicePreview({ ruleset: "RULES_2014", kind: "subclass", parentKey: "WIZARD_2014", entityKey: "SCHOOL_OF_EVOCATION" });
    expect(evoker?.intro).toMatch(/^Робота Чарівника Школи втілення/);
    const mercy = await readSlicePreview({ ruleset: "RULES_2014", kind: "subclass", parentKey: "MONK_2014", entityKey: "WAY_OF_MERCY" });
    expect(mercy?.intro).toMatch(/^Зʼявившись у грі з «Казана Таші з усім» як/);
  });
});
