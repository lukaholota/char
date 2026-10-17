import { describe, expect, it } from "vitest";
import { hasLevelUpExpertiseChoice } from "./levelup-expertise-step";

const ROGUE_EXPERTISE = { engName: "Expertise", skillExpertises: { count: 2, chooseFromCurrentProficiencies: true } };
const BLESSINGS_OF_KNOWLEDGE = { engName: "Blessings of Knowledge", skillExpertises: { count: 2, options: ["ARCANA", "HISTORY", "NATURE", "RELIGION"], getProficiencyAsWell: true } };
const KNOWLEDGE_OPTION = { levelsGranted: [1], choiceOption: { groupName: "Благословення знань", effectKind: "skill_expertise" } };

describe("крок «Експертиза» майстра підвищення рівня", () => {
  it("зʼявляється, коли здібність рівня дає експертизу", () => {
    expect(hasLevelUpExpertiseChoice({ features: [ROGUE_EXPERTISE], subclassChoiceOptions: [], classLevelAfter: 1 })).toBe(true);
  });

  it("не зʼявляється без такої здібності або з порожнім записом експертизи", () => {
    expect(hasLevelUpExpertiseChoice({ features: [{ engName: "Sneak Attack", skillExpertises: null }, { engName: "Odd", skillExpertises: {} }], subclassChoiceOptions: [], classLevelAfter: 1 })).toBe(false);
  });

  it("Благословення знань обирається опціями підкласу цього рівня, а без них — окремим кроком", () => {
    expect(hasLevelUpExpertiseChoice({ features: [BLESSINGS_OF_KNOWLEDGE], subclassChoiceOptions: [KNOWLEDGE_OPTION], classLevelAfter: 1 })).toBe(false);
    expect(hasLevelUpExpertiseChoice({ features: [BLESSINGS_OF_KNOWLEDGE], subclassChoiceOptions: [{ ...KNOWLEDGE_OPTION, levelsGranted: [6] }], classLevelAfter: 1 })).toBe(true);
  });
});
