import { describe, expect, it } from "vitest";
import {
  findBackgroundAsiProblem,
  findBackgroundAsiStep,
  findCompleteBackgroundAsi,
  startBackgroundAsiDraft,
  sumBackgroundAsiBonuses,
  toggleBackgroundAsiSpread,
} from "@/rules/background-asi";

const SOLDIER_OPTIONS = ["STR", "DEX", "CON"];

describe("KR18.2 — крок бонусів походження", () => {
  it("не існує у 2014: там бонуси дає раса, і екран лишається на расових бонусах", () => {
    expect(findBackgroundAsiStep("RULES_2014", SOLDIER_OPTIONS)).toBeNull();
  });

  it("у 2024 віддає три дозволені характеристики й обидва режими розподілу", () => {
    expect(findBackgroundAsiStep("RULES_2024", SOLDIER_OPTIONS)).toEqual({
      allowedAbilities: ["STR", "DEX", "CON"],
      modes: ["+2/+1", "+1/+1/+1"],
    });
  });

  it("не існує, якщо походження не оголосило жодної дозволеної характеристики", () => {
    expect(findBackgroundAsiStep("RULES_2024", [])).toBeNull();
    expect(findBackgroundAsiStep("RULES_2024", null)).toBeNull();
  });

  it("вважає крок незавершеним, поки в режимі +2/+1 не обрані обидві характеристики", () => {
    const step = findBackgroundAsiStep("RULES_2024", SOLDIER_OPTIONS)!;

    expect(findCompleteBackgroundAsi(step, { mode: "+2/+1" })).toBeNull();
    expect(findCompleteBackgroundAsi(step, { mode: "+2/+1", plusTwo: "STR" })).toBeNull();
    expect(findCompleteBackgroundAsi(step, { mode: "+2/+1", plusTwo: "STR", plusOne: "CON" })).toEqual({
      mode: "+2/+1",
      plusTwo: "STR",
      plusOne: "CON",
    });
  });

  it("вважає крок незавершеним, поки в режимі +1/+1/+1 обрані не всі три", () => {
    const step = findBackgroundAsiStep("RULES_2024", SOLDIER_OPTIONS)!;

    expect(findCompleteBackgroundAsi(step, { mode: "+1/+1/+1", abilities: ["STR", "DEX"] })).toBeNull();
    expect(findCompleteBackgroundAsi(step, { mode: "+1/+1/+1", abilities: ["STR", "DEX", "CON"] })).toEqual({
      mode: "+1/+1/+1",
      abilities: ["STR", "DEX", "CON"],
    });
  });

  it("одразу віддає всі три, коли в режимі +1/+1/+1 вибору немає", () => {
    const step = findBackgroundAsiStep("RULES_2024", SOLDIER_OPTIONS)!;
    const draft = startBackgroundAsiDraft("+1/+1/+1", step.allowedAbilities);

    expect(draft).toEqual({ mode: "+1/+1/+1", abilities: ["STR", "DEX", "CON"] });
    expect(findCompleteBackgroundAsi(step, draft)).toEqual({
      mode: "+1/+1/+1",
      abilities: ["STR", "DEX", "CON"],
    });
  });

  it("лишає вибір за гравцем, коли походження дозволяє більше трьох характеристик", () => {
    const step = findBackgroundAsiStep("RULES_2024", ["STR", "DEX", "CON", "WIS"])!;

    expect(startBackgroundAsiDraft("+1/+1/+1", step.allowedAbilities)).toEqual({
      mode: "+1/+1/+1",
      abilities: [],
    });
  });

  it("режим +2/+1 лишається порожнім: там вибір є завжди", () => {
    expect(startBackgroundAsiDraft("+2/+1", ["STR", "DEX", "CON"])).toEqual({ mode: "+2/+1" });
  });

  it("не пускає в режимі +1/+1/+1 понад три характеристики, а повторний клік знімає вибір", () => {
    expect(toggleBackgroundAsiSpread({ mode: "+1/+1/+1", abilities: ["STR", "DEX", "CON"] }, "WIS")).toEqual({
      mode: "+1/+1/+1",
      abilities: ["STR", "DEX", "CON"],
    });
    expect(toggleBackgroundAsiSpread({ mode: "+1/+1/+1", abilities: ["STR", "DEX"] }, "DEX")).toEqual({
      mode: "+1/+1/+1",
      abilities: ["STR"],
    });
  });

  it("відкидає характеристику поза трьома дозволеними ще на екрані", () => {
    const step = findBackgroundAsiStep("RULES_2024", SOLDIER_OPTIONS)!;

    expect(findCompleteBackgroundAsi(step, { mode: "+2/+1", plusTwo: "STR", plusOne: "WIS" })).toBeNull();
  });

  it("мовчить у 2014, вимагає вибір у 2024 і називає причину відмови", () => {
    expect(findBackgroundAsiProblem("RULES_2014", SOLDIER_OPTIONS, undefined)).toBeNull();
    expect(findBackgroundAsiProblem("RULES_2024", SOLDIER_OPTIONS, undefined)).toMatch(/Оберіть бонуси/);
    expect(
      findBackgroundAsiProblem("RULES_2024", SOLDIER_OPTIONS, { mode: "+2/+1", plusTwo: "STR", plusOne: "WIS" }),
    ).toMatch(/не відповідає/);
    expect(
      findBackgroundAsiProblem("RULES_2024", SOLDIER_OPTIONS, { mode: "+2/+1", plusTwo: "STR", plusOne: "CON" }),
    ).toBeNull();
  });

  it("рахує живий підсумок бонусів для незавершеної чернетки", () => {
    expect(sumBackgroundAsiBonuses(null)).toEqual({});
    expect(sumBackgroundAsiBonuses({ mode: "+2/+1", plusTwo: "STR" })).toEqual({ STR: 2 });
    expect(sumBackgroundAsiBonuses({ mode: "+2/+1", plusTwo: "STR", plusOne: "CON" })).toEqual({ STR: 2, CON: 1 });
    expect(sumBackgroundAsiBonuses({ mode: "+1/+1/+1", abilities: ["STR", "DEX", "CON"] })).toEqual({
      STR: 1,
      DEX: 1,
      CON: 1,
    });
  });
});
