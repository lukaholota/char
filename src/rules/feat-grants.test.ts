import { describe, expect, it } from "vitest";
import { applyAbilityIncreases, collectFeatGrants, findFeatHitPointIncrease, type FeatGrantSource } from "./feat-grants";

const baseFeat = (overrides: Partial<FeatGrantSource>): FeatGrantSource => ({
  name: "ANY_FEAT",
  ruleset: "RULES_2014",
  grantedASI: null,
  grantedSkills: null,
  featChoiceOptions: [],
  ...overrides,
});

const option = (choiceOptionId: number, choiceOption: NonNullable<FeatGrantSource["featChoiceOptions"][number]["choiceOption"]>) => ({ choiceOptionId, choiceOption });

describe("надання риси", () => {
  it("фіксоване підвищення читає і плоску мапу, і basic.simple, а «STR_OR_DEX» лишає виборові", () => {
    expect(collectFeatGrants(baseFeat({ grantedASI: { STR: 1 } }), []).abilityIncreases).toEqual([{ ability: "STR", amount: 1 }]);
    expect(collectFeatGrants(baseFeat({ grantedASI: { basic: { simple: { CHA: 1 } } } }), []).abilityIncreases).toEqual([{ ability: "CHA", amount: 1 }]);
    expect(collectFeatGrants(baseFeat({ grantedASI: { STR_OR_DEX: 1 } }), []).abilityIncreases).toEqual([]);
  });

  it("Стійкість через effectKind дає характеристику й ряткидок", () => {
    const feat = baseFeat({ name: "RESILIENT", featChoiceOptions: [option(7, { effectKind: "ASI", effectAbility: "CON", effectAmount: 1 })] });

    expect(collectFeatGrants(feat, [7])).toMatchObject({ abilityIncreases: [{ ability: "CON", amount: 1 }], saveProficiencies: ["CON"] });
  });

  it("Вундеркінд через effectKind дає навичку й експертизу", () => {
    const feat = baseFeat({
      name: "PRODIGY",
      featChoiceOptions: [
        option(3, { optionNameEng: "Prodigy Expertise (INSIGHT)", effectKind: "SKILL_EXPERTISE", effectSkill: "INSIGHT" }),
        option(4, { optionNameEng: "Prodigy Proficiency (STEALTH)", effectKind: "SKILL_PROFICIENCY", effectSkill: "STEALTH" }),
      ],
    });

    expect(collectFeatGrants(feat, [3, 4])).toEqual({ abilityIncreases: [], proficientSkills: ["STEALTH"], expertiseSkills: ["INSIGHT"], saveProficiencies: [] });
  });

  it("опція без effectKind нічого не дає в жодній редакції — назва не читається (BUG-004)", () => {
    const resilient = baseFeat({
      name: "RESILIENT",
      featChoiceOptions: [
        option(1, { optionNameEng: "Resilient (WIS)" }),
        option(2, { optionNameEng: "ATHLETE Ability (Strength)" }),
        option(3, { optionNameEng: "Prodigy Expertise (INSIGHT)" }),
        option(4, { optionNameEng: "Prodigy Proficiency (STEALTH)" }),
      ],
    });
    expect(collectFeatGrants(resilient, [1, 2, 3, 4])).toEqual({ abilityIncreases: [], proficientSkills: [], expertiseSkills: [], saveProficiencies: [] });

    const initiate = baseFeat({ name: "MAGIC_INITIATE", ruleset: "RULES_2024", featChoiceOptions: [option(5, { optionNameEng: "Magic Initiate 2024 (INT)" })] });
    expect(collectFeatGrants(initiate, [5]).abilityIncreases).toEqual([]);
  });

  it("не обрана опція й чужий id нічого не дають, фіксовані навички додаються", () => {
    const feat = baseFeat({ grantedSkills: ["PERCEPTION", "NOT_A_SKILL"], featChoiceOptions: [option(5, { effectKind: "SKILL_EXPERTISE", effectSkill: "ARCANA" })] });

    expect(collectFeatGrants(feat, [99])).toEqual({ abilityIncreases: [], proficientSkills: ["PERCEPTION"], expertiseSkills: [], saveProficiencies: [] });
  });

  it("підвищення впирається в стелю по черзі", () => {
    const scores = { STR: 19, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };

    expect(applyAbilityIncreases(scores, [{ ability: "STR", amount: 1 }, { ability: "STR", amount: 1 }], 20).STR).toBe(20);
  });

  it("хіти риси поза підвищенням: Статура заднім числом за кожен рівень і Здоровань по 2 за рівень", () => {
    expect(findFeatHitPointIncrease({ level: 6, conBefore: 13, conAfter: 14, takesTough: false })).toBe(6);
    expect(findFeatHitPointIncrease({ level: 6, conBefore: 14, conAfter: 15, takesTough: true })).toBe(12);
    expect(findFeatHitPointIncrease({ level: 6, conBefore: 14, conAfter: 14, takesTough: false })).toBe(0);
  });
});
