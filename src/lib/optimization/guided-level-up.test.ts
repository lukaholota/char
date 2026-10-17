import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { getAllSpells } from "@/lib/spellsData";
import { buildAssemblyCatalog } from "./assembly-catalog";
import { listExecutableSteps } from "./build-executable-levels";
import type { ClassSpellOffer } from "@/rules/class-spell-choices-2024";
import { fillOpenSpellPicks, listGuidedPicks, planGuidedLevelUp, type GuidedPersState, type GuidedStepPlan } from "./guided-level-up";
import { buildRecipeSchema } from "./schema";
import type { BuildRecipe } from "./types";

const catalog = buildAssemblyCatalog(findCharacterCreatorOptions("RULES_2014"), getAllSpells("RULES_2014").map((spell) => ({ spellId: spell.spellId, engName: spell.engName })));

function readRecipe(buildId: string): BuildRecipe {
  return buildRecipeSchema.parse(JSON.parse(readFileSync(`data/rpgbot/builds/${buildId}.json`, "utf8")));
}

function buildModelState(recipe: BuildRecipe, level: number, overrides: Partial<GuidedPersState> = {}): GuidedPersState {
  const classes = new Map([[recipe.startingClassKey, { classKey: recipe.startingClassKey, classLevel: 1, subclassKey: recipe.progression[0]?.subclassKey ?? null }]]);
  for (const step of listExecutableSteps(recipe).filter((candidate) => candidate.characterLevel <= level)) {
    classes.set(step.classKey, { classKey: step.classKey, classLevel: step.classLevel, subclassKey: step.subclassKey ?? classes.get(step.classKey)?.subclassKey ?? null });
  }
  return {
    level,
    classes: [...classes.values()],
    abilityScores: { STR: 15, DEX: 14, CON: 14, INT: 10, WIS: 12, CHA: 8 },
    nonRepeatableFeatIds: [],
    choiceOptionIds: [],
    ...overrides,
  };
}

function findClassId(key: string): number {
  return catalog.classes.find((entry) => entry.key === key)!.id;
}

const barbarian = readRecipe("build-barbarian-berserker-2014");
const sorcadin = readRecipe("build-sorcadin-clockwork-2014");
const recipes2014 = readdirSync("data/rpgbot/builds").map((file) => readRecipe(file.replace(/\.json$/, ""))).filter((recipe) => recipe.ruleset === "RULES_2014");

describe("next guided level for a character that followed the plan", () => {
  const cases = recipes2014.flatMap((recipe) => listExecutableSteps(recipe).map((step) => [recipe.buildId, step.characterLevel, recipe, step] as const));

  it.each(cases)("%s fills only level %i", (_buildId, characterLevel, recipe, step) => {
    const plan = planGuidedLevelUp(recipe, catalog, buildModelState(recipe, characterLevel - 1));

    expect(plan).toMatchObject({ status: "ready", nextLevel: characterLevel, classKey: step.classKey, classLevel: step.classLevel });
    if (plan.status !== "ready") return;
    expect(plan.input.classId).toBe(findClassId(step.classKey));
    expect(plan.input.levelUpPath).toBe(plan.isMulticlassEntry ? "MULTICLASS" : "EXISTING");
    expect(plan.skipped).toEqual([]);
  });

  it("enters the second class as a multiclass on the Sorcadin's fourth level", () => {
    const plan = planGuidedLevelUp(sorcadin, catalog, buildModelState(sorcadin, 3));

    expect(plan).toMatchObject({ status: "ready", classKey: "SORCERER_2014", classLevel: 1, isMulticlassEntry: true, input: { levelUpPath: "MULTICLASS" } });
    expect(plan.status === "ready" && plan.input.subclassId).toBeTruthy();
    expect(plan.status === "ready" && plan.input.classSpells?.cantripIds).toHaveLength(4);
  });

  it("names the subclass on its level and fills the ability increase on the next one", () => {
    const subclassStep = planGuidedLevelUp(barbarian, catalog, buildModelState(barbarian, 2));
    const asiStep = planGuidedLevelUp(barbarian, catalog, buildModelState(barbarian, 3));

    expect(subclassStep.status === "ready" && subclassStep.input.subclassId).toBeTruthy();
    expect(asiStep).toMatchObject({ status: "ready", input: { customAsi: [{ ability: "STR", value: 2 }] } });
    expect(asiStep.status === "ready" && asiStep.input.subclassId).toBeUndefined();
  });

  it("hands the open spell pick of the step to the platform choice", () => {
    const plan = planGuidedLevelUp(sorcadin, catalog, buildModelState(sorcadin, 6));

    expect(plan).toMatchObject({ status: "ready", open: [], openSpellPicks: [{ category: "knownSpells", count: 1 }], skipped: [] });
  });
});

function spell(spellId: number, engName: string, level: number) {
  return { spellId, engName, name: engName, level, school: null };
}

function buildOffer(overrides: Partial<ClassSpellOffer> = {}): ClassSpellOffer {
  return {
    className: "DRUID_2014", classLabel: "Друїд", ruleset: "RULES_2014",
    quota: { cantrips: 1, prepared: 0, spellbook: 0, maxSpellLevel: 2 },
    catchUp: { cantrips: 0, prepared: 0, spellbook: 0 },
    cantrips: [spell(1, "Druidcraft", 0), spell(2, "Guidance", 0), spell(3, "Shillelagh", 0)],
    spells: [spell(10, "Entangle", 1), spell(11, "Moonbeam", 2), spell(12, "Goodberry", 1)],
    bookSpells: [], bookOnlySpellIds: [], swap: null, canSkipPrepared: false,
    ...overrides,
  };
}

const scores: Record<string, number> = { Guidance: 4, Shillelagh: 3, Entangle: 4, Moonbeam: 4, Goodberry: 3 };
const findScore = (engName: string) => scores[engName];
const empty = { cantripIds: [], preparedIds: [], spellbookIds: [] };

describe("platform choice for picks the author leaves open", () => {
  it("takes the best rated spell, the higher level on a tie, like preset creation", () => {
    const cantrip = fillOpenSpellPicks(empty, buildOffer(), [{ category: "cantrips", count: 1 }], findScore);
    const known = fillOpenSpellPicks(empty, buildOffer({ quota: { cantrips: 0, prepared: 2, spellbook: 0, maxSpellLevel: 2 } }), [{ category: "knownSpells", count: 2 }], findScore);

    expect(cantrip).toEqual({ selection: { ...empty, cantripIds: [2] }, filledIds: [2], unfilled: [] });
    expect(known.selection.preparedIds).toEqual([11, 10]);
  });

  it("skips spells already planned and never goes over the live quota", () => {
    const filled = fillOpenSpellPicks({ ...empty, cantripIds: [2] }, buildOffer({ quota: { cantrips: 2, prepared: 0, spellbook: 0, maxSpellLevel: 2 } }), [{ category: "cantrips", count: 3 }], findScore);

    expect(filled.selection.cantripIds).toEqual([2, 3]);
    expect(filled.unfilled).toEqual([{ category: "cantrips", count: 2 }]);
  });

  it("leaves a school-limited pick to the player", () => {
    const limited = buildOffer({ schoolLimit: { schools: ["ABJURATION"], outsideAllowed: 0 } });

    expect(fillOpenSpellPicks(empty, limited, [{ category: "cantrips", count: 1 }], findScore)).toEqual({ selection: empty, filledIds: [], unfilled: [{ category: "cantrips", count: 1 }] });
  });
});

describe("what the guide will pick, shown before the button", () => {
  const names = { className: "Друїд", subclassName: null, featName: null, optionNames: [], spellNameById: new Map([[2, "Настанова"]]) };
  const readyPlan = (overrides: Partial<Extract<GuidedStepPlan, { status: "ready" }>> = {}) => {
    const plan = planGuidedLevelUp(barbarian, catalog, buildModelState(barbarian, 1));
    if (plan.status !== "ready") throw new Error("plan");
    return { ...plan, ...overrides };
  };

  it("is empty on a level without choices, so the card can say so", () => {
    expect(listGuidedPicks(readyPlan(), names)).toEqual([]);
  });

  it("names the spells, the ability increase and the class of a multiclass", () => {
    const plan = readyPlan({ isMulticlassEntry: true });
    const picks = listGuidedPicks({ ...plan, input: { ...plan.input, customAsi: [{ ability: "WIS", value: 2 }], classSpells: { ...empty, cantripIds: [2] } } }, { ...names, subclassName: "Коло Місяця" });

    expect(picks).toEqual(["Новий клас: Друїд.", "Підклас: Коло Місяця.", "Характеристики: Мудрість +2.", "Замовляння: Настанова."]);
  });
});

describe("a character that drifted from the plan", () => {
  it("skips a feat the character already has", () => {
    const warCaster = catalog.feats.find((feat) => feat.key === "WAR_CASTER")!.id;
    const plan = planGuidedLevelUp(sorcadin, catalog, buildModelState(sorcadin, 6, { nonRepeatableFeatIds: [warCaster] }));

    expect(plan.status === "ready" && plan.input.featId).toBeUndefined();
    expect(plan.status === "ready" && plan.skipped).toEqual(["Рису з плану персонаж уже має — оберіть іншу рису або підвищення характеристик."]);
  });

  it("skips a class option the character already has and keeps the rest", () => {
    const metamagic = planGuidedLevelUp(sorcadin, catalog, buildModelState(sorcadin, 5));
    if (metamagic.status !== "ready") throw new Error(metamagic.reason);
    const [ownedId, keptId] = Object.values(metamagic.input.classChoiceSelections).flat();

    const plan = planGuidedLevelUp(sorcadin, catalog, buildModelState(sorcadin, 5, { choiceOptionIds: [ownedId] }));

    expect(plan.status === "ready" && Object.values(plan.input.classChoiceSelections).flat()).toEqual([keptId]);
    expect(plan.status === "ready" && plan.skipped).toHaveLength(1);
  });

  it("leaves an ability increase over 20 to the player", () => {
    const plan = planGuidedLevelUp(barbarian, catalog, buildModelState(barbarian, 3, { abilityScores: { STR: 20, DEX: 14, CON: 14, INT: 10, WIS: 12, CHA: 8 } }));

    expect(plan).toMatchObject({ status: "ready", input: { customAsi: [] } });
    expect(plan.status === "ready" && plan.skipped).toHaveLength(1);
  });

  it("does not resend the subclass the character already chose", () => {
    const state = buildModelState(barbarian, 2);
    const withSubclass = { ...state, classes: state.classes.map((entry) => ({ ...entry, subclassKey: "PATH_OF_THE_BERSERKER" })) };

    const plan = planGuidedLevelUp(barbarian, catalog, withSubclass);

    expect(plan.status === "ready" && plan.input.subclassId).toBeUndefined();
  });

  it("is unavailable when the class levels differ from the plan", () => {
    const state = buildModelState(sorcadin, 4);
    const otherOrder = { ...state, classes: [{ classKey: "PALADIN_2014", classLevel: 4, subclassKey: "OATH_OF_REDEMPTION" }] };

    expect(planGuidedLevelUp(sorcadin, catalog, otherOrder)).toEqual({ status: "unavailable", reason: "Рівні класів персонажа відрізняються від плану пресета." });
  });

  it("is unavailable when the chosen subclass differs from the plan", () => {
    const state = buildModelState(barbarian, 3);
    const otherPath = { ...state, classes: [{ classKey: "BARBARIAN_2014", classLevel: 3, subclassKey: "PATH_OF_THE_TOTEM_WARRIOR" }] };

    expect(planGuidedLevelUp(barbarian, catalog, otherPath)).toEqual({ status: "unavailable", reason: "Підклас персонажа відрізняється від плану пресета." });
  });

  it("reports the end of a shortened plan and the level cap", () => {
    const barbarianToFive = { ...barbarian, supportedLevels: [1, 2, 3, 4, 5], progression: barbarian.progression.slice(0, 5) };
    expect(planGuidedLevelUp(barbarianToFive, catalog, buildModelState(barbarianToFive, 5))).toEqual({ status: "unavailable", reason: "План пресета закінчився: рекомендацій для 6-го рівня немає." });
    expect(planGuidedLevelUp(barbarian, catalog, buildModelState(barbarian, 20))).toEqual({ status: "unavailable", reason: "Персонаж уже на 20-му рівні." });
  });
});
