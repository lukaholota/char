import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { buildReadyPresetDraft, readyPresetSchema, type ReadyPreset } from "./ready-preset";
import { buildRecipeSchema } from "./schema";
import { buildReadyPresetOptions } from "./ready-preset-options";
import { isSavedPresetValid } from "./ready-preset-validation";
import { buildReadyPresetSkillChoices } from "./ready-preset-skills";
import { findReadyPresetProblems } from "./preset-diagnostics";

const content = findCharacterCreationOptions("RULES_2014");

function readPreset(slug: string) {
  const preset = readyPresetSchema.parse(JSON.parse(readFileSync(`data/rpgbot/ready-builds/${slug}.json`, "utf8")));
  const recipe = buildRecipeSchema.parse(JSON.parse(readFileSync(`data/rpgbot/builds/${preset.buildId}.json`, "utf8")));
  const draft = buildReadyPresetDraft(recipe, preset, content);
  return { preset, recipe, draft, options: buildReadyPresetOptions(draft, content) };
}

function diagnose(slug: string, change: (preset: ReadyPreset) => ReadyPreset): string[] {
  const { preset, recipe } = readPreset(slug);
  return findReadyPresetProblems({ recipe, preset: change(structuredClone(preset)), content }).errors;
}

describe("customized background in a ready preset", () => {
  it("replaces the catalog skills of the background with the two chosen ones", () => {
    const { draft, options } = readPreset("cleric-death-2014");
    expect(draft.backgroundCustomization).toEqual({ skills: ["INSIGHT", "PERCEPTION"], tools: [] });
    expect(draft.skills).toEqual(expect.arrayContaining(["INSIGHT", "PERCEPTION"]));
    expect(draft.skills).not.toContain("PERSUASION");
    expect(options.skills).toMatchObject({ fixedBackground: [], customBackgroundSkillCount: 2 });
  });

  it("counts the languages a tool replaces: Sage gives two, two tools leave none, Tabaxi and Knowledge add three", () => {
    const { draft, options } = readPreset("cleric-knowledge-2014");
    expect(draft.backgroundCustomization?.tools).toEqual(["HERBALISM_KIT", "THIEVES_TOOLS"]);
    expect(options.languageCount).toBe(3);
    expect(draft.languagesSchema?.languages).toHaveLength(3);
  });

  it("keeps standard backgrounds untouched", () => {
    const { draft, options } = readPreset("cleric-peace-2014");
    expect(options.skills.customBackgroundSkillCount).toBe(2);
    const standard = readPreset("fighter-champion-shield-2014");
    expect(standard.draft.backgroundCustomization).toBeUndefined();
    expect(standard.options.skills.customBackgroundSkillCount).toBe(0);
    expect(draft.skillsSchema?.basicChoices.background).toHaveLength(2);
  });

  it.each([
    ["the customization dropped", (draft: ReturnType<typeof readPreset>["draft"]) => ({ ...draft, backgroundCustomization: undefined })],
    ["another pair in the customization", (draft: ReturnType<typeof readPreset>["draft"]) => ({ ...draft, backgroundCustomization: { ...draft.backgroundCustomization!, skills: ["ARCANA", "HISTORY"] as ("ARCANA" | "HISTORY")[] } })],
    ["a tool added to the customization", (draft: ReturnType<typeof readPreset>["draft"]) => ({ ...draft, backgroundCustomization: { ...draft.backgroundCustomization!, tools: ["THIEVES_TOOLS"] as "THIEVES_TOOLS"[] } })],
  ])("rejects a saved draft with %s", (_label, change) => {
    const { draft, options } = readPreset("cleric-death-2014");
    expect(isSavedPresetValid(draft, draft, options)).toBe(true);
    expect(isSavedPresetValid(change(draft), draft, options)).toBe(false);
  });

  it("rejects a background pick that another source already gives", () => {
    const { draft, options } = readPreset("cleric-death-2014");
    const repeated = structuredClone(draft);
    repeated.skillsSchema!.basicChoices.background = ["INSIGHT", "HISTORY"];
    repeated.backgroundCustomization = { skills: ["INSIGHT", "HISTORY"], tools: [] };
    expect(isSavedPresetValid(repeated, draft, options)).toBe(false);
  });

  it("always rebuilds exactly two background skills when customized", () => {
    const { draft, options } = readPreset("cleric-death-2014");
    const reconciled = buildReadyPresetSkillChoices({ ...draft.skillsSchema!.basicChoices, background: ["HISTORY"] }, options.skills);
    expect(reconciled.choices.background).toHaveLength(2);
    expect(reconciled.choices.background).not.toContain("HISTORY");
  });

  it("explains the author-side mistakes", () => {
    expect(diagnose("cleric-death-2014", (preset) => ({ ...preset, backgroundCustomization: undefined }))).toEqual(expect.arrayContaining([expect.stringContaining("backgroundCustomization")]));
    expect(diagnose("cleric-death-2014", (preset) => ({ ...preset, skills: { ...preset.skills, background: ["INSIGHT"] } }))).toEqual(expect.arrayContaining([expect.stringContaining("рівно 2 навички")]));
    expect(diagnose("cleric-death-2014", (preset) => ({ ...preset, backgroundCustomization: { tools: ["THIEVES_TOOLS", "FORGERY_KIT", "HERBALISM_KIT"] } }))).toEqual(expect.arrayContaining([expect.stringContaining("лише мови передісторії")]));
    expect(diagnose("cleric-death-2014", (preset) => ({ ...preset, skills: { ...preset.skills, background: ["INSIGHT", "HISTORY"] } }))).toEqual(expect.arrayContaining([expect.stringContaining("повторює навичку")]));
  });
});

describe("skill of the first-level subclass in a ready preset", () => {
  it("writes the Implement of Peace skill into the draft", () => {
    const { draft, options } = readPreset("cleric-peace-2014");
    expect(draft.skillsSchema?.basicChoices.subclass).toEqual(["INSIGHT"]);
    expect(options.skills).toMatchObject({ subclassCount: 1, subclassOptions: ["INSIGHT", "PERFORMANCE", "PERSUASION"] });
    expect(draft.skills).toContain("INSIGHT");
  });

  it("writes the Order Domain skill and counts all six skills", () => {
    const { draft } = readPreset("cleric-order-2014");
    expect(draft.skillsSchema?.basicChoices.subclass).toEqual(["PERSUASION"]);
    expect(draft.skills).toHaveLength(6);
  });

  it.each([
    ["a skill outside the feature list", ["ARCANA"]],
    ["no skill", []],
    ["two skills", ["INSIGHT", "PERFORMANCE"]],
  ] as const)("rejects %s in a saved draft", (_label, picked) => {
    const { draft, options } = readPreset("cleric-peace-2014");
    const changed = structuredClone(draft);
    changed.skillsSchema!.basicChoices.subclass = [...picked];
    expect(isSavedPresetValid(changed, draft, options)).toBe(false);
  });

  it("reports a missing or invalid subclass skill to the author", () => {
    expect(diagnose("cleric-peace-2014", (preset) => ({ ...preset, skills: { ...preset.skills, subclass: [] } }))).toEqual(expect.arrayContaining([expect.stringContaining("skills.subclass")]));
    expect(diagnose("cleric-peace-2014", (preset) => ({ ...preset, skills: { ...preset.skills, subclass: ["ARCANA"] } }))).toEqual(expect.arrayContaining([expect.stringContaining("skills.subclass")]));
  });

  it("treats Blessings of Knowledge as two picks that also count as already granted skills", () => {
    const { draft, options } = readPreset("cleric-knowledge-2014");
    expect(options.skills.fixedSubclass).toEqual(["ARCANA", "HISTORY"]);
    expect(draft.skills).toEqual(expect.arrayContaining(["ARCANA", "HISTORY"]));
    expect(diagnose("cleric-knowledge-2014", (preset) => ({ ...preset, subclassOptions: ["Blessings of Knowledge: Arcana"] }))).toEqual(expect.arrayContaining([expect.stringContaining("Бракує вибору")]));
    expect(diagnose("cleric-knowledge-2014", (preset) => ({ ...preset, subclassOptions: [...preset.subclassOptions, "Blessings of Knowledge: Nature"] }))).toEqual(expect.arrayContaining([expect.stringContaining("забагато")]));
  });
});
