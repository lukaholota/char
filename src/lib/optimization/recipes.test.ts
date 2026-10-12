import { expect, it } from "vitest";
import { fixtureCorpus, fixtureEntity } from "./fixtures.test-helper";
import { validateCorpus } from "./validation";
import type { BuildRecipe, EntityRef, SourceRef } from "./types";

const ref: SourceRef = { articleId: "comparison", translationRevisionId: "translation-r1", sourceRevisionId: "source-r1",
  sectionId: "comparison-section", blockId: "option", ratingIds: ["rating-a"] };
const classEntity: EntityRef = { ruleset: "RULES_2014", kind: "class", entityKey: "FIGHTER_2014" };
function recipe(): BuildRecipe {
  return { buildId: "fixture-build", revisionId: "build-r1", ruleset: "RULES_2014", title: "Original fixture build",
    startingClassKey: "FIGHTER_2014", sourceRefs: [ref], supportedLevels: [1], initialChoices: ["class-choice"],
    choices: [{ choiceId: "class-choice", stage: "initial", count: 1, sourceRefs: [ref],
      alternatives: [{ alternativeId: "class-alternative", entity: classEntity, sourceRefs: [ref], explanation: "Original fixture reasoning", dependsOn: [] }] }],
    progression: [{ characterLevel: 3, classKey: "FIGHTER_2014", classLevel: 3, subclassKey: "CHAMPION", choiceIds: [], sourceRefs: [ref] }], coverage: "partial" };
}
it("validates source-backed recipe, choices and progression without assembling a character", () => {
  const corpus = fixtureCorpus(); corpus.recipes = [recipe()];
  expect(validateCorpus(corpus, [fixtureEntity, classEntity]).issues).toEqual([]);
});
it.each(["source", "block", "rating", "entity", "edition", "dependency", "self-dependency", "choice", "count"])("reports invalid recipe %s", (kind) => {
  const corpus = fixtureCorpus(); const build = recipe(); corpus.recipes = [build];
  const alternative = build.choices[0].alternatives[0];
  if (kind === "source") build.sourceRefs = [{ ...ref, sourceRevisionId: "missing" }];
  if (kind === "block") build.sourceRefs = [{ ...ref, blockId: "missing" }];
  if (kind === "rating") build.sourceRefs = [{ ...ref, ratingIds: ["missing"] }];
  if (kind === "entity") alternative.entity = { ...classEntity, entityKey: "missing" };
  if (kind === "edition") build.ruleset = "RULES_2024";
  if (kind === "dependency") alternative.dependsOn = ["missing"];
  if (kind === "self-dependency") alternative.dependsOn = ["class-choice"];
  if (kind === "choice") build.progression[0].choiceIds = ["missing"];
  if (kind === "count") build.choices[0].count = 2;
  expect(validateCorpus(corpus, [fixtureEntity, classEntity]).issues.length).toBeGreaterThan(0);
});
