import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { findCharacterCreationOptions, findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { getAllSpells } from "@/lib/spellsData";
import { buildAssemblyCatalog } from "./assembly-catalog";
import { buildAssemblyPlan } from "./assembly-plan";
import { buildAssemblyRequestSchema } from "./assembly-request";
import { buildReadyPresetDraft, readyPresetSchema } from "./ready-preset";
import { buildAssemblyStartState } from "./ready-preset-level-context";
import {
  buildAssemblyCreationRequest, buildOpenSpellSelections, findAssemblyChoiceProblem, findIntelligenceAt, findPreparedKeysProblem, findWizardLevelAt, findSpellPreparation,
  findSlotSchoolLimit, listOpenPickCandidates, listOpenPickSlots, resolvePreparedKeys, type AssemblyChoiceContext, type OpenPickChoices,
} from "./ready-preset-levels";
import { buildReadyPresetLevels } from "./ready-preset-levels.server";
import { buildReadyPresetOptions } from "./ready-preset-options";
import { buildRecipeSchema } from "./schema";

vi.mock("server-only", () => ({}));

const content = findCharacterCreationOptions("RULES_2014");
const catalog = buildAssemblyCatalog(findCharacterCreatorOptions("RULES_2014"), getAllSpells("RULES_2014").map((spell) => ({ spellId: spell.spellId, engName: spell.engName })));

function loadPreset(slug: string) {
  const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
  const preset = readyPresetSchema.parse(read(`data/rpgbot/ready-builds/${slug}.json`));
  const recipe = buildRecipeSchema.parse(read(`data/rpgbot/builds/${preset.buildId}.json`));
  const draft = buildReadyPresetDraft(recipe, preset, content);
  const options = buildReadyPresetOptions(draft, content);
  const levels = buildReadyPresetLevels(recipe, content)!;
  return { preset, recipe, draft, options, levels };
}

function buildContext(slug: string, targetLevel: number, choices: OpenPickChoices = {}, preparedSpellKeys: string[] | null = null) {
  const loaded = loadPreset(slug);
  const context: AssemblyChoiceContext = {
    levels: loaded.levels, targetLevel, choices, advancements: {}, classOptionChoices: {}, preparedSpellKeys, start: buildAssemblyStartState(loaded.draft, loaded.options),
  };
  return { ...loaded, context };
}

describe("compact level data for the page", () => {
  const levelsAfterFirst = Array.from({ length: 19 }, (_, index) => index + 2);

  it.each([["barbarian-berserker-2014", levelsAfterFirst], ["wizard-evocation-2014", levelsAfterFirst], ["sorcadin-clockwork-2014", levelsAfterFirst]])("lists the selectable levels of %s", (slug, targetLevels) => {
    const { levels } = loadPreset(slug);
    expect(levels.targetLevels).toEqual(targetLevels);
    expect(levels.steps.map((step) => step.characterLevel)).toEqual(targetLevels);
  });

  it("returns nothing for a preset without executable higher levels", () => {
    const recipe = buildRecipeSchema.parse(JSON.parse(readFileSync("data/rpgbot/builds/build-bugbear-fiend-warlock-2014.json", "utf8")));
    const levelOneOnly = { ...recipe, supportedLevels: [1], progression: recipe.progression.slice(0, 1).map((step) => ({ ...step, decisions: undefined })) };
    expect(buildReadyPresetLevels(levelOneOnly, content)).toBeNull();
  });

  it("describes the multiclass order, subclasses, feat, options and fixed spells of the Sorcadin", () => {
    const { levels } = loadPreset("sorcadin-clockwork-2014");
    expect(levels.classLevelsByTarget[7].map((entry) => entry.classLevel)).toEqual([3, 4]);
    expect(levels.steps.filter((step) => step.isMulticlassEntry).map((step) => step.characterLevel)).toEqual([4]);
    expect(levels.steps.find((step) => step.characterLevel === 3)?.subclassName).toBeTruthy();
    expect(levels.steps.find((step) => step.characterLevel === 7)?.featName).toBeTruthy();
    expect(levels.steps.find((step) => step.characterLevel === 6)?.optionNames).toHaveLength(2);
    expect(levels.steps.find((step) => step.characterLevel === 4)?.newSpells.cantrips.map((spell) => spell.engName)).toContain("Mage Hand");
  });

  it("describes the ability increase of the Wizard", () => {
    const { levels } = loadPreset("wizard-evocation-2014");
    expect(levels.steps.find((step) => step.characterLevel === 4)?.abilityIncreases).toEqual([{ ability: "INT", amount: 2 }]);
  });

  it("keeps spell pools out of presets without open picks", () => {
    expect(loadPreset("barbarian-berserker-2014").levels.spellPools).toEqual({});
  });

  it("offers a Sorcerer pool limited to the class list and to spell levels the class can cast", () => {
    const { levels } = loadPreset("sorcadin-clockwork-2014");
    const [slot] = listOpenPickSlots(levels, 7);
    const pool = levels.spellPools[slot.poolId];
    expect(Math.max(...pool.map((spell) => spell.level))).toBe(2);
    expect(Math.min(...pool.map((spell) => spell.level))).toBe(1);
    expect(pool.map((spell) => spell.engName)).toEqual(expect.arrayContaining(["Absorb Elements", "Shield"]));
    expect(pool.map((spell) => spell.engName)).not.toContain("Cure Wounds");
  });
});

describe("open spell choices", () => {
  const sorcadinSlot = "7:knownSpells";

  it("lists one slot at the target level only and requires it to be filled", () => {
    expect(listOpenPickSlots(loadPreset("sorcadin-clockwork-2014").levels, 6)).toEqual([]);
    const { context } = buildContext("sorcadin-clockwork-2014", 7);
    expect(listOpenPickSlots(context.levels, 7)).toEqual([expect.objectContaining({ id: sorcadinSlot, count: 1, characterLevel: 7 })]);
    expect(findAssemblyChoiceProblem(context)).toContain("обрано 0 з 1");
  });

  it("accepts a valid pick and the server plan built from it has no issues", () => {
    const { context, recipe } = buildContext("sorcadin-clockwork-2014", 7, { [sorcadinSlot]: ["absorb-elements"] });
    expect(findAssemblyChoiceProblem(context)).toBeNull();
    const result = buildAssemblyPlan({ recipe, targetLevel: 7, catalog, openSelections: buildOpenSpellSelections(context.levels, 7, context.choices) });
    expect(result.issues).toEqual([]);
  });

  it("rejects a spell outside the class pool, a spell already fixed by the plan and one the character already has", () => {
    expect(findAssemblyChoiceProblem(buildContext("sorcadin-clockwork-2014", 7, { [sorcadinSlot]: ["cure-wounds"] }).context)).toContain("недоступне");
    expect(findAssemblyChoiceProblem(buildContext("sorcadin-clockwork-2014", 7, { [sorcadinSlot]: ["magic-missile"] }).context)).toContain("уже має");
  });

  it("does not offer spells that are already taken", () => {
    const { context } = buildContext("sorcadin-clockwork-2014", 7);
    const [slot] = listOpenPickSlots(context.levels, 7);
    const offered = listOpenPickCandidates(context, slot, "").map((spell) => spell.key);
    expect(offered).toContain("absorb-elements");
    expect(offered).not.toContain("magic-missile");
    expect(offered).not.toContain("shield");
  });

  it("sends selections only for levels with open picks and matches the server request schema", () => {
    const { context, preset, draft } = buildContext("sorcadin-clockwork-2014", 7, { [sorcadinSlot]: ["absorb-elements"] });
    expect(buildOpenSpellSelections(context.levels, 7, context.choices)).toEqual([{ characterLevel: 7, knownSpellKeys: ["absorb-elements"] }]);
    expect(buildOpenSpellSelections(context.levels, 5, {})).toEqual([]);
    const requestId = "6f1f1f0e-4d3a-4f5a-9c44-0d8f3e5a7b21";
    const request = buildAssemblyCreationRequest({ preset, requestId, start: { ...draft, name: "Мирон", readyPresetRequestId: requestId }, context });
    expect(request.start.readyPresetRequestId).toBeUndefined();
    expect(buildAssemblyRequestSchema.safeParse(request).success).toBe(true);
    expect(request).toMatchObject({ buildId: preset.buildId, revisionId: preset.revisionId, targetLevel: 7, requestId });
    expect(request).not.toHaveProperty("preparedSpellKeys");
  });
});

describe("Eldritch Knight school limit on open spell picks", () => {
  const slugs = (spells: { school?: string }[]) => [...new Set(spells.map((spell) => spell.school))].sort();

  it("offers only Abjuration and Evocation at level 19, where the any-school picks are used up", () => {
    const { context } = buildContext("fighter-eldritch-knight-2014", 19);
    const [slot] = listOpenPickSlots(context.levels, 19).filter((entry) => entry.characterLevel === 19);
    expect(slot.schoolLimitedSubclassKey).toBe("ELDRITCH_KNIGHT");
    expect(findSlotSchoolLimit(context, slot)).toMatchObject({ outsideAllowed: 0 });
    const offered = listOpenPickCandidates(context, slot, "");
    expect(slugs(offered)).toEqual(["ABJURATION", "EVOCATION"]);
    expect(offered.map((spell) => spell.key)).not.toContain("fear");
    expect(offered.map((spell) => spell.key)).toContain("counterspell");
  });

  it("opens one any-school pick at level 20 and accepts it", () => {
    const { context } = buildContext("fighter-eldritch-knight-2014", 20, { "19:knownSpells": ["counterspell"], "20:knownSpells": ["fear"] });
    const slot = listOpenPickSlots(context.levels, 20).find((entry) => entry.characterLevel === 20)!;
    expect(findSlotSchoolLimit(context, slot)).toMatchObject({ outsideAllowed: 1 });
    expect(listOpenPickCandidates(context, slot, "fear").map((spell) => spell.key)).toContain("fear");
    expect(findAssemblyChoiceProblem(context)).toBeNull();
  });

  it("keeps the level 20 pick in the schools when level 19 already took the any-school pick", () => {
    const { context } = buildContext("fighter-eldritch-knight-2014", 20, { "19:knownSpells": ["counterspell"], "20:knownSpells": ["fear"] });
    const afterIllusionAtNineteen = { ...context, choices: { "19:knownSpells": ["fear"], "20:knownSpells": ["counterspell"] } };
    const slot = listOpenPickSlots(context.levels, 20).find((entry) => entry.characterLevel === 20)!;
    expect(findSlotSchoolLimit(afterIllusionAtNineteen, slot)).toMatchObject({ outsideAllowed: 0 });
    expect(slugs(listOpenPickCandidates(afterIllusionAtNineteen, slot, ""))).toEqual(["ABJURATION", "EVOCATION"]);
  });

  it("explains the limit in Ukrainian when a stale pick is outside the schools", () => {
    const { context } = buildContext("fighter-eldritch-knight-2014", 19, { "19:knownSpells": ["fear"] });
    expect(findAssemblyChoiceProblem(context)).toContain("Лише школи «Захист» і «Втілення»");
    expect(findAssemblyChoiceProblem(buildContext("fighter-eldritch-knight-2014", 19, { "19:knownSpells": ["counterspell"] }).context)).toBeNull();
  });

  it("gives every open pick the step's subclass, so the picker scores for it", () => {
    const { context } = buildContext("warlock-hexblade-2014", 20);
    const slots = listOpenPickSlots(context.levels, 20);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.map((slot) => slot.subclassKey)).toEqual(slots.map(() => "HEXBLADE"));
    expect(slots.every((slot) => slot.schoolLimitedSubclassKey === undefined)).toBe(true);
  });

  it("does not limit the open picks of other casters", () => {
    const { context } = buildContext("sorcadin-clockwork-2014", 7);
    const [slot] = listOpenPickSlots(context.levels, 7);
    expect(slot.schoolLimitedSubclassKey).toBeUndefined();
    expect(findSlotSchoolLimit(context, slot)).toBeNull();
  });
});

describe("list preparation at a higher level", () => {
  it("prepares a Druid from the class list up to the highest slot, without spells the character already gets, and sends the choice", () => {
    const { context, preset, draft } = buildContext("druid-dreams-githzerai-2014", 7);
    const preparation = findSpellPreparation(context)!;
    expect(preparation).toMatchObject({ kind: "list", classLevel: 7, ability: "WIS", abilityScore: 18, limit: 11 });
    const levelOf = new Map(context.levels.listPreparationPool.map((spell) => [spell.key, spell.level]));
    expect(Math.max(...preparation.poolKeys.map((key) => levelOf.get(key)!))).toBe(4);
    expect(preparation.poolKeys).not.toContain("detect-thoughts");
    expect(preparation.poolKeys).not.toContain("mass-cure-wounds");
    const defaults = resolvePreparedKeys(preparation, context);
    expect(defaults).toHaveLength(11);
    expect(defaults.slice(0, context.start.preparedKeys.length)).toEqual(context.start.preparedKeys);
    expect(defaults.some((key) => levelOf.get(key)! > 1)).toBe(true);
    expect(findPreparedKeysProblem(preparation, defaults)).toBeNull();
    expect(findPreparedKeysProblem(preparation, preparation.poolKeys.slice(0, 12))).toContain("Забагато");
    expect(findPreparedKeysProblem(preparation, ["detect-thoughts"])).toContain("зі списку свого класу");
    expect(findSpellPreparation({ ...context, targetLevel: 1 })).toBeNull();
    const request = buildAssemblyCreationRequest({ preset, requestId: "6f1f1f0e-4d3a-4f5a-9c44-0d8f3e5a7b21", start: { ...draft, name: "Ґрат" }, context });
    expect(request.preparedSpellKeys).toEqual(defaults);
  });
});

describe("Wizard preparation at a higher level", () => {
  it("counts the Wizard level and the Intelligence with the ability increases up to the target", () => {
    const { levels, context } = buildContext("wizard-evocation-2014", 5);
    expect(findWizardLevelAt(levels, 5)).toBe(5);
    expect(findWizardLevelAt(levels, 3)).toBe(3);
    const findIntelligence = (targetLevel: number, intelligence: number) => findIntelligenceAt({ ...context, targetLevel, start: { ...context.start, abilities: { ...context.start.abilities, INT: intelligence } } });
    expect(findIntelligence(3, 16)).toBe(16);
    expect(findIntelligence(5, 16)).toBe(18);
    expect(findIntelligence(5, 19)).toBe(20);
    expect(findSpellPreparation(context)).toMatchObject({ kind: "book", classLevel: 5, abilityScore: 18, limit: 9 });
  });

  it("offers the starting book plus the fixed spells of the plan and no preparation at level one or for other classes", () => {
    const { context } = buildContext("wizard-evocation-2014", 5);
    const preparation = findSpellPreparation(context)!;
    expect(preparation.poolKeys).toEqual(expect.arrayContaining(["magic-missile", "identify", "shield", "scorching-ray", "shatter", "flaming-sphere", "misty-step", "fireball", "fly"]));
    expect(findSpellPreparation({ ...context, targetLevel: 1 })).toBeNull();
    expect(findSpellPreparation(buildContext("barbarian-berserker-2014", 5).context)).toBeNull();
  });

  it("starts from the author's preparation, fills the rest by RPGbot score, and rejects too many, foreign or no prepared spells with the server rule", () => {
    const { context } = buildContext("wizard-evocation-2014", 5);
    const preparation = findSpellPreparation(context)!;
    const defaults = resolvePreparedKeys(preparation, context);
    expect(defaults.slice(0, context.start.preparedKeys.length)).toEqual(context.start.preparedKeys);
    expect(defaults).toHaveLength(preparation.limit);
    expect(defaults.every((key) => preparation.poolKeys.includes(key))).toBe(true);
    const scoreOf = (key: string) => context.levels.wizardSpellScores[key] ?? 0;
    const added = defaults.slice(context.start.preparedKeys.length);
    const skipped = preparation.poolKeys.filter((key) => !defaults.includes(key));
    expect(Math.min(...added.map(scoreOf))).toBeGreaterThanOrEqual(Math.max(...skipped.map(scoreOf)));
    expect(findAssemblyChoiceProblem(context)).toBeNull();
    const nine = preparation.poolKeys.slice(0, 9);
    expect(findAssemblyChoiceProblem({ ...context, preparedSpellKeys: nine })).toBeNull();
    expect(findAssemblyChoiceProblem({ ...context, preparedSpellKeys: preparation.poolKeys.slice(0, 10) })).toContain("Забагато");
    expect(findAssemblyChoiceProblem({ ...context, preparedSpellKeys: [] })).toContain("хоча б одне");
    expect(resolvePreparedKeys(preparation, { ...context, preparedSpellKeys: ["wish", nine[0]] })).toEqual([nine[0]]);
  });

  it("always sends the prepared keys the page shows, the default ones until the player changes them", () => {
    const { context, preset, draft } = buildContext("wizard-evocation-2014", 5);
    const requestId = "6f1f1f0e-4d3a-4f5a-9c44-0d8f3e5a7b21";
    const base = { preset, requestId, start: { ...draft, name: "Мирон" } };
    expect(buildAssemblyCreationRequest({ ...base, context }).preparedSpellKeys).toEqual(resolvePreparedKeys(findSpellPreparation(context)!, context));
    const chosen = ["fireball", "shield"];
    const request = buildAssemblyCreationRequest({ ...base, context: { ...context, preparedSpellKeys: chosen } });
    expect(request.preparedSpellKeys).toEqual(chosen);
    expect(buildAssemblyRequestSchema.safeParse(request).success).toBe(true);
  });
});
