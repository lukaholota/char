import { describe, expect, it } from "vitest";
import {
  findCreationStepOrder,
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
    ["race spell after class spells (O48)", { hasSpellChoice: true, hasRaceSpellChoice: true }, ["race", "class", "spells", "background", "asi", "skills", "raceSpells", "equipment", "name"]],
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

  it("конструктор обох редакцій називає кроки раси «Раса» й «Опції раси»", () => {
    const names = resolveCreationSteps({ ...noOptionalSteps, hasRaceChoiceOptions: true }).slice(0, 2).map((step) => step.name);

    expect(names).toEqual(["Раса", "Опції раси"]);
  });

  it("adds Weapon Mastery only when class data grants capacity", () => {
    const withMastery = resolveIds({ hasWeaponMastery: true } as Partial<CreationStepConditions>);
    const withoutMastery = resolveIds({ hasWeaponMastery: false } as Partial<CreationStepConditions>);

    expect(withMastery).toContain("weaponMastery");
    expect(withoutMastery).not.toContain("weaponMastery");
  });
});

describe("порядок кроків: клас перед расою", () => {
  const resolveClassFirstIds = (conditions: Partial<CreationStepConditions>) =>
    resolveCreationSteps({ ...noOptionalSteps, ...conditions }, "CLASS_FIRST").map((step) => step.id);

  it("ставить клас із його кроками перед расою з її кроками, решта порядку не змінюється", () => {
    expect(resolveClassFirstIds({ hasSubclasses: true, hasLevelOneChoices: true, hasSubraces: true, hasRaceChoiceOptions: true })).toEqual(
      ["class", "subclass", "classChoices", "race", "raceDetails", "raceChoices", "background", "asi", "skills", "equipment", "name"],
    );
  });

  it("ставить заклинання класу після навичок, а заклинання раси лишає після них", () => {
    expect(resolveClassFirstIds({ hasWeaponMastery: true, hasSpellChoice: true, hasRaceSpellChoice: true, hasSubraces: true })).toEqual(
      ["class", "weaponMastery", "race", "raceDetails", "background", "asi", "skills", "spells", "raceSpells", "equipment", "name"],
    );
  });

  it("має ті самі кроки, що й старий порядок", () => {
    const conditions = { hasSubraces: true, hasSubclasses: true, hasFeatChoice: true, hasExpertiseChoice: true };
    expect(resolveClassFirstIds(conditions).sort()).toEqual(resolveIds(conditions).sort());
  });

  it("лишає «раса → клас» за замовчуванням і для 2024", () => {
    expect(resolveIds({})[0]).toBe("race");
    expect(findCreationStepOrder("RULES_2024")).toBe("RACE_FIRST");
    expect(findCreationStepOrder("RULES_2014")).toBe("CLASS_FIRST");
  });
});

