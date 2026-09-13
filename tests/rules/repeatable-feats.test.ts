import { describe, expect, it } from "vitest";
import {
  findFeatRepeatProblem,
  findFeatRepeatProblemInBatch,
  isFeatCategoryAllowed,
  type FeatInstance,
} from "@/rules/repeatable-feats";

const list = (optionNameEng: string) => ({ groupName: "Список заклинань", optionNameEng });
const skill = (optionNameEng: string) => ({ groupName: "Володіння", optionNameEng });
const damage = (optionNameEng: string) => ({ groupName: "Тип шкоди", optionNameEng });

const SKILLED_TAKEN: FeatInstance = { featName: "SKILLED", choices: [skill("Skilled 2024 (ARCANA)")] };
const MAGIC_INITIATE_CLERIC: FeatInstance = { featName: "MAGIC_INITIATE", choices: [list("Magic Initiate 2024 (Cleric)")] };

describe("KR27.4 — повтор дозволяє сама риса", () => {
  it("рису, якої ще немає, брати можна незалежно від повторюваності", () => {
    expect(findFeatRepeatProblem({ name: "ALERT", isRepeatable: false, choices: [] }, [SKILLED_TAKEN])).toBeNull();
  });

  it("неповторювану рису вдруге не дає — з причиною, а не мовчки", () => {
    expect(findFeatRepeatProblem({ name: "SKILL_EXPERT", isRepeatable: false, choices: [] }, [
      { featName: "SKILL_EXPERT", choices: [] },
    ])).toEqual({ kind: "not-repeatable", featName: "SKILL_EXPERT" });
  });

  it("Skilled береться вдруге без обмежень", () => {
    expect(findFeatRepeatProblem(
      { name: "SKILLED", isRepeatable: true, choices: [skill("Skilled 2024 (ARCANA)")] },
      [SKILLED_TAKEN],
    )).toBeNull();
  });

  it("Magic Initiate вдруге лише з іншим списком заклинань", () => {
    expect(findFeatRepeatProblem(
      { name: "MAGIC_INITIATE", isRepeatable: true, choices: [list("Magic Initiate 2024 (Druid)")] },
      [MAGIC_INITIATE_CLERIC],
    )).toBeNull();
    expect(findFeatRepeatProblem(
      { name: "MAGIC_INITIATE", isRepeatable: true, choices: [list("Magic Initiate 2024 (Cleric)")] },
      [MAGIC_INITIATE_CLERIC],
    )).toEqual({ kind: "same-choice", featName: "MAGIC_INITIATE", groupName: "Список заклинань", optionNameEng: "Magic Initiate 2024 (Cleric)" });
  });

  it("Elemental Adept вдруге лише з іншим типом шкоди", () => {
    const fire = { name: "ELEMENTAL_ADEPT", isRepeatable: true, choices: [damage("Elemental Adept 2024 (FIRE)")] };
    const cold = { name: "ELEMENTAL_ADEPT", isRepeatable: true, choices: [damage("Elemental Adept 2024 (COLD)")] };
    const takenFire: FeatInstance = { featName: "ELEMENTAL_ADEPT", choices: [damage("Elemental Adept 2024 (FIRE)")] };

    expect(findFeatRepeatProblem(cold, [takenFire])).toBeNull();
    expect(findFeatRepeatProblem(fire, [takenFire])).toEqual({
      kind: "same-choice",
      featName: "ELEMENTAL_ADEPT",
      groupName: "Тип шкоди",
      optionNameEng: "Elemental Adept 2024 (FIRE)",
    });
  });

  it("у пакеті створення риси звіряються одна з одною по черзі", () => {
    const cleric = { name: "MAGIC_INITIATE", isRepeatable: true, choices: [list("Magic Initiate 2024 (Cleric)")] };
    const druid = { name: "MAGIC_INITIATE", isRepeatable: true, choices: [list("Magic Initiate 2024 (Druid)")] };
    const alert = { name: "ALERT", isRepeatable: false, choices: [] };

    expect(findFeatRepeatProblemInBatch([cleric, druid])).toBeNull();
    expect(findFeatRepeatProblemInBatch([cleric, cleric])?.kind).toBe("same-choice");
    expect(findFeatRepeatProblemInBatch([alert, alert])?.kind).toBe("not-repeatable");
    expect(findFeatRepeatProblemInBatch([druid], [MAGIC_INITIATE_CLERIC])).toBeNull();
  });
});

describe("KR27.4 — категорію дозволяє джерело вибору", () => {
  it("класовий ASI приймає рису походження, крок бойового стилю — ні", () => {
    expect(isFeatCategoryAllowed("CLASS_ASI", "ORIGIN")).toBe(true);
    expect(isFeatCategoryAllowed("CLASS_ASI", "EPIC_BOON")).toBe(true);
    expect(isFeatCategoryAllowed("FIGHTING_STYLE", "ORIGIN")).toBe(false);
    expect(isFeatCategoryAllowed("BACKGROUND_ORIGIN", "GENERAL")).toBe(false);
    expect(isFeatCategoryAllowed("SPECIES_VERSATILITY", "ORIGIN")).toBe(true);
  });

  it("риса 2014 без категорії проходить будь-яке джерело", () => {
    expect(isFeatCategoryAllowed("BACKGROUND_ORIGIN", null)).toBe(true);
  });
});
