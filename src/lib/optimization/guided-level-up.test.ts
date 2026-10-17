import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions, findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { getAllSpells } from "@/lib/spellsData";
import { skillTranslations } from "@/lib/refs/translation";
import { buildAssemblyCatalog } from "./assembly-catalog";
import { listExecutableSteps } from "./build-executable-levels";
import type { ClassSpellOffer } from "@/rules/class-spell-choices-2024";
import { fillOpenSpellPicks, listGuidedPicks, planGuidedLevelUp, type GuidedPersSkill, type GuidedPersState, type GuidedStepPlan } from "./guided-level-up";
import { buildReadyPresetDraft, readyPresetSchema } from "./ready-preset";
import { buildRecipeSchema } from "./schema";
import type { BuildRecipe } from "./types";

const creationContent2014 = findCharacterCreationOptions("RULES_2014");
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
    skills: listFollowedSkills(recipe, level),
    ...overrides,
  };
}

const followedSkillsByLevel = new Map<string, GuidedPersSkill[]>();

function listFollowedSkills(recipe: BuildRecipe, level: number): GuidedPersSkill[] {
  const key = `${recipe.buildId}:${level}`;
  const known = followedSkillsByLevel.get(key);
  if (known) return known;
  const skills = level <= 1 ? listPresetSkills(recipe) : addGuidedSkills(listFollowedSkills(recipe, level - 1), recipe, level);
  followedSkillsByLevel.set(key, skills);
  return skills;
}

function listPresetSkills(recipe: BuildRecipe): GuidedPersSkill[] {
  const preset = readyPresetSchema.parse(JSON.parse(readFileSync(`data/rpgbot/ready-builds/${recipe.buildId.replace(/^build-/, "")}.json`, "utf8")));
  const draft = buildReadyPresetDraft(recipe, preset, creationContent2014);
  return addSkills([], draft.skills, draft.expertiseSchema?.expertises ?? []);
}

function addGuidedSkills(skills: GuidedPersSkill[], recipe: BuildRecipe, level: number): GuidedPersSkill[] {
  const plan = planGuidedLevelUp(recipe, catalog, buildModelState(recipe, level - 1, { skills }));
  if (plan.status !== "ready") return skills;
  return addSkills(skills, Object.values(plan.input.levelUpSkillSelections).flat(), plan.input.expertiseSchema.expertises);
}

function addSkills(skills: readonly GuidedPersSkill[], proficient: readonly string[], expertise: readonly string[]): GuidedPersSkill[] {
  const types = new Map(skills.map((skill) => [skill.name, skill.proficiencyType]));
  proficient.forEach((name) => types.set(name, types.get(name) === "EXPERTISE" ? "EXPERTISE" : "PROFICIENT"));
  expertise.forEach((name) => types.set(name, "EXPERTISE"));
  return [...types].map(([name, proficiencyType]) => ({ name, proficiencyType }));
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

  const rogueSkills = ["ACROBATICS", "ATHLETICS", "DECEPTION", "INSIGHT", "INTIMIDATION", "INVESTIGATION", "PERCEPTION", "PERFORMANCE", "PERSUASION", "SLEIGHT_OF_HAND", "STEALTH"];
  const rogueEntryRecipe = readRecipe("build-bugbear-fiend-warlock-2014");
  const thief = readRecipe("build-rogue-thief-2014");
  const withSkill = (state: GuidedPersState, name: string, proficiencyType: string | null): GuidedPersState => ({
    ...state,
    skills: [...state.skills.filter((skill) => skill.name !== name), ...(proficiencyType ? [{ name, proficiencyType }] : [])],
  });

  it("takes another class skill when the character already has the planned one", () => {
    const state = withSkill(buildModelState(rogueEntryRecipe, 1), "INSIGHT", "PROFICIENT");
    const plan = planGuidedLevelUp(rogueEntryRecipe, catalog, state, { classSkillOptions: { ROGUE_2014: rogueSkills } });
    if (plan.status !== "ready") throw new Error(plan.reason);
    const [substitute] = plan.input.levelUpSkillSelections["multiclass-entry"];

    expect(rogueSkills).toContain(substitute);
    expect(state.skills.map((skill) => skill.name)).not.toContain(substitute);
    expect(plan.skipped).toEqual([]);
    expect(plan.open).toContain(`Навичку «${skillTranslations.INSIGHT}» персонаж уже має — гайд узяв «${skillTranslations[substitute]}».`);
  });

  it("leaves the skill to the player when the character has every class skill", () => {
    const state = rogueSkills.reduce((current, name) => withSkill(current, name, "PROFICIENT"), buildModelState(rogueEntryRecipe, 1));
    const plan = planGuidedLevelUp(rogueEntryRecipe, catalog, state, { classSkillOptions: { ROGUE_2014: rogueSkills } });

    expect(plan.status === "ready" && plan.input.levelUpSkillSelections["multiclass-entry"]).toEqual([]);
    expect(plan.status === "ready" && plan.skipped).toContain(`Навичку «${skillTranslations.INSIGHT}» персонаж уже має — оберіть іншу на кроці «Навички».`);
  });

  it("swaps a planned expertise the character cannot take for a skill it is proficient in", () => {
    const state = withSkill(buildModelState(thief, 5), "DECEPTION", null);
    const plan = planGuidedLevelUp(thief, catalog, state);
    if (plan.status !== "ready") throw new Error(plan.reason);
    const [kept, substitute] = plan.input.expertiseSchema.expertises;

    expect(kept).toBe("SLEIGHT_OF_HAND");
    expect(state.skills).toContainEqual({ name: substitute, proficiencyType: "PROFICIENT" });
    expect(plan.open).toContain(`Експертизу в «${skillTranslations.DECEPTION}» не взяти без володіння навичкою — гайд узяв «${skillTranslations[substitute]}».`);
  });

  it("swaps a planned expertise the character already has", () => {
    const plan = planGuidedLevelUp(thief, catalog, withSkill(buildModelState(thief, 5), "DECEPTION", "EXPERTISE"));

    expect(plan.status === "ready" && plan.input.expertiseSchema.expertises).not.toContain("DECEPTION");
    expect(plan.status === "ready" && plan.open.join(" ")).toContain(`Експертизу в «${skillTranslations.DECEPTION}» персонаж уже має`);
  });

  it("counts any skill row other than none as proficient, like the server check", () => {
    const half = planGuidedLevelUp(thief, catalog, withSkill(buildModelState(thief, 5), "DECEPTION", "HALF"));
    const none = planGuidedLevelUp(thief, catalog, withSkill(buildModelState(thief, 5), "DECEPTION", "NONE"));

    expect(half).toMatchObject({ status: "ready", skipped: [], open: [], input: { expertiseSchema: { expertises: ["SLEIGHT_OF_HAND", "DECEPTION"] } } });
    expect(none.status === "ready" && none.input.expertiseSchema.expertises).not.toContain("DECEPTION");
  });

  it("refills an owned open class option with the best rated one the character can take", () => {
    const caster = readRecipe("build-bugbear-ambush-caster-2014");
    const planned = planGuidedLevelUp(caster, catalog, buildModelState(caster, 19));
    if (planned.status !== "ready") throw new Error(planned.reason);
    const [ownedId] = Object.values(planned.input.classChoiceSelections).flat();
    const ratings: Record<string, number> = { "Quickened Spell": 5, "Twinned Spell": 4 };
    const findOptionScore = (option: { nameEng: string }) => ratings[option.nameEng];
    const owned = catalog.classes.find((entry) => entry.key === "SORCERER_2014")!.choiceOptions.find((option) => option.id === ownedId)!;
    const best = catalog.classes.find((entry) => entry.key === "SORCERER_2014")!.choiceOptions.find((option) => option.groupName === owned.groupName && option.nameEng === (owned.nameEng === "Quickened Spell" ? "Twinned Spell" : "Quickened Spell"))!;

    const rated = planGuidedLevelUp(caster, catalog, buildModelState(caster, 19, { choiceOptionIds: [ownedId] }), { findOptionScore });
    const unrated = planGuidedLevelUp(caster, catalog, buildModelState(caster, 19, { choiceOptionIds: [ownedId] }));

    expect(planned.open).toEqual(["Автор не називає опції класу на цьому рівні — гайд узяв типові, їх можна змінити на кроці «Опції класу»."]);
    expect(rated).toMatchObject({ status: "ready", skipped: [], open: ["Типову опцію класу персонаж уже має — гайд узяв найкращу доступну за оцінкою RPGbot, її можна змінити на кроці «Опції класу»."] });
    expect(rated.status === "ready" && Object.values(rated.input.classChoiceSelections).flat()).toEqual([best.id]);
    expect(unrated.status === "ready" && unrated.skipped).toEqual(["Частину опцій класу з плану персонаж уже має — оберіть замість них інші."]);
  });

  it("says the author left the advancement open only while the guide keeps one", () => {
    const artificer = readRecipe("build-artificer-alchemist-2014");
    const open = planGuidedLevelUp(artificer, catalog, buildModelState(artificer, 11));
    const overCap = planGuidedLevelUp(artificer, catalog, buildModelState(artificer, 11, { abilityScores: { STR: 8, DEX: 14, CON: 20, INT: 20, WIS: 12, CHA: 8 } }));

    expect(open.status === "ready" && open.open).toEqual(["Автор не називає рису чи підвищення на цьому рівні — гайд узяв типовий вибір, його можна змінити на кроці «Покращення»."]);
    expect(overCap.status === "ready" && overCap.open).toEqual([]);
  });

  it("reports the end of a shortened plan and the level cap", () => {
    const barbarianToFive = { ...barbarian, supportedLevels: [1, 2, 3, 4, 5], progression: barbarian.progression.slice(0, 5) };
    expect(planGuidedLevelUp(barbarianToFive, catalog, buildModelState(barbarianToFive, 5))).toEqual({ status: "unavailable", reason: "План пресета закінчився: рекомендацій для 6-го рівня немає." });
    expect(planGuidedLevelUp(barbarian, catalog, buildModelState(barbarian, 20))).toEqual({ status: "unavailable", reason: "Персонаж уже на 20-му рівні." });
  });
});
