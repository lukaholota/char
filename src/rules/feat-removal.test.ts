import { describe, expect, it } from "vitest";
import {
  findActualAbilityIncreases,
  findHitPointsAfterRemoval,
  readFeatGrantRecord,
  removeAbilityIncreases,
  removeTextLines,
} from "./feat-removal";

const scores = { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 10, CHA: 8 };

describe("відкат риси", () => {
  it("знімок бере фактичну різницю: на 20 Сили +1 нічого не дав і відкочувати нема чого", () => {
    expect(findActualAbilityIncreases({ ...scores, STR: 20 }, { ...scores, STR: 20 })).toEqual([]);
    expect(findActualAbilityIncreases(scores, { ...scores, CON: 15 })).toEqual([{ ability: "CON", amount: 1 }]);
    expect(removeAbilityIncreases({ ...scores, CON: 15 }, [{ ability: "CON", amount: 1 }])).toEqual(scores);
  });

  it("хіти рахуються з поточного стану: Міцний — 2 за кожен теперішній рівень, Статура — лише коли падає модифікатор", () => {
    const toughAtEight = { level: 8, scores, maxHp: 80, currentHp: 70, isTough: true };
    expect(findHitPointsAfterRemoval(toughAtEight, scores)).toEqual({ maxHp: 64, currentHp: 54 });

    const resilientAtSix = { level: 6, scores: { ...scores, CON: 14 }, maxHp: 56, currentHp: 56, isTough: false };
    expect(findHitPointsAfterRemoval(resilientAtSix, { ...scores, CON: 13 })).toEqual({ maxHp: 50, currentHp: 50 });
    expect(findHitPointsAfterRemoval({ ...resilientAtSix, scores: { ...scores, CON: 15 } }, { ...scores, CON: 14 })).toEqual({ maxHp: 56, currentHp: 56 });
  });

  it("поранений персонаж не йде в мінус", () => {
    expect(findHitPointsAfterRemoval({ level: 10, scores, maxHp: 90, currentHp: 5, isTough: true }, scores)).toEqual({ maxHp: 70, currentHp: 0 });
  });

  it("знімає з тексту лише рядки риси", () => {
    expect(removeTextLines("Загальна\nЕльфійська\nОбери ще 3", ["Обери ще 3"])).toBe("Загальна\nЕльфійська");
  });

  it("знімок із бази читається лише повним і правильним", () => {
    const record = {
      abilityIncreases: [{ ability: "CON", amount: 1 }],
      saveProficiencies: ["CON"],
      proficientSkills: [],
      expertiseSkills: [{ skill: "HISTORY", previous: "PROFICIENT" }],
      featureIds: [3],
      spellIds: [],
      languageLines: [],
      proficiencyLines: [],
    };
    expect(readFeatGrantRecord(record)).toEqual(record);
    expect(readFeatGrantRecord({ ...record, saveProficiencies: ["LUCK"] })).toBeNull();
    expect(readFeatGrantRecord({ ...record, spellIds: undefined })).toBeNull();
    expect(readFeatGrantRecord(null)).toBeNull();
  });
});
