import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { buildReadyPresetDraft, readyPresetSchema } from "./ready-preset";
import { buildRecipeSchema } from "./schema";
import { buildReadyPresetOptions } from "./ready-preset-options";
import { MISSING_NAME_MESSAGE, buildPresetChoiceContext, checkPresetCreation } from "./ready-preset-creation-check";

function readPreset(slug: string) {
  const content = findCharacterCreationOptions("RULES_2014");
  const preset = readyPresetSchema.parse(JSON.parse(readFileSync(`data/rpgbot/ready-builds/${slug}.json`, "utf8")));
  const recipe = buildRecipeSchema.parse(JSON.parse(readFileSync(`data/rpgbot/builds/${preset.buildId}.json`, "utf8")));
  const draft = buildReadyPresetDraft(recipe, preset, content);
  return { draft: { ...draft, name: " Мирон " }, options: buildReadyPresetOptions(draft, content) };
}

describe("ready preset creation check", () => {
  it("allows the untouched preset with a trimmed name and a negative point counter mid-swap", () => {
    const { draft, options } = readPreset("rogue-thief-2014");
    expect(checkPresetCreation(draft, draft, options, null)).toMatchObject({ blockedBy: null, start: { name: "Мирон" } });
    expect(checkPresetCreation({ ...draft, points: -2 }, draft, options, null).blockedBy).toBeNull();
  });

  it("names what blocks creation: level choices first, then the draft, then the name", () => {
    const { draft, options } = readPreset("druid-dreams-githzerai-2014");
    expect(checkPresetCreation(draft, draft, options, "Оберіть заклинання").blockedBy).toBe("Оберіть заклинання");
    expect(checkPresetCreation({ ...draft, languagesSchema: { languages: [] } }, draft, options, null).blockedBy).toBe("Мови: оберіть усі мови без повторів.");
    expect(checkPresetCreation({ ...draft, name: "  " }, draft, options, null)).toEqual({ start: null, blockedBy: MISSING_NAME_MESSAGE });
  });

  it("has no level choices at the first level or without levels", () => {
    const { draft, options } = readPreset("rogue-thief-2014");
    const picks = { targetLevel: 1, choices: {}, advancements: {}, classOptionChoices: {}, preparedSpellKeys: null };
    expect(buildPresetChoiceContext(null, { ...picks, targetLevel: 5 }, draft, options)).toBeNull();
  });
});
