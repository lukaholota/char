import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { buildReadyPresetDraft, readyPresetSchema } from "./ready-preset";
import { buildClassOptionSelections, findClassOptionProblem, listOptionCandidates, listOwnedOptionNamesBeforeLevel, type ClassOptionChoices } from "./ready-preset-class-options";
import { buildAssemblyStartState } from "./ready-preset-level-context";
import { buildAssemblyCreationRequest, findAssemblyChoiceProblem, type AssemblyChoiceContext } from "./ready-preset-levels";
import { buildReadyPresetLevels } from "./ready-preset-levels.server";
import { buildReadyPresetOptions } from "./ready-preset-options";
import { buildRecipeSchema } from "./schema";

const content = findCharacterCreationOptions("RULES_2014");

function buildHexbladeContext(classOptionChoices: ClassOptionChoices = {}, targetLevel = 10): AssemblyChoiceContext {
  const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
  const preset = readyPresetSchema.parse(read("data/rpgbot/ready-builds/warlock-hexblade-2014.json"));
  const recipe = buildRecipeSchema.parse(read(`data/rpgbot/builds/${preset.buildId}.json`));
  recipe.progression.find((step) => step.characterLevel === 9)!.decisions!.openClassOptions = true;
  const draft = buildReadyPresetDraft(recipe, preset, content);
  const options = buildReadyPresetOptions(draft, content);
  return { levels: buildReadyPresetLevels(recipe, content)!, targetLevel, choices: {}, advancements: {}, classOptionChoices, preparedSpellKeys: null, start: buildAssemblyStartState(draft, options) };
}

const names = (entries: { nameEng: string }[]) => entries.map((entry) => entry.nameEng);

describe("open class options of a ready preset level", () => {
  it("describes the author's default pick and the pool of the class", () => {
    const { levels } = buildHexbladeContext();
    const step = levels.steps.find((entry) => entry.characterLevel === 9)!;
    expect(step.optionPick?.defaults).toEqual([{ nameEng: "Agonizing Blast", groupName: expect.any(String) }]);
    expect(step.optionNames).toEqual([]);
    expect(levels.steps.find((entry) => entry.characterLevel === 7)?.optionPick).toBeNull();
    expect(names(levels.classOptionPools.WARLOCK_2014)).toContain("Voice of the Chain Master");
  });

  it("offers only options of the group that the class level, the pact and the owned options allow", () => {
    const context = buildHexbladeContext();
    const step = context.levels.steps.find((entry) => entry.characterLevel === 9)!;
    const offered = names(listOptionCandidates(context, step, 0));
    expect(listOwnedOptionNamesBeforeLevel(context, step)).toEqual(expect.arrayContaining(["Pact of the Blade", "Devil's Sight", "Improved Pact Weapon", "Thirsting Blade", "Eldritch Smite"]));
    expect(offered).toContain("Agonizing Blast");
    expect(offered).toContain("Fiendish Vigor");
    expect(offered).not.toContain("Devil's Sight");
    expect(offered).not.toContain("Voice of the Chain Master");
    expect(offered).not.toContain("Lifedrinker");
    expect(offered).not.toContain("Pact of the Chain");
  });

  it("accepts a valid choice, rejects an unavailable or repeated one and sends only the changed level", () => {
    const valid = buildHexbladeContext({ "9": ["Fiendish Vigor"] });
    expect(findClassOptionProblem(valid)).toBeNull();
    expect(findAssemblyChoiceProblem(valid)).toBeNull();
    expect(findClassOptionProblem(buildHexbladeContext({ "9": ["Voice of the Chain Master"] }))).toContain("недоступний");
    expect(findClassOptionProblem(buildHexbladeContext({ "9": ["Devil's Sight"] }))).toContain("Рівень 9");
    expect(buildClassOptionSelections(valid.levels, 10, {})).toEqual([]);
    const request = buildAssemblyCreationRequest({ preset: { buildId: "b", revisionId: "r" }, requestId: "id", start: {} as never, context: valid });
    expect(request.openClassOptions).toEqual([{ characterLevel: 9, classOptions: [{ optionNameEng: "Fiendish Vigor", groupName: expect.any(String) }] }]);
    expect(buildClassOptionSelections(valid.levels, 8, { "9": ["Fiendish Vigor"] })).toEqual([]);
  });
});
