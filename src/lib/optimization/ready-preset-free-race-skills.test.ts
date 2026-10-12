import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { buildRecipeSchema } from "./schema";
import { buildReadyPresetDraft, readyPresetSchema } from "./ready-preset";
import { buildReadyPresetOptions } from "./ready-preset-options";
import { isSavedPresetValid } from "./ready-preset-validation";

const content = findCharacterCreationOptions("RULES_2014");

function loadRuneKnight() {
  const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
  const preset = readyPresetSchema.parse(read("data/rpgbot/ready-builds/fighter-rune-knight-2014.json"));
  const recipe = buildRecipeSchema.parse(read(`data/rpgbot/builds/${preset.buildId}.json`));
  return { preset, recipe };
}

describe("ready preset with free race skills", () => {
  it("replaces the fixed Tabaxi skills with the author's picks", () => {
    const { preset, recipe } = loadRuneKnight();
    const draft = buildReadyPresetDraft(recipe, preset, content);
    const options = buildReadyPresetOptions(draft, content);
    expect(preset.freeRaceSkills).toBe(true);
    expect(draft.skillsSchema?.isTasha).toBe(true);
    expect(options.skills.fixedRace).toEqual([]);
    expect(options.skills.raceCount).toBe(2);
    expect(draft.skills).toEqual(expect.arrayContaining(["MEDICINE", "ANIMAL_HANDLING", "PERCEPTION"]));
    expect(draft.skills).not.toContain("STEALTH");
  });

  it("rejects a saved draft that switches the free race skills off", () => {
    const { preset, recipe } = loadRuneKnight();
    const draft = buildReadyPresetDraft(recipe, preset, content);
    const options = buildReadyPresetOptions(draft, content);
    const switchedOff = { ...draft, skillsSchema: { ...draft.skillsSchema!, isTasha: false } };
    expect(isSavedPresetValid(draft, draft, options)).toBe(true);
    expect(isSavedPresetValid(switchedOff, draft, options)).toBe(false);
  });
});
