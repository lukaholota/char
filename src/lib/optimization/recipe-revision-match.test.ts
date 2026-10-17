import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findRevisionMismatchReason, findSharedPlanLevel, UNKNOWN_REVISION_REASON } from "./recipe-revision-match";
import { buildRecipeSchema } from "./schema";
import type { BuildRecipe } from "./types";

const ARCHIVE = "data/rpgbot/build-revisions";

function readRecipe(path: string): BuildRecipe {
  return buildRecipeSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

const current = (buildId: string) => readRecipe(`data/rpgbot/builds/${buildId}.json`);
const archivedNames = readdirSync(ARCHIVE).filter((name) => name.endsWith(".json"));
const barbarian = current("build-barbarian-berserker-2014");
const sorcadin = current("build-sorcadin-clockwork-2014");
const choiceTemplate = current("build-monk-open-hand-2024").choices[0];

function changeStep(recipe: BuildRecipe, characterLevel: number, change: (step: BuildRecipe["progression"][number]) => void): BuildRecipe {
  const changed = structuredClone(recipe);
  change(changed.progression.find((step) => step.characterLevel === characterLevel)!);
  return changed;
}

const EXTENDED_TO_TWENTY = ["build-barbarian-berserker-2014-v2", "build-sorcadin-clockwork-2014-v1", "build-wizard-evocation-2014-v2"];

describe("archived recipe revisions", () => {
  it.each(archivedNames)("%s is an older revision of a current recipe", (name) => {
    const archived = readRecipe(`${ARCHIVE}/${name}`);
    expect(name).toBe(`${archived.revisionId}.json`);
    expect(archived.revisionId).not.toBe(current(archived.buildId).revisionId);
  });

  it.each(EXTENDED_TO_TWENTY)("%s is only extended by the current plan", (revisionId) => {
    const archived = readRecipe(`${ARCHIVE}/${revisionId}.json`);
    expect(findSharedPlanLevel(archived, current(archived.buildId))).toBe(20);
  });
});

describe("shared plan level of two revisions", () => {
  it("is the last level when the new plan only extends the old one", () => {
    const toFive = { ...barbarian, supportedLevels: [1, 2, 3, 4, 5], progression: barbarian.progression.slice(0, 5) };
    expect(findSharedPlanLevel(toFive, barbarian)).toBe(20);
  });

  it("ignores source references and empty lists", () => {
    const relabeled = changeStep(barbarian, 4, (step) => {
      step.sourceRefs = [{ ...step.sourceRefs[0], sectionId: "section-other" }];
      step.decisions = { ...step.decisions, featOptions: [] };
    });
    expect(findSharedPlanLevel(relabeled, barbarian)).toBe(20);
  });

  it("stops before the first level whose decisions differ", () => {
    const otherIncrease = changeStep(barbarian, 4, (step) => {
      step.decisions = { abilityScoreIncrease: [{ ability: "CON", amount: 2 }] };
    });
    expect(findSharedPlanLevel(otherIncrease, barbarian)).toBe(3);
  });

  it("stops before a level that the new plan no longer executes", () => {
    const toThree = { ...barbarian, supportedLevels: [1, 2, 3], progression: barbarian.progression.slice(0, 3) };
    expect(findSharedPlanLevel(barbarian, toThree)).toBe(3);
  });

  it("stops before a level whose referenced choice changed", () => {
    const withChoice = changeStep({ ...barbarian, choices: [{ ...choiceTemplate, stage: "progression" }] }, 4, (step) => {
      step.choiceIds = [choiceTemplate.choiceId];
    });
    const changed = structuredClone(withChoice);
    changed.choices[0].count += 1;
    expect(findSharedPlanLevel(withChoice, withChoice)).toBe(20);
    expect(findSharedPlanLevel(changed, withChoice)).toBe(3);
  });

  it("shares nothing when the start differs", () => {
    expect(findSharedPlanLevel({ ...barbarian, startingClassKey: "FIGHTER_2014" }, barbarian)).toBe(0);
  });

  it.each([
    ["race", { raceKey: "HUMAN_2014" }],
    ["background", { backgroundKey: "SAGE" }],
    ["feat", { featKey: "ALERT" }],
    ["ability scores", { abilityScores: barbarian.details!.abilityScores.map((score) => ({ ...score, value: 10 })) }],
  ])("shares nothing when the start changes its %s", (_label, change) => {
    expect(findSharedPlanLevel({ ...barbarian, details: { ...barbarian.details!, ...change } }, barbarian)).toBe(0);
  });

  it("ignores the article prose of the start", () => {
    expect(findSharedPlanLevel({ ...barbarian, details: { ...barbarian.details!, nodes: [], levelPlans: [], incomplete: [] } }, barbarian)).toBe(20);
  });
});

describe("reason a character cannot follow the current revision", () => {
  const changedAtFour = changeStep(barbarian, 4, (step) => {
    step.decisions = { abilityScoreIncrease: [{ ability: "CON", amount: 2 }] };
  });

  it("has none while the character is below the first changed level", () => {
    expect(findRevisionMismatchReason(barbarian, changedAtFour, 3)).toBeNull();
  });

  it("names the changed level once the character has passed it", () => {
    expect(findRevisionMismatchReason(barbarian, changedAtFour, 4)).toContain("з 4-го рівня");
  });

  it("keeps the generic reason for an unknown revision or another build", () => {
    expect(findRevisionMismatchReason(barbarian, null, 1)).toBe(UNKNOWN_REVISION_REASON);
    expect(findRevisionMismatchReason(barbarian, sorcadin, 1)).toBe(UNKNOWN_REVISION_REASON);
  });
});
