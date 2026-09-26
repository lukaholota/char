import { describe, expect, it } from "vitest";
import { findMulticlassProficiencies } from "./multiclass-proficiencies";

/**
 * Таблиця 2014 — `data/2014/srd/03_Characterization/Multiclassing.md:47-63`,
 * таблиця 2024 — розділ «As a Multiclass Character» кожного класу в `data/2024/srd/classes.md`.
 */
describe("скорочені володіння мультикласу", () => {
  describe("2014", () => {
    it("воїн дає легкий, середній обладунок, щити, просту й бойову зброю", () => {
      expect(findMulticlassProficiencies("FIGHTER_2014")).toMatchObject({
        armor: ["LIGHT", "MEDIUM", "SHIELD"],
        weapons: { type: ["SIMPLE_WEAPON", "MARTIAL_WEAPON"] },
      });
    });

    it("варвар дає просту зброю, на відміну від 2024", () => {
      expect(findMulticlassProficiencies("BARBARIAN_2014")?.weapons?.type).toContain(
        "SIMPLE_WEAPON",
      );
      expect(findMulticlassProficiencies("BARBARIAN_2024")?.weapons?.type).not.toContain(
        "SIMPLE_WEAPON",
      );
    });

    it("друїд дає середній обладунок, на відміну від 2024", () => {
      expect(findMulticlassProficiencies("DRUID_2014")?.armor).toContain("MEDIUM");
      expect(findMulticlassProficiencies("DRUID_2024")?.armor).not.toContain("MEDIUM");
    });

    it("монах дає просту зброю й короткі мечі, а 2024 не дає нічого", () => {
      expect(findMulticlassProficiencies("MONK_2014")?.weapons).toEqual({
        type: ["SIMPLE_WEAPON"],
        specific: ["SHORTSWORD"],
      });
      expect(findMulticlassProficiencies("MONK_2024")?.weapons).toBeNull();
    });

    it("чаклун дає просту зброю на додачу до легкого обладунку", () => {
      expect(findMulticlassProficiencies("WARLOCK_2014")).toMatchObject({
        armor: ["LIGHT"],
        weapons: { type: ["SIMPLE_WEAPON"] },
      });
    });

    it("пройдисвіт дає злодійські інструменти й навичку на вибір", () => {
      expect(findMulticlassProficiencies("ROGUE_2014")).toMatchObject({
        armor: ["LIGHT"],
        tools: ["THIEVES_TOOLS"],
        skillChoiceCount: 1,
      });
    });

    it("бард дає інструмент і навичку на вибір", () => {
      expect(findMulticlassProficiencies("BARD_2014")).toMatchObject({
        armor: ["LIGHT"],
        toolChoiceCount: 1,
        skillChoiceCount: 1,
      });
    });

    it("чаротворець і чарівник у книзі мають прочерк", () => {
      for (const className of ["SORCERER_2014", "WIZARD_2014"]) {
        expect(findMulticlassProficiencies(className)).toEqual({
          armor: [],
          weapons: null,
          tools: [],
          toolChoiceCount: 0,
          skillChoiceCount: 0,
        });
      }
    });

    it("жоден клас не дає важкого обладунку — його дає лише початковий клас", () => {
      for (const className of ["FIGHTER_2014", "PALADIN_2014", "CLERIC_2014", "RANGER_2014"]) {
        expect(findMulticlassProficiencies(className)?.armor).not.toContain("HEAVY");
      }
    });
  });

  it("артифайсер не має рядка в жодній редакції — таблиці немає в репозиторії", () => {
    expect(findMulticlassProficiencies("ARTIFICER_2014")).toBeNull();
    expect(findMulticlassProficiencies("ARTIFICER_2024")).toBeNull();
  });

  it("мисливець за кровʼю в обох редакціях дає легкий, середній обладунок, щити, просту й бойову зброю та інструменти алхіміка, без навички", () => {
    for (const className of ["BLOOD_HUNTER_2014", "BLOOD_HUNTER_2024"]) {
      expect(findMulticlassProficiencies(className), className).toEqual({
        armor: ["LIGHT", "MEDIUM", "SHIELD"],
        weapons: { type: ["SIMPLE_WEAPON", "MARTIAL_WEAPON"] },
        tools: ["ALCHEMISTS_SUPPLIES"],
        toolChoiceCount: 0,
        skillChoiceCount: 0,
      });
    }
  });

  it("2024 не зрушив: воїн лишається без простої зброї", () => {
    expect(findMulticlassProficiencies("FIGHTER_2024")).toMatchObject({
      armor: ["LIGHT", "MEDIUM", "SHIELD"],
      weapons: { type: ["MARTIAL_WEAPON"] },
    });
  });
});
