import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions, findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { getAllSpells } from "@/lib/spellsData";
import { buildAssemblyCatalog } from "./assembly-catalog";
import { buildAssemblyPlan } from "./assembly-plan";
import { buildSpecSchema, type ReadyBuildSpec } from "./build-spec";
import { BuildSpecError, compileBuildSpec, findProtectedRecipeProblem, findShrunkLevelsWarning } from "./build-spec-compiler";
import type { SpecLevel } from "./build-spec-progression";
import { parseArticleDocument } from "./document";
import { findReadyPresetProblems } from "./preset-diagnostics";
import { buildRecipeSchema } from "./schema";

const content = findCharacterCreationOptions("RULES_2014");
const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));

function readSpec(slug: string): ReadyBuildSpec {
  const spec = buildSpecSchema.parse(readJson(`data/rpgbot/build-specs/${slug}.json`));
  if (spec.status !== "ready") throw new Error(`${slug} must be a ready spec`);
  return spec;
}

function diagnose(slug: string, levels: SpecLevel[] | undefined) {
  const spec = { ...structuredClone(readSpec(slug)), levels };
  const document = parseArticleDocument(readJson(`data/rpgbot/uk/rpgbot-${spec.articleSlug}.json`));
  const { recipe, preset } = compileBuildSpec({ slug, spec, document, content });
  return { recipe, report: findReadyPresetProblems({ recipe, preset, content, document }) };
}

const championLevels: SpecLevel[] = [
  { level: 2 }, { level: 3, subclassKey: "CHAMPION" }, { level: 4, abilityScoreIncrease: [{ ability: "STR", amount: 2 }] }, { level: 5 },
];
const CHAMPION = "fighter-champion-shield-2014";

describe("compiling a spec with levels", () => {
  it("turns levels into executable steps with derived class levels and the supported chain", () => {
    const { recipe, report } = diagnose(CHAMPION, championLevels);
    expect(report.errors).toEqual([]);
    expect(recipe.supportedLevels).toEqual([1, 2, 3, 4, 5]);
    expect(recipe.progression.map((step) => [step.characterLevel, step.classLevel, step.subclassKey ?? null])).toEqual([[1, 1, null], [2, 2, null], [3, 3, "CHAMPION"], [4, 4, null], [5, 5, null]]);
    expect(recipe.progression[3].decisions).toEqual({ abilityScoreIncrease: [{ ability: "STR", amount: 2 }] });
    expect(recipe.progression[3].sourceRefs[0].sectionId).toBe("section-levels");
    expect(recipe.coverage).toBe("partial");
  });

  it("takes the source section of a level from the level, falling back to the level table", () => {
    const { recipe } = diagnose(CHAMPION, championLevels.map((entry) => (entry.level === 4 ? { ...entry, section: "section-feats-2" } : entry)));
    expect(recipe.progression.map((step) => step.sourceRefs[0].sectionId)).toEqual(["section-levels", "section-levels", "section-levels", "section-feats-2", "section-levels"]);
  });

  it("leaves the text level plans and the starting step untouched", () => {
    const withLevels = diagnose(CHAMPION, championLevels).recipe;
    const without = diagnose(CHAMPION, undefined).recipe;
    expect(withLevels.details?.levelPlans).toEqual(without.details?.levelPlans);
    expect(without.supportedLevels).toEqual([1]);
    expect(without.progression).toEqual([withLevels.progression[0]]);
  });

  it("prints what happens on every level", () => {
    const { report } = diagnose(CHAMPION, championLevels);
    expect(report.summary).toEqual(expect.arrayContaining([
      expect.stringContaining("Виконувані рівні 1–5"),
      expect.stringContaining("Рівень 3 · Воїн 3: підклас CHAMPION"),
      expect.stringContaining("Рівень 4 · Воїн 4: підвищення: Сила +2"),
    ]));
  });

  it("rejects levels that skip a level", () => {
    const parsed = buildSpecSchema.safeParse({ ...readSpec(CHAMPION), levels: [{ level: 2 }, { level: 4 }] });
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toContain("очікується рівень 3");
  });

  it("rejects a section that is not in the article", () => {
    const spec = { ...structuredClone(readSpec(CHAMPION)), levels: [{ level: 2, section: "section-nope" }] };
    const document = parseArticleDocument(readJson(`data/rpgbot/uk/rpgbot-${spec.articleSlug}.json`));
    expect(() => compileBuildSpec({ slug: CHAMPION, spec, document, content })).toThrowError(expect.objectContaining({ problems: expect.arrayContaining([expect.stringContaining("levels[2].section")]) }));
    expect(BuildSpecError).toBeDefined();
  });
});

describe("progression diagnostics explain what is wrong", () => {
  const withLevel = (level: number, change: Partial<SpecLevel>): SpecLevel[] => championLevels.map((entry) => (entry.level === level ? { ...entry, ...change } : entry));

  it.each([
    ["an ability increase on a level without one", withLevel(5, { abilityScoreIncrease: [{ ability: "STR", amount: 2 }] }), "рівень 5 (Воїн 5): підвищення характеристик недоступне: Воїн отримує його на рівнях класу 4, 6, 8, 12, 14, 16, 19"],
    ["a subclass on the wrong class level", withLevel(2, { subclassKey: "CHAMPION" }).map((entry): SpecLevel => (entry.level === 3 ? { level: 3 } : entry)), "підклас CHAMPION обирається на 3-му рівні класу Воїн, а тут 2-й рівень"],
    ["a missing subclass", withLevel(3, { subclassKey: undefined }), "Воїн 3-го рівня мусить мати підклас"],
    ["a subclass of another class", withLevel(3, { subclassKey: "SCHOOL_OF_EVOCATION" }), "Клас FIGHTER_2014 не має підкласу SCHOOL_OF_EVOCATION. Підкласи:"],
    ["an ability package that is not two points", withLevel(4, { abilityScoreIncrease: [{ ability: "STR", amount: 1 }] }), "рівно 2 очки"],
    ["a feat that does not exist", withLevel(4, { abilityScoreIncrease: undefined, featKey: "SENTINAL" }), "Немає риси SENTINAL. Схожі: SENTINEL"],
    ["an option the class does not offer", withLevel(4, { classOptions: [{ optionNameEng: "Dueling" }] }), "Опція «Dueling» недоступна на рівні 4"],
    ["spells for a class without spells", withLevel(2, { spells: { cantripKeys: ["fire-bolt"], knownSpellKeys: [], spellbookKeys: [] } }), "не дає нових заклинань на вибір"],
    ["an unknown class", withLevel(2, { classKey: "ARTIFICER" }), "Немає класу ARTIFICER"],
  ])("reports %s", (_name, levels, expected) => {
    expect(diagnose(CHAMPION, levels).report.errors.join("\n")).toContain(expected);
  });

  it("reports an ability score that would go past 20", () => {
    const levels: SpecLevel[] = [...championLevels, { level: 6, abilityScoreIncrease: [{ ability: "STR", amount: 2 }] }, { level: 7 }, { level: 8, abilityScoreIncrease: [{ ability: "STR", amount: 2 }] }];
    expect(diagnose(CHAMPION, levels).report.errors.join("\n")).toContain("перевищує 20");
  });

  it("warns, without failing, when an ability increase level takes nothing", () => {
    const { report } = diagnose(CHAMPION, championLevels.map((entry) => (entry.level === 4 ? { level: 4 } : entry)));
    expect(report.errors).toEqual([]);
    expect(report.warnings.join("\n")).toContain("4-й рівень класу Воїн дає підвищення характеристик або рису");
  });
});

describe("multiclass progression", () => {
  const HEXADIN = "hexadin-ancients-2014";
  const hexadinLevels = readSpec(HEXADIN).levels!;
  const changeLevel = (level: number, change: Partial<SpecLevel>): SpecLevel[] => hexadinLevels.map((entry) => (entry.level === level ? { ...entry, ...change } : entry));

  it("derives the class level of each class and the order of the classes", () => {
    const { recipe, report } = diagnose(HEXADIN, hexadinLevels);
    expect(report.errors).toEqual([]);
    expect(recipe.progression.map((step) => `${step.classKey}:${step.classLevel}`)).toEqual([
      "PALADIN_2014:1", "WARLOCK_2014:1", ...Array.from({ length: 18 }, (_, index) => `PALADIN_2014:${index + 2}`),
    ]);
    expect(recipe.supportedLevels).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
  });

  it.each([
    ["no cantrips at the entry level", changeLevel(2, { spells: { cantripKeys: [], knownSpellKeys: ["hex", "shield"], spellbookKeys: [] } }), "Оберіть замовлянь: 2"],
    ["too many known spells", changeLevel(2, { spells: { cantripKeys: ["booming-blade", "eldritch-blast"], knownSpellKeys: ["hex", "shield", "armor-of-agathys"], spellbookKeys: [] } }), "Оберіть нових заклинань: 2"],
    ["no spells at the entry level", changeLevel(2, { spells: undefined }), "Оберіть замовлянь: 2"],
    ["a spell outside the class list", changeLevel(2, { spells: { cantripKeys: ["booming-blade", "fire-bolt"], knownSpellKeys: ["hex", "shield"], spellbookKeys: [] } }), "не з вашого списку класу"],
    ["a spell that does not exist", changeLevel(2, { spells: { cantripKeys: ["booming-blade", "eldritch-blast"], knownSpellKeys: ["hex", "shielld"], spellbookKeys: [] } }), "Немає заклинання shielld. Схожі: shield"],
    ["a feat on a level without increase", changeLevel(6, { featKey: "WAR_CASTER" }), "риса WAR_CASTER недоступне"],
    ["a subclass chosen twice", changeLevel(5, { subclassKey: "OATH_OF_THE_ANCIENTS" }), "підклас цього класу вже обрано раніше"],
  ])("reports %s", (_name, levels, expected) => {
    expect(diagnose(HEXADIN, levels).report.errors.join("\n")).toContain(expected);
  });
});

describe("class features that need a choice", () => {
  it("asks for the expertise a rogue gets on level 6 and checks it", () => {
    const slug = "rogue-assassin-2014";
    const levels: SpecLevel[] = [{ level: 2 }, { level: 3, subclassKey: "ASSASSIN" }, { level: 4, abilityScoreIncrease: [{ ability: "DEX", amount: 2 }] }, { level: 5 }];
    expect(diagnose(slug, [...levels, { level: 6 }]).report.errors.join("\n")).toContain("expertise: Оберіть рівно 2 навичок для експертизи");
    expect(diagnose(slug, [...levels, { level: 6, expertise: ["DECEPTION", "STEALTH"] }]).report.errors.join("\n")).toContain("Ця навичка вже має експертизу");
    expect(diagnose(slug, [...levels, { level: 6, expertise: ["ARCANA", "HISTORY"] }]).report.errors.join("\n")).toContain("expertise");
    expect(diagnose(slug, [...levels, { level: 6, expertise: ["ACROBATICS", "PERCEPTION"] }]).report.errors).toEqual([]);
  });

  it("asks for the skills a College of Lore bard picks on level 3", () => {
    const slug = "bard-lore-sorcerers-apprentice-2014";
    const levels: SpecLevel[] = [{ level: 2, spells: { cantripKeys: [], knownSpellKeys: ["cure-wounds"], spellbookKeys: [] } }];
    const level3: SpecLevel = { level: 3, subclassKey: "COLLEGE_OF_LORE", spells: { cantripKeys: [], knownSpellKeys: ["faerie-fire"], spellbookKeys: [] }, expertise: ["ARCANA", "HISTORY"] };
    const errors = (skills: SpecLevel["skillProficiencies"]) => diagnose(slug, [...levels, { ...level3, skillProficiencies: skills }]).report.errors.join("\n");
    expect(errors(undefined)).toContain("потрібно обрати рівно 3 навичок");
    expect(errors(["ARCANA", "HISTORY", "NATURE"])).toBe("");
    expect(errors(["ARCANA", "HISTORY"])).toContain("потрібно обрати рівно 3 навичок");
  });
});

describe("choices that a level demands", () => {
  const BATTLE_MASTER = "fighter-battle-master-2014";
  const maneuvers = (...names: string[]) => names.map((optionNameEng) => ({ optionNameEng }));
  const battleMasterLevels = (subclassOptions: SpecLevel["subclassOptions"]): SpecLevel[] => [{ level: 2 }, { level: 3, subclassKey: "BATTLE_MASTER", subclassOptions }];
  const threeManeuvers = maneuvers("Ambush (Maneuver)", "Brace (Maneuver)", "Commander's Strike (Maneuver)");

  it("accepts the three maneuvers a Battle Master takes on level 3", () => {
    expect(diagnose(BATTLE_MASTER, battleMasterLevels(threeManeuvers)).report.errors).toEqual([]);
  });

  it.each([
    ["no maneuvers", undefined, "subclassOptions: на цьому рівні є вибір опцій («Маневри майстра бою»), а в плані їх немає"],
    ["two maneuvers", threeManeuvers.slice(0, 2), "у групі «Маневри майстра бою» потрібно обрати 3, а в плані 2"],
    ["the same maneuver twice", [...threeManeuvers.slice(0, 2), threeManeuvers[0]], "опцію обрано двічі"],
    ["a maneuver that does not exist", maneuvers("Ambush (Maneuver)", "Brace (Maneuver)", "Parry Everything"), "Опція «Parry Everything» недоступна на рівні 3. Доступні: Маневри майстра бою:"],
  ])("rejects %s", (_name, subclassOptions, expected) => {
    expect(diagnose(BATTLE_MASTER, battleMasterLevels(subclassOptions)).report.errors.join("\n")).toContain(expected);
  });

  it("asks an artificer for the four infusions of level 2 and checks their names", () => {
    const ARTIFICER = "artificer-armorer-vedalken-2014";
    const four = ["Enhanced Defense", "Enhanced Weapon", "Mind Sharpener", "Returning Weapon"];
    expect(diagnose(ARTIFICER, [{ level: 2, infusions: four }]).report.errors).toEqual([]);
    expect(diagnose(ARTIFICER, [{ level: 2 }]).report.errors.join("\n")).toContain("обирає 4 вливань, а в плані 0");
    expect(diagnose(ARTIFICER, [{ level: 2, infusions: [...four.slice(0, 3), "Enhanced Defence"] }]).report.errors.join("\n")).toContain("Немає вливання Enhanced Defence. Схожі:");
    expect(diagnose(ARTIFICER, [{ level: 2, infusions: four }, { level: 3, infusions: ["Mind Sharpener"] }]).report.errors.join("\n")).toContain("обирає 0 вливань, а в плані 1");
  });
});

describe("limits that the spec no longer has", () => {
  const compile = (slug: string, change: (spec: ReadyBuildSpec) => void) => {
    const spec = structuredClone(readSpec(slug));
    change(spec);
    const document = parseArticleDocument(readJson(`data/rpgbot/uk/rpgbot-${spec.articleSlug}.json`));
    return compileBuildSpec({ slug, spec, document, content });
  };

  it("lets a build whose starting class never reaches a subclass leave subclassKey out", () => {
    const { recipe, preset } = compile("monk-human-open-hand-2014", (spec) => { delete spec.subclassKey; spec.levels = [{ level: 2 }]; });
    expect(recipe.details).not.toHaveProperty("subclassKey");
    expect(findReadyPresetProblems({ recipe, preset, content }).errors).toEqual([]);
  });

  it("still demands subclassKey of a class that picks its subclass on level 1", () => {
    expect(() => compile("cleric-war-2014", (spec) => { delete spec.subclassKey; })).toThrowError(expect.objectContaining({ problems: [expect.stringContaining("обирає підклас на 1-му рівні")] }));
  });

  it("lets skillSection point at the level table and keeps it among the recipe nodes", () => {
    const { recipe, preset } = compile(CHAMPION, (spec) => { spec.preset.skillSection = "section-levels"; });
    expect(preset.skillSection).toBe("section-levels");
    expect(recipe.details?.nodes.map((node) => node.nodeId)).toContain("section-levels");
  });
});

describe("assembly plan of described levels", () => {
  const catalog = buildAssemblyCatalog(findCharacterCreatorOptions("RULES_2014"), getAllSpells("RULES_2014"));
  const rogueLevels: SpecLevel[] = [{ level: 2 }, { level: 3, subclassKey: "ASSASSIN" }, { level: 4, abilityScoreIncrease: [{ ability: "DEX", amount: 2 }] }, { level: 5 }, { level: 6, expertise: ["ACROBATICS", "PERCEPTION"] }];

  it("passes expertise on to the level-up input of that level only", () => {
    const { recipe } = diagnose("rogue-assassin-2014", rogueLevels);
    const steps = buildAssemblyPlan({ recipe, targetLevel: 6, catalog }).plan!.steps;
    expect(steps.map((step) => step.input.expertiseSchema.expertises)).toEqual([[], [], [], [], ["ACROBATICS", "PERCEPTION"]]);
  });

  it("passes the skills of a feature choice by the id of that feature", () => {
    const lore: SpecLevel[] = [
      { level: 2, openSpellPicks: [{ category: "knownSpells", count: 1 }] },
      { level: 3, subclassKey: "COLLEGE_OF_LORE", skillProficiencies: ["ARCANA", "HISTORY", "NATURE"], expertise: ["ARCANA", "HISTORY"], openSpellPicks: [{ category: "knownSpells", count: 1 }] },
    ];
    const { recipe, report } = diagnose("bard-lore-sorcerers-apprentice-2014", lore);
    expect(report.errors).toEqual([]);
    const openSelections = [{ characterLevel: 2, knownSpellKeys: ["cure-wounds"] }, { characterLevel: 3, knownSpellKeys: ["faerie-fire"] }];
    const loreBard = catalog.classes.find((entry) => entry.key === "BARD_2014")!;
    const featureId = loreBard.subclasses.find((entry) => entry.key === "COLLEGE_OF_LORE")!.features.find((feature) => feature.skillChoice)!.featureId;
    const steps = buildAssemblyPlan({ recipe, targetLevel: 3, catalog, openSelections }).plan!.steps;
    expect(steps.map((step) => step.input.levelUpSkillSelections)).toEqual([{}, { [featureId]: ["ARCANA", "HISTORY", "NATURE"] }]);
  });

  it("turns infusion names into infusion ids", () => {
    const names = ["Enhanced Defense", "Enhanced Weapon", "Mind Sharpener", "Returning Weapon"];
    const { recipe } = diagnose("artificer-armorer-vedalken-2014", [{ level: 2, infusions: names }]);
    const [step] = buildAssemblyPlan({ recipe, targetLevel: 2, catalog }).plan!.steps;
    expect(step.input.infusionSelections).toEqual(names.map((name) => catalog.infusions.find((infusion) => infusion.engName === name)!.id));
  });
});

describe("protecting hand-written executable recipes", () => {
  const manual = buildRecipeSchema.parse(readJson("data/rpgbot/builds/build-barbarian-berserker-2014.json"));

  it("refuses a spec without levels when the stored recipe has decisions", () => {
    expect(findProtectedRecipeProblem({ ...readSpec(CHAMPION), levels: undefined }, manual)).toContain("компілятор його не перезаписує");
  });

  it("lets a spec with levels, or a stored recipe without decisions, through", () => {
    expect(findProtectedRecipeProblem(readSpec(CHAMPION), manual)).toBeNull();
    expect(findProtectedRecipeProblem({ ...readSpec(CHAMPION), levels: undefined }, null)).toBeNull();
    const compiled = buildRecipeSchema.parse(readJson("data/rpgbot/builds/build-bugbear-fiend-warlock-2014.json"));
    const withoutDecisions = { ...compiled, supportedLevels: [1], progression: compiled.progression.slice(0, 1).map((step) => ({ ...step, decisions: undefined })) };
    expect(findProtectedRecipeProblem({ ...readSpec(CHAMPION), levels: undefined }, withoutDecisions)).toBeNull();
  });

  it("never lets the discard flag overwrite a hand-written pilot", () => {
    expect(findProtectedRecipeProblem({ ...readSpec(CHAMPION), levels: undefined }, manual, { discardLevels: true })).toContain("компілятор його не перезаписує");
  });

  it("lets the discard flag replace a compiled recipe, and says how without it", () => {
    const compiled = diagnose(CHAMPION, championLevels).recipe;
    const noLevels = { ...readSpec(CHAMPION), levels: undefined };
    expect(findProtectedRecipeProblem(noLevels, compiled)).toContain("--discard-levels");
    expect(findProtectedRecipeProblem(noLevels, compiled, { discardLevels: true })).toBeNull();
  });

  it("warns when the new recipe executes fewer levels than the stored one", () => {
    const full = diagnose(CHAMPION, championLevels).recipe;
    const shorter = diagnose(CHAMPION, championLevels.slice(0, 2)).recipe;
    expect(findShrunkLevelsWarning(full, shorter)).toBe("рецепт скорочено: виконувався до 5-го рівня, тепер виконується до 3-го");
    expect(findShrunkLevelsWarning(shorter, full)).toBeNull();
    expect(findShrunkLevelsWarning(null, full)).toBeNull();
  });
});
