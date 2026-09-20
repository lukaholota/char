import { describe, expect, it } from "vitest";
import {
  resolveCreationSteps,
  type CreationStepConditions,
} from "./creation-step-resolver";

const noOptionalSteps: CreationStepConditions = {
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

const resolveIds = (conditions: Partial<CreationStepConditions>) =>
  resolveCreationSteps({ ...noOptionalSteps, ...conditions }).map((step) => step.id);

describe("KR4.2 — creation step resolver", () => {
  it.each([
    ["subrace", { hasSubraces: true }, ["race", "raceDetails", "class", "background", "asi", "skills", "equipment", "name"]],
    ["species feat with choices (KR27.4)", { hasRaceChoiceOptions: true, hasSpeciesFeatChoices: true }, ["race", "raceChoices", "speciesFeatChoices", "class", "background", "asi", "skills", "equipment", "name"]],
    ["race variant", { hasRaceVariants: true }, ["race", "raceDetails", "class", "background", "asi", "skills", "equipment", "name"]],
    ["subrace and race variant", { hasSubraces: true, hasRaceVariants: true }, ["race", "raceDetails", "class", "background", "asi", "skills", "equipment", "name"]],
    ["race choice options", { hasRaceChoiceOptions: true }, ["race", "raceChoices", "class", "background", "asi", "skills", "equipment", "name"]],
    ["class and subclass choices", { hasSubclasses: true, hasLevelOneSubclassChoices: true, hasLevelOneChoices: true, hasLevelOneOptionalFeatures: true }, ["race", "class", "subclass", "subclassChoices", "classChoices", "classOptional", "background", "asi", "skills", "equipment", "name"]],
    ["variant feat and its choices", { hasFeatChoice: true, hasFeatChoices: true }, ["race", "class", "background", "asi", "skills", "feat", "featChoices", "equipment", "name"]],
    ["background feat and its choices", { hasBackgroundFeatChoice: true, hasBackgroundFeatChoices: true }, ["race", "class", "background", "asi", "skills", "backgroundFeat", "backgroundFeatChoices", "equipment", "name"]],
    ["expertise and languages", { hasExpertiseChoice: true, hasLanguageChoice: true }, ["race", "class", "background", "asi", "skills", "expertise", "languages", "equipment", "name"]],
    ["longest path", { hasSubraces: true, hasRaceVariants: true, hasRaceChoiceOptions: true, hasSubclasses: true, hasLevelOneSubclassChoices: true, hasLevelOneChoices: true, hasLevelOneOptionalFeatures: true, hasFeatChoice: true, hasFeatChoices: true, hasBackgroundFeatChoice: true, hasBackgroundFeatChoices: true, hasExpertiseChoice: true, hasLanguageChoice: true }, ["race", "raceDetails", "raceChoices", "class", "subclass", "subclassChoices", "classChoices", "classOptional", "background", "asi", "skills", "feat", "featChoices", "backgroundFeat", "backgroundFeatChoices", "expertise", "languages", "equipment", "name"]],
  ])("returns the exact ordered ids for %s", (_scenario, conditions, expectedIds) => {
    expect(resolveIds(conditions)).toEqual(expectedIds);
  });

  it("keeps the race detail label specific to the available choices", () => {
    expect(resolveCreationSteps({ ...noOptionalSteps, hasSubraces: true })[1]).toMatchObject({ id: "raceDetails", name: "Підраса", component: "raceDetails" });
    expect(resolveCreationSteps({ ...noOptionalSteps, hasRaceVariants: true })[1]).toMatchObject({ id: "raceDetails", name: "Варіант раси", component: "raceDetails" });
    expect(resolveCreationSteps({ ...noOptionalSteps, hasSubraces: true, hasRaceVariants: true })[1]).toMatchObject({ id: "raceDetails", name: "Підраса чи Варіант", component: "raceDetails" });
  });

  it("KR31.14 — конструктор 2024 називає кроки виду «Вид», а 2014 лишає «Раса»", () => {
    const names = (is2024: boolean) =>
      resolveCreationSteps({ ...noOptionalSteps, hasRaceChoiceOptions: true, is2024 }).slice(0, 2).map((step) => step.name);

    expect(names(true)).toEqual(["Вид", "Опції виду"]);
    expect(names(false)).toEqual(["Раса", "Опції раси"]);
  });

  it("adds Weapon Mastery only when class data grants capacity", () => {
    const withMastery = resolveIds({ hasWeaponMastery: true } as Partial<CreationStepConditions>);
    const withoutMastery = resolveIds({ hasWeaponMastery: false } as Partial<CreationStepConditions>);

    expect(withMastery).toContain("weaponMastery");
    expect(withoutMastery).not.toContain("weaponMastery");
  });
});
