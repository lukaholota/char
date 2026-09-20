import { describe, expect, it } from "vitest";

import { isCreationStepCompleted } from "@/lib/components/characterCreator/creation-step-completion";
import { resolveCreationSteps } from "@/lib/components/characterCreator/creation-step-resolver";

const everyStepId = resolveCreationSteps({
  is2024: true,
  hasSubraces: true,
  hasRaceVariants: true,
  hasRaceChoiceOptions: true,
  hasSpeciesFeatChoices: true,
  hasSubclasses: true,
  hasLevelOneSubclassChoices: true,
  hasLevelOneChoices: true,
  hasLevelOneOptionalFeatures: true,
  hasWeaponMastery: true,
  hasSpellChoice: true,
  hasFeatSpellChoice: true,
  hasFeatChoice: true,
  hasFeatChoices: true,
  hasBackgroundFeatChoice: true,
  hasBackgroundFeatChoices: true,
  hasExpertiseChoice: true,
  hasLanguageChoice: true,
}).map((step) => step.id);

/// Кожен крок, який резолвер уміє показати, мусить мати ознаку завершення:
/// без неї галочка не зʼявляється ніколи, як це сталося з кроком мов.
const filledFormData = {
  raceId: 1,
  subraceId: 1,
  raceChoiceSelections: { 1: 2 },
  speciesFeatChoiceSelections: { 1: 2 },
  classId: 1,
  subclassId: 1,
  subclassChoiceSelections: { 1: 2 },
  classChoiceSelections: { 1: 2 },
  classOptionalFeatureSelections: { 1: 2 },
  weaponMasteryWeaponIds: [1],
  classSpells: { preparedIds: [1] },
  backgroundId: 1,
  asiSystem: "STANDARD_ARRAY",
  skills: ["ATHLETICS"],
  expertiseSchema: { expertises: ["ATHLETICS"] },
  languagesSchema: { languages: ["ELVISH"] },
  featId: 1,
  featChoiceSelections: { 1: 2 },
  backgroundFeatId: 1,
  backgroundFeatChoiceSelections: { 1: 2 },
  featSpellSelections: { 1: [1] },
  equipmentSchema: { choiceGroupToId: { 1: 2 } },
  name: "Тестовий",
};

describe("isCreationStepCompleted", () => {
  it("визнає завершеним кожен крок, який резолвер уміє показати", () => {
    const unrecognised = everyStepId.filter((id) => !isCreationStepCompleted(id, filledFormData));
    expect(unrecognised).toEqual([]);
  });

  it("не визнає крок мов завершеним без вибраних мов", () => {
    expect(isCreationStepCompleted("languages", {})).toBe(false);
    expect(isCreationStepCompleted("languages", { languagesSchema: { languages: [] } })).toBe(false);
  });

  it("визнає крок мов завершеним після вибору", () => {
    expect(isCreationStepCompleted("languages", { languagesSchema: { languages: ["ELVISH"] } })).toBe(true);
  });
});
