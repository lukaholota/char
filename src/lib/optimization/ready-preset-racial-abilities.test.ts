import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { buildReadyPresetDraft, readyPresetSchema } from "./ready-preset";
import { buildRecipeSchema } from "./schema";
import { buildReadyPresetOptions } from "./ready-preset-options";
import { buildPresetAbilityScores, buildPresetAbilitySources, listPresetChosenRacialBonuses } from "./ready-preset-abilities";
import { findReadyPresetProblems } from "./preset-diagnostics";
import { isSavedPresetValid } from "./ready-preset-validation";

const content = findCharacterCreationOptions("RULES_2014");

function readPreset(slug: string) {
  const preset = readyPresetSchema.parse(JSON.parse(readFileSync(`data/rpgbot/ready-builds/${slug}.json`, "utf8")));
  const recipe = buildRecipeSchema.parse(JSON.parse(readFileSync(`data/rpgbot/builds/${preset.buildId}.json`, "utf8")));
  return { preset, recipe };
}

describe("ready preset with Tasha racial ability rules", () => {
  const { preset, recipe } = readPreset("rogue-mastermind-2014");
  const draft = buildReadyPresetDraft(recipe, preset, content);

  it("fills the custom origin choices and leaves the classic ones empty", () => {
    expect(draft.isDefaultASI).toBe(false);
    expect(draft.racialBonusChoiceSchema).toEqual({
      basicChoices: [],
      tashaChoices: [
        { groupIndex: 0, choiceCount: 2, selectedAbilities: ["DEX", "CHA"] },
        { groupIndex: 1, choiceCount: 1, selectedAbilities: ["DEX"] },
      ],
    });
  });

  it("counts +2 Dexterity and +1 Charisma on top of the point-buy base", () => {
    const scores = buildPresetAbilityScores(draft, buildPresetAbilitySources(draft, content));
    expect(scores).toEqual({ STR: 8, DEX: 17, CON: 14, INT: 8, WIS: 12, CHA: 15 });
    expect(listPresetChosenRacialBonuses(draft, buildPresetAbilitySources(draft, content))).toEqual([{ ability: "DEX", bonus: 2 }, { ability: "CHA", bonus: 1 }]);
  });

  it("is a valid saved preset, accepts other bonus placement and rejects classic mode or an unfinished group", () => {
    const options = buildReadyPresetOptions(draft, content);
    expect(isSavedPresetValid(draft, draft, options)).toBe(true);
    expect(isSavedPresetValid({ ...draft, isDefaultASI: true }, draft, options)).toBe(false);
    const changed = structuredClone(draft);
    changed.racialBonusChoiceSchema!.tashaChoices[1].selectedAbilities = ["STR"];
    expect(isSavedPresetValid(changed, draft, options)).toBe(true);
    changed.racialBonusChoiceSchema!.tashaChoices[0].selectedAbilities = ["STR"];
    expect(isSavedPresetValid(changed, draft, options)).toBe(false);
  });

  it("names the group layout when the choices do not fit the race", () => {
    const report = findReadyPresetProblems({ recipe, content, preset: { ...preset, racialAbilities: ["DEX", "DEX", "CHA"] } });
    expect(report.errors.join("\n")).toContain("повторює характеристику");
    expect(report.errors.join("\n")).toContain("1) +1 до 2");
    expect(findReadyPresetProblems({ recipe, content, preset: { ...preset, racialAbilities: ["DEX"] } }).errors.join("\n")).toContain("3 підвищень");
  });

  it("does not let a classic race pick up Tasha rules without any group", () => {
    const { preset: classic, recipe: classicRecipe } = readPreset("monk-human-open-hand-2014");
    expect(() => buildReadyPresetDraft(classicRecipe, { ...classic, racialAbilityRules: "tasha", racialAbilities: ["DEX", "WIS"] }, content)).toThrow("Incomplete preset racial ability choices");
  });

  it("builds Tasha rules for a classic race: the chosen +2 replaces the fixed one", () => {
    const { preset: elf, recipe: elfRecipe } = readPreset("rogue-phantom-2014");
    const custom = buildReadyPresetDraft(elfRecipe, { ...elf, racialAbilityRules: "tasha", racialAbilities: ["CON", "WIS"] }, content);
    const scores = buildPresetAbilityScores(custom, buildPresetAbilitySources(custom, content));
    expect(scores).toEqual({ STR: 8, DEX: 15, CON: 17, INT: 10, WIS: 14, CHA: 10 });
  });
});
