import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { buildReadyPresetDraft, readyPresetSchema } from "./ready-preset";
import { buildAssemblyStartState } from "./ready-preset-level-context";
import { buildReadyPresetOptions } from "./ready-preset-options";
import { buildReadyPresetLevels } from "./ready-preset-levels.server";
import { buildAssemblyCreationRequest, findAssemblyChoiceProblem, type AssemblyChoiceContext } from "./ready-preset-levels";
import { buildAdvancementSelections, findAdvancementProblem, listAbilityScoresBeforeLevel, type AdvancementChoices } from "./ready-preset-advancements";
import { buildRecipeSchema } from "./schema";

const content = findCharacterCreationOptions("RULES_2014");

function buildOpenContext(advancements: AdvancementChoices = {}, targetLevel = 5): AssemblyChoiceContext {
  const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
  const preset = readyPresetSchema.parse(read("data/rpgbot/ready-builds/barbarian-berserker-2014.json"));
  const recipe = buildRecipeSchema.parse(read(`data/rpgbot/builds/${preset.buildId}.json`));
  recipe.progression.find((step) => step.characterLevel === 4)!.decisions!.openAdvancement = true;
  const draft = buildReadyPresetDraft(recipe, preset, content);
  const options = buildReadyPresetOptions(draft, content);
  return { levels: buildReadyPresetLevels(recipe, content)!, targetLevel, choices: {}, advancements, classOptionChoices: {}, preparedSpellKeys: null, start: buildAssemblyStartState(draft, options) };
}

describe("open advancement of a ready preset level", () => {
  it("describes the author's default and offers a pool of simple feats", () => {
    const { levels } = buildOpenContext();
    const step = levels.steps.find((entry) => entry.characterLevel === 4)!;
    expect(step.advancement?.default).toEqual({ kind: "asi", abilities: ["STR", "STR"] });
    expect(levels.steps.find((entry) => entry.characterLevel === 3)?.advancement).toBeNull();
    const resilient = levels.featPool.find((feat) => feat.key === "RESILIENT")!;
    expect(resilient.options.map((option) => option.gains)).toContainEqual([{ ability: "CON", amount: 1 }]);
    expect(levels.featPool.map((feat) => feat.key)).toContain("LUCKY");
    expect(levels.featPool.map((feat) => feat.key)).not.toContain("MAGIC_INITIATE");
  });

  it("accepts the default and a chosen feat or increase, and counts what each of them gives", () => {
    expect(findAdvancementProblem(buildOpenContext())).toBeNull();
    expect(findAdvancementProblem(buildOpenContext({ "4": { kind: "feat", featKey: "LUCKY", optionNameEng: null } }))).toBeNull();
    const withDefault = listAbilityScoresBeforeLevel(buildOpenContext(), 5);
    const withFeat = listAbilityScoresBeforeLevel(buildOpenContext({ "4": { kind: "feat", featKey: "RESILIENT", optionNameEng: "Resilient (Constitution)" } }), 5);
    expect(withFeat.STR).toBe(withDefault.STR - 2);
    expect(withFeat.CON).toBe(withDefault.CON + 1);
  });

  it("reports a feat outside the pool, a feat without its option, a repeated feat and a score above 20", () => {
    expect(findAdvancementProblem(buildOpenContext({ "4": { kind: "feat", featKey: "MAGIC_INITIATE", optionNameEng: null } }))).toContain("Рівень 4");
    expect(findAdvancementProblem(buildOpenContext({ "4": { kind: "feat", featKey: "RESILIENT", optionNameEng: null } }))).toContain("оберіть характеристику");
    const capped = buildOpenContext();
    capped.start = { ...capped.start, abilities: { ...capped.start.abilities, STR: 20 } };
    expect(findAdvancementProblem(capped)).toContain("20");
    const owned = buildOpenContext({ "4": { kind: "feat", featKey: "LUCKY", optionNameEng: null } });
    owned.start = { ...owned.start, featKeys: ["LUCKY"] };
    expect(findAdvancementProblem(owned)).toContain("вже є");
  });

  it("sends only the levels the player changed", () => {
    const untouched = buildOpenContext();
    expect(buildAdvancementSelections(untouched.levels, 5, {})).toEqual([]);
    expect(buildAdvancementSelections(untouched.levels, 5, { "4": { kind: "asi", abilities: ["CON", "DEX"] } })).toEqual([
      { characterLevel: 4, abilityScoreIncrease: [{ ability: "CON", amount: 1 }, { ability: "DEX", amount: 1 }] },
    ]);
    expect(buildAdvancementSelections(untouched.levels, 5, { "4": { kind: "asi", abilities: ["CON", "CON"] } })[0].abilityScoreIncrease).toEqual([{ ability: "CON", amount: 2 }]);
    expect(buildAdvancementSelections(untouched.levels, 5, { "4": { kind: "feat", featKey: "RESILIENT", optionNameEng: "Resilient (Wisdom)" } })).toEqual([
      { characterLevel: 4, featKey: "RESILIENT", featOptions: [{ optionNameEng: "Resilient (Wisdom)" }] },
    ]);
    expect(buildAdvancementSelections(untouched.levels, 3, { "4": { kind: "asi", abilities: ["CON", "DEX"] } })).toEqual([]);
  });

  it("is part of the page check and of the creation request", () => {
    const context = buildOpenContext({ "4": { kind: "feat", featKey: "LUCKY", optionNameEng: null } });
    expect(findAssemblyChoiceProblem(context)).toBeNull();
    const request = buildAssemblyCreationRequest({ preset: { buildId: "b", revisionId: "r" }, requestId: "id", start: {} as never, context });
    expect(request.openAdvancements).toEqual([{ characterLevel: 4, featKey: "LUCKY" }]);
    expect(findAssemblyChoiceProblem({ ...context, advancements: { "4": { kind: "feat", featKey: "MAGIC_INITIATE", optionNameEng: null } } })).toContain("обрану рису");
  });
});
