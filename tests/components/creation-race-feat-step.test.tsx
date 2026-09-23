import { describe, expect, it } from "vitest";
import { hasRaceFeatChoice, resolveCreationSteps, type CreationStepConditions } from "@/lib/components/characterCreator/creation-step-resolver";

const baseConditions: CreationStepConditions = {
  hasSubraces: false,
  hasRaceVariants: false,
  hasRaceChoiceOptions: false,
  hasSubclasses: false,
  hasLevelOneSubclassChoices: false,
  hasLevelOneChoices: false,
  hasLevelOneOptionalFeatures: false,
  hasFeatChoice: false,
  hasFeatChoices: false,
  hasBackgroundFeatChoice: false,
  hasBackgroundFeatChoices: false,
  hasExpertiseChoice: false,
  hasLanguageChoice: false,
};

describe("крок риси раси 2014", () => {
  it.each([
    ["CUSTOM_LINEAGE_TCE", null, true],
    ["HUMAN_2014", "HUMAN_VARIANT", true],
    ["HUMAN_2014", "HUMAN_STANDARD", false],
    ["CHANGELING_MPMM", null, false],
  ])("%s / %s: %s", (raceName, variantName, expected) => {
    expect(hasRaceFeatChoice(raceName, variantName)).toBe(expected);
    const steps = resolveCreationSteps({ ...baseConditions, hasFeatChoice: expected });
    expect(steps.some((step) => step.id === "feat")).toBe(expected);
  });
});
