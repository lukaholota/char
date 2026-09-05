import { describe, expect, it } from "vitest";
import {
  BACKGROUND_ASI_MODES,
  findBackgroundAsiProblem,
  findBackgroundAsiStep,
  findCompleteBackgroundAsi,
  sumBackgroundAsiBonuses,
} from "@/rules/background-asi";

const OPTIONS = ["STR", "DEX", "CON"];

describe("findBackgroundAsiStep", () => {
  it("не дає кроку в 2014 — бонуси там від раси", () => {
    expect(findBackgroundAsiStep("RULES_2014", OPTIONS)).toBeNull();
  });

  it("дає крок із дозволеними характеристиками й обома режимами в 2024", () => {
    expect(findBackgroundAsiStep("RULES_2024", OPTIONS)).toEqual({
      allowedAbilities: ["STR", "DEX", "CON"],
      modes: BACKGROUND_ASI_MODES,
    });
  });

  it("відсіює сміття зі списку характеристик", () => {
    expect(findBackgroundAsiStep("RULES_2024", ["STR", "LUCK", "WIS"])?.allowedAbilities).toEqual([
      "STR",
      "WIS",
    ]);
  });

  it("не дає кроку, коли характеристик немає або список не масив", () => {
    expect(findBackgroundAsiStep("RULES_2024", [])).toBeNull();
    expect(findBackgroundAsiStep("RULES_2024", null)).toBeNull();
    expect(findBackgroundAsiStep("RULES_2024", undefined)).toBeNull();
  });
});

describe("findCompleteBackgroundAsi", () => {
  const step = { allowedAbilities: ["STR", "DEX", "CON"] as const, modes: BACKGROUND_ASI_MODES };

  it("повертає null, поки чернетки немає", () => {
    expect(findCompleteBackgroundAsi({ ...step, allowedAbilities: [...step.allowedAbilities] }, null)).toBeNull();
  });

  it("повертає null, поки +2/+1 заповнений наполовину", () => {
    const half = findCompleteBackgroundAsi(
      { ...step, allowedAbilities: [...step.allowedAbilities] },
      { mode: "+2/+1", plusTwo: "STR" }
    );
    expect(half).toBeNull();
  });

  it("віддає повний і дозволений +2/+1", () => {
    expect(
      findCompleteBackgroundAsi(
        { ...step, allowedAbilities: [...step.allowedAbilities] },
        { mode: "+2/+1", plusTwo: "STR", plusOne: "DEX" }
      )
    ).toEqual({ mode: "+2/+1", plusTwo: "STR", plusOne: "DEX" });
  });

  it("відкидає вибір поза дозволеними характеристиками", () => {
    expect(
      findCompleteBackgroundAsi(
        { ...step, allowedAbilities: [...step.allowedAbilities] },
        { mode: "+2/+1", plusTwo: "WIS", plusOne: "DEX" }
      )
    ).toBeNull();
  });

  it("віддає повний +1/+1/+1", () => {
    expect(
      findCompleteBackgroundAsi(
        { ...step, allowedAbilities: [...step.allowedAbilities] },
        { mode: "+1/+1/+1", abilities: ["STR", "DEX", "CON"] }
      )
    ).toEqual({ mode: "+1/+1/+1", abilities: ["STR", "DEX", "CON"] });
  });
});

describe("findBackgroundAsiProblem", () => {
  it("мовчить у 2014", () => {
    expect(findBackgroundAsiProblem("RULES_2014", OPTIONS, null)).toBeNull();
  });

  it("просить обрати бонуси, коли вибору ще немає", () => {
    expect(findBackgroundAsiProblem("RULES_2024", OPTIONS, null)).toContain("Оберіть");
  });

  it("скаржиться на розподіл поза характеристиками походження", () => {
    expect(
      findBackgroundAsiProblem("RULES_2024", OPTIONS, {
        mode: "+2/+1",
        plusTwo: "WIS",
        plusOne: "DEX",
      })
    ).toContain("не відповідає");
  });

  it("мовчить на правильному розподілі", () => {
    expect(
      findBackgroundAsiProblem("RULES_2024", OPTIONS, {
        mode: "+2/+1",
        plusTwo: "STR",
        plusOne: "DEX",
      })
    ).toBeNull();
  });
});

describe("sumBackgroundAsiBonuses", () => {
  it("віддає порожнє на відсутній чернетці", () => {
    expect(sumBackgroundAsiBonuses(null)).toEqual({});
    expect(sumBackgroundAsiBonuses(undefined)).toEqual({});
  });

  it("рахує частковий +2/+1 для живого підсумку", () => {
    expect(sumBackgroundAsiBonuses({ mode: "+2/+1", plusTwo: "STR" })).toEqual({ STR: 2 });
    expect(sumBackgroundAsiBonuses({ mode: "+2/+1", plusOne: "DEX" })).toEqual({ DEX: 1 });
  });

  it("складає обидва бонуси, коли вони на одній характеристиці", () => {
    expect(sumBackgroundAsiBonuses({ mode: "+2/+1", plusTwo: "STR", plusOne: "STR" })).toEqual({
      STR: 3,
    });
  });

  it("рахує +1/+1/+1 і складає повтори", () => {
    expect(sumBackgroundAsiBonuses({ mode: "+1/+1/+1", abilities: ["STR", "DEX", "CON"] })).toEqual({
      STR: 1,
      DEX: 1,
      CON: 1,
    });
    expect(sumBackgroundAsiBonuses({ mode: "+1/+1/+1", abilities: ["STR", "STR", "DEX"] })).toEqual({
      STR: 2,
      DEX: 1,
    });
  });
});
