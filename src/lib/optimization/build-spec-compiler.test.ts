import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { buildSpecSchema, type ReadyBuildSpec } from "./build-spec";
import { BuildSpecError, compileBuildSpec, findBlockedSpecProblems } from "./build-spec-compiler";
import { parseArticleDocument } from "./document";
import { buildReadyPresetDraft, readyPresetSchema } from "./ready-preset";

const SLUG = "fighter-champion-shield-2014";
const content = findCharacterCreationOptions("RULES_2014");
const document = parseArticleDocument(JSON.parse(readFileSync("data/rpgbot/uk/rpgbot-fighter-2014.json", "utf8")));

function readSpec(): ReadyBuildSpec {
  const spec = buildSpecSchema.parse(JSON.parse(readFileSync(`data/rpgbot/build-specs/${SLUG}.json`, "utf8")));
  if (spec.status !== "ready") throw new Error("fixture spec must be ready");
  return spec;
}

function compileWith(change: (spec: ReadyBuildSpec) => void): string[] {
  const spec = structuredClone(readSpec());
  change(spec);
  try {
    compileBuildSpec({ slug: SLUG, spec, document, content });
    return [];
  } catch (error) {
    if (error instanceof BuildSpecError) return error.problems;
    throw error;
  }
}

describe("compileBuildSpec", () => {
  it("builds a recipe and preset that assemble into a valid draft", () => {
    const { recipe, preset } = compileBuildSpec({ slug: SLUG, spec: readSpec(), document, content });
    expect(recipe.buildId).toBe(`build-${SLUG}`);
    expect(recipe.details?.nodes.map((node) => node.nodeId)).toContain(preset.skillSection);
    expect(recipe.details?.levelPlans.map((plan) => plan.level)).toEqual([1, 2, 3, 4, 8]);
    expect(() => buildReadyPresetDraft(recipe, readyPresetSchema.parse(preset), content)).not.toThrow();
  });

  it("carries the author's alternative choices from the spec into the recipe", () => {
    const monk = JSON.parse(readFileSync("data/rpgbot/build-specs/monk-open-hand-2014.json", "utf8"));
    const { recipe } = compileBuildSpec({ slug: SLUG, spec: { ...readSpec(), initialChoices: monk.initialChoices, choices: monk.choices }, document, content });
    expect(recipe.initialChoices).toEqual(["race", "background", "feat"]);
    expect(recipe.choices.map((choice) => choice.choiceId)).toEqual(["race", "background", "feat"]);
    expect(compileBuildSpec({ slug: SLUG, spec: readSpec(), document, content }).recipe.choices).toEqual([]);
  });

  it("takes node text and revision ids from the current article, not from the spec", () => {
    const { recipe } = compileBuildSpec({ slug: SLUG, spec: readSpec(), document, content });
    const translation = document.translations.at(-1)!;
    const raceSection = translation.sections.find((section) => section.sectionId === "section-race")!;
    const raceNode = recipe.details!.nodes.find((node) => node.nodeId === "section-race")!;
    expect(raceNode.title).toBe(raceSection.heading);
    expect(raceNode.sourceRefs[0]).toMatchObject({ translationRevisionId: translation.translationRevisionId, sourceRevisionId: translation.sourceRevisionId });
  });

  it("rejects an unknown section id and lists the sections of the example", () => {
    const problems = compileWith((spec) => { spec.preset.skillSection = "section-missing"; });
    expect(problems.join("\n")).toContain("Невідомий розділ «section-missing» (preset.skillSection)");
    expect(problems.join("\n")).toContain("section-abilities");
  });

  it.each([
    ["class", (spec: ReadyBuildSpec) => { spec.classKey = "FIGTER_2014"; }, "клас «FIGTER_2014»"],
    ["subclass", (spec: ReadyBuildSpec) => { spec.subclassKey = "BATTLE_MAGE"; }, "підклас класу FIGHTER_2014 «BATTLE_MAGE»"],
    ["race", (spec: ReadyBuildSpec) => { spec.raceKey = "HALF_ORC"; }, "раса «HALF_ORC»"],
    ["subrace", (spec: ReadyBuildSpec) => { spec.preset.subraceKey = "HALF_ORC_FIERCE"; }, "підраса HALF_ORC_2014 «HALF_ORC_FIERCE»"],
    ["background", (spec: ReadyBuildSpec) => { spec.backgroundKey = "SOLDER"; }, "передісторія «SOLDER»"],
    ["feat", (spec: ReadyBuildSpec) => { spec.featKey = "SENTINAL"; }, "риса «SENTINAL»"],
    ["weapon", (spec: ReadyBuildSpec) => { spec.preset.equipment[1].weapons = ["LONGSWORDS"]; }, "зброя «LONGSWORDS»"],
  ])("reports a %s key missing from the catalog", (_name, change, expected) => {
    expect(compileWith(change).join("\n")).toContain(expected);
  });

  it("suggests similar catalog keys", () => {
    expect(compileWith((spec) => { spec.raceKey = "HALF_ORC"; }).join("\n")).toContain("HALF_ORC_2014");
  });

  it("rejects an article revision that moved since the spec was reviewed", () => {
    const problems = compileWith((spec) => { spec.reviewedRevision.translationRevisionId = "translation-older"; });
    expect(problems.join("\n")).toContain("Стаття оновилась після огляду");
    expect(problems.join("\n")).toContain("translation-older");
  });

  it("rejects a spec that is not RULES_2014", () => {
    const parsed = buildSpecSchema.safeParse({ ...readSpec(), ruleset: "RULES_2024" });
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toContain("RULES_2014");
  });

  it("rejects an article that is not 2014", () => {
    const article2024 = { ...document, article: { ...document.article, ruleset: "RULES_2024" as const } };
    expect(() => compileBuildSpec({ slug: SLUG, spec: readSpec(), document: article2024, content })).toThrow("RULES_2014");
  });

  it("requires the skill node to be part of the recipe nodes", () => {
    const problems = compileWith((spec) => { spec.nodeSections = ["section-abilities", "section-race"]; });
    expect(problems.join("\n")).toContain("не входить у вузли рецепта");
  });

  it("warns when ability scores differ from the author's table", () => {
    const spec = structuredClone(readSpec());
    spec.abilityScores.STR = 14;
    const { warnings } = compileBuildSpec({ slug: SLUG, spec, document, content });
    expect(warnings.join("\n")).toContain("STR 14 (у таблиці автора 15)");
  });
});

describe("findBlockedSpecProblems", () => {
  const blocked = { status: "blocked" as const, ruleset: "RULES_2014" as const, articleSlug: "fighter-2014", exampleSection: "section-example", reasonCode: "needs-spells-at-level-one" as const,
    reason: "Приклад потребує заклинань на 1-му рівні, яких пресет ще не підтримує.", missing: [] as string[] };
  const translation = document.translations.at(-1)!;
  const reviewedRevision = { translationRevisionId: translation.translationRevisionId, sourceRevisionId: translation.sourceRevisionId };

  it("accepts a blocked spec for the current revision", () => {
    expect(findBlockedSpecProblems({ ...blocked, reviewedRevision }, document)).toEqual([]);
  });

  it("reports an unknown example section and a moved revision", () => {
    const problems = findBlockedSpecProblems({ ...blocked, exampleSection: "section-nope", reviewedRevision: { ...reviewedRevision, sourceRevisionId: "old" } }, document);
    expect(problems.join("\n")).toContain("Стаття оновилась після огляду");
    expect(problems.join("\n")).toContain("section-nope");
  });
});
