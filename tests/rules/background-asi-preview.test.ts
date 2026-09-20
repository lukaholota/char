import { describe, expect, it } from "vitest";
import {
  buildCreationAbilityScores,
  buildScoresBeforeBackgroundAsi,
  type CreationAbilityInput,
} from "@/rules/character-creation";
import { raiseScoresByBackgroundAsi, sumBackgroundAsiBonuses } from "@/rules/background-asi";
import type { BackgroundASIChoice } from "@/rules/types";

const baseInput: Omit<CreationAbilityInput, "backgroundAsiChoice" | "feats"> = {
  ruleset: "RULES_2024",
  asiSystem: "CUSTOM",
  pointBuy: [],
  simple: [],
  custom: [
    { ability: "STR", value: "10" },
    { ability: "DEX", value: "14" },
    { ability: "CON", value: "13" },
    { ability: "INT", value: "19" },
    { ability: "WIS", value: "12" },
    { ability: "CHA", value: "15" },
  ],
  isDefaultASI: true,
  raceASI: null,
  subraceReplacesASI: false,
  raceChoiceAbilityBonuses: [{ ASI: { CHA: 1 } }],
  backgroundAbilityOptions: ["STR", "INT", "CHA"],
};

const choices: BackgroundASIChoice[] = [
  { mode: "+2/+1", plusTwo: "INT", plusOne: "CHA" },
  { mode: "+2/+1", plusTwo: "CHA", plusOne: "STR" },
  { mode: "+1/+1/+1", abilities: ["STR", "INT", "CHA"] },
];

describe("прев'ю бонусів походження на кроці «Характеристики»", () => {
  it("рахує «до» з бази активної вкладки та бонусів опцій раси", () => {
    expect(buildScoresBeforeBackgroundAsi(baseInput)).toEqual({
      STR: 10,
      DEX: 14,
      CON: 13,
      INT: 19,
      WIS: 12,
      CHA: 16,
    });
  });

  it.each(choices)("«стане» дорівнює тому, що створення запише: %o", (choice) => {
    const before = buildScoresBeforeBackgroundAsi(baseInput);
    const preview = raiseScoresByBackgroundAsi(before, sumBackgroundAsiBonuses(choice));
    const created = buildCreationAbilityScores({ ...baseInput, backgroundAsiChoice: choice, feats: [] }).scores;

    expect(preview).toEqual(created);
  });
});
