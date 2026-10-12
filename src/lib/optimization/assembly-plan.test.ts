import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { getAllSpells } from "@/lib/spellsData";
import { buildAssemblyCatalog } from "./assembly-catalog";
import { buildAssemblyPlan, listOpenSpellChoices } from "./assembly-plan";
import { summarizeAssemblyLevels, summarizeClassLevels } from "./assembly-summary";
import { findExecutableLevels, findProgressionIssues } from "./build-executable-levels";
import { buildRecipeSchema } from "./schema";
import type { BuildRecipe } from "./types";

function readRecipe(buildId: string): BuildRecipe {
  return buildRecipeSchema.parse(JSON.parse(readFileSync(`data/rpgbot/builds/${buildId}.json`, "utf8")));
}

const catalog = buildAssemblyCatalog(findCharacterCreatorOptions("RULES_2014"), getAllSpells("RULES_2014").map((spell) => ({ spellId: spell.spellId, engName: spell.engName })));
const barbarian = readRecipe("build-barbarian-berserker-2014");
const wizard = readRecipe("build-wizard-evocation-2014");
const sorcadin = readRecipe("build-sorcadin-clockwork-2014");

function classId(key: string): number {
  return catalog.classes.find((entry) => entry.key === key)!.id;
}

describe("executable levels of the pilot recipes", () => {
  it.each([[barbarian, [1, 2, 3, 4, 5]], [wizard, [1, 2, 3, 4, 5]], [sorcadin, [1, 2, 3, 4, 5, 6, 7]]])("%s has contiguous executable steps and no progression issues", (recipe, levels) => {
    expect(findExecutableLevels(recipe)).toEqual(levels);
    expect(recipe.supportedLevels).toEqual(levels);
    expect(findProgressionIssues(recipe)).toEqual([]);
  });

  it("keeps text-only recipes at level one", () => {
    const full = readRecipe("build-bugbear-fiend-warlock-2014");
    const plain = { ...full, supportedLevels: [1], progression: full.progression.slice(0, 1).map((step) => ({ ...step, decisions: undefined })) };
    expect(plain.supportedLevels).toEqual([1]);
    expect(findExecutableLevels(plain)).toEqual([1]);
  });

  it("reports a supported level that has no executable step", () => {
    const broken = { ...barbarian, supportedLevels: [1, 2, 3, 4, 5, 6] };
    expect(findProgressionIssues(broken).map((issue) => issue.code)).toEqual(["level-not-executable"]);
  });

  it("stops at an out-of-order class level and at a repeated subclass", () => {
    const outOfOrder = structuredClone(barbarian);
    outOfOrder.progression[3].classLevel = 6;
    expect(findExecutableLevels(outOfOrder)).toEqual([1, 2, 3]);
    expect(findProgressionIssues(outOfOrder).map((issue) => issue.code)).toContain("class-level-order");

    const repeated = structuredClone(barbarian);
    repeated.progression[3].subclassKey = "PATH_OF_THE_BERSERKER";
    expect(findProgressionIssues(repeated).map((issue) => issue.code)).toContain("subclass-repeated");
  });
});

describe("assembly plan of the Barbarian build", () => {
  it("lists four ordered level-ups with the subclass at 3 and the ability increase at 4", () => {
    const { plan, issues } = buildAssemblyPlan({ recipe: barbarian, targetLevel: 5, catalog });
    expect(issues).toEqual([]);
    expect(plan!.steps.map((step) => [step.characterLevel, step.classKey, step.classLevel, step.isMulticlassEntry])).toEqual([
      [2, "BARBARIAN_2014", 2, false], [3, "BARBARIAN_2014", 3, false], [4, "BARBARIAN_2014", 4, false], [5, "BARBARIAN_2014", 5, false],
    ]);
    const barbarianId = classId("BARBARIAN_2014");
    expect(plan!.steps.every((step) => step.input.classId === barbarianId && step.input.levelUpPath === "EXISTING")).toBe(true);
    expect(plan!.steps[1].input.subclassId).toBe(catalog.classes.find((entry) => entry.key === "BARBARIAN_2014")!.subclasses.find((entry) => entry.key === "PATH_OF_THE_BERSERKER")!.id);
    expect(plan!.steps.map((step) => step.input.customAsi)).toEqual([[], [], [{ ability: "STR", value: 2 }], []]);
    expect(plan!.steps.map((step) => step.input.classSpells)).toEqual([undefined, undefined, undefined, undefined]);
  });

  it("builds only the steps up to the target level", () => {
    expect(buildAssemblyPlan({ recipe: barbarian, targetLevel: 3, catalog }).plan!.steps.map((step) => step.characterLevel)).toEqual([2, 3]);
    expect(buildAssemblyPlan({ recipe: barbarian, targetLevel: 1, catalog }).plan!.steps).toEqual([]);
  });

  it.each([6, 0, 21, 2.5])("refuses unsupported target level %s", (targetLevel) => {
    const result = buildAssemblyPlan({ recipe: barbarian, targetLevel, catalog });
    expect(result.plan).toBeNull();
    expect(result.issues[0].code).toBe("level-not-supported");
  });
});

describe("assembly plan of the Wizard build", () => {
  it("resolves the book spells and the cantrip by key at the level that learns them", () => {
    const { plan, issues } = buildAssemblyPlan({ recipe: wizard, targetLevel: 5, catalog });
    expect(issues).toEqual([]);
    const idOf = (key: string) => catalog.spellIdsByKey.get(key)!;
    expect(plan!.steps.map((step) => step.input.classSpells)).toEqual([
      { cantripIds: [], preparedIds: [], spellbookIds: [idOf("identify"), idOf("shield")] },
      { cantripIds: [], preparedIds: [], spellbookIds: [idOf("scorching-ray"), idOf("shatter")] },
      { cantripIds: [idOf("fire-bolt")], preparedIds: [], spellbookIds: [idOf("flaming-sphere"), idOf("misty-step")] },
      { cantripIds: [], preparedIds: [], spellbookIds: [idOf("fireball"), idOf("fly")] },
    ]);
    expect(plan!.steps[0].input.subclassId).toBeDefined();
    expect(plan!.steps[2].input.customAsi).toEqual([{ ability: "INT", value: 2 }]);
    expect(plan!.preparedSpellIds).toBeNull();
  });

  it("resolves the final prepared selection by key and refuses unknown spells", () => {
    expect(buildAssemblyPlan({ recipe: wizard, targetLevel: 5, catalog, preparedSpellKeys: ["fireball", "shield"] }).plan!.preparedSpellIds).toEqual([catalog.spellIdsByKey.get("fireball"), catalog.spellIdsByKey.get("shield")]);
    const unknown = buildAssemblyPlan({ recipe: wizard, targetLevel: 5, catalog, preparedSpellKeys: ["no-such-spell"] });
    expect(unknown.issues.map((issue) => issue.code)).toEqual(["unknown-spell"]);
  });

  it("refuses a spell key the catalog does not know instead of substituting another", () => {
    const changed = structuredClone(wizard);
    changed.progression[1].decisions!.spells!.spellbookKeys = ["identify", "not-a-spell"];
    const result = buildAssemblyPlan({ recipe: changed, targetLevel: 5, catalog });
    expect(result.plan).toBeNull();
    expect(result.issues).toMatchObject([{ characterLevel: 2, code: "unknown-spell", message: "Немає заклинання not-a-spell" }]);
  });
});

describe("assembly plan of the multiclass Sorcadin build", () => {
  it("keeps the class order and marks the first Sorcerer level as the multiclass entry", () => {
    const { plan, issues } = buildAssemblyPlan({ recipe: sorcadin, targetLevel: 7, catalog, openSelections: [{ characterLevel: 7, knownSpellKeys: ["absorb-elements"] }] });
    expect(issues).toEqual([]);
    expect(plan!.steps.map((step) => `${step.classKey}:${step.classLevel}:${step.input.levelUpPath}`)).toEqual([
      "PALADIN_2014:2:EXISTING", "PALADIN_2014:3:EXISTING", "SORCERER_2014:1:MULTICLASS", "SORCERER_2014:2:EXISTING", "SORCERER_2014:3:EXISTING", "SORCERER_2014:4:EXISTING",
    ]);
    const sorcerer = catalog.classes.find((entry) => entry.key === "SORCERER_2014")!;
    expect(plan!.steps[2].input.subclassId).toBe(sorcerer.subclasses.find((entry) => entry.key === "CLOCKWORK_SOUL")!.id);
    expect(plan!.steps[3].input.subclassId).toBeUndefined();
    expect(Object.values(plan!.steps[0].input.classChoiceSelections)).toHaveLength(1);
    expect(Object.values(plan!.steps[4].input.classChoiceSelections).flat()).toHaveLength(2);
    expect(plan!.steps[5].input.featId).toBe(catalog.feats.find((entry) => entry.key === "WAR_CASTER")!.id);
  });

  it("reports the unspecified known spell as an open choice instead of inventing one", () => {
    expect(listOpenSpellChoices(sorcadin, 7)).toEqual([{ characterLevel: 7, classKey: "SORCERER_2014", category: "knownSpells", count: 1 }]);
    expect(listOpenSpellChoices(sorcadin, 6)).toEqual([]);
    const unresolved = buildAssemblyPlan({ recipe: sorcadin, targetLevel: 7, catalog });
    expect(unresolved.plan).toBeNull();
    expect(unresolved.issues.map((issue) => issue.code)).toEqual(["unresolved-choice"]);
    expect(buildAssemblyPlan({ recipe: sorcadin, targetLevel: 6, catalog }).issues).toEqual([]);
  });

  it("does not let a player selection replace a decision that the recipe fixed", () => {
    const override = buildAssemblyPlan({ recipe: sorcadin, targetLevel: 6, catalog, openSelections: [{ characterLevel: 5, knownSpellKeys: ["shield"] }] });
    expect(override.issues.map((issue) => issue.code)).toContain("override-not-allowed");
    const beyondTarget = buildAssemblyPlan({ recipe: sorcadin, targetLevel: 6, catalog, openSelections: [{ characterLevel: 7, knownSpellKeys: ["absorb-elements"] }] });
    expect(beyondTarget.issues.map((issue) => issue.code)).toEqual(["selection-without-step"]);
    const twice = buildAssemblyPlan({ recipe: sorcadin, targetLevel: 7, catalog, openSelections: [{ characterLevel: 7, knownSpellKeys: ["absorb-elements"] }, { characterLevel: 7, knownSpellKeys: ["shield"] }] });
    expect(twice.plan).toBeNull();
  });

  it("flags a spell chosen twice within one level across fixed and open picks", () => {
    const result = buildAssemblyPlan({ recipe: sorcadin, targetLevel: 7, catalog, openSelections: [{ characterLevel: 7, knownSpellKeys: ["sword-burst"] }] });
    expect(result.issues.map((issue) => issue.code)).toEqual(["duplicate-spell"]);
  });

  it("refuses an unknown subclass and an option that is not offered at that class level", () => {
    const wrongSubclass = structuredClone(sorcadin);
    wrongSubclass.progression[3].subclassKey = "SCHOOL_OF_EVOCATION";
    expect(buildAssemblyPlan({ recipe: wrongSubclass, targetLevel: 4, catalog }).issues.map((issue) => issue.code)).toContain("unknown-subclass");
    const wrongOption = structuredClone(sorcadin);
    wrongOption.progression[1].decisions!.classOptions = [{ optionNameEng: "Heightened Spell" }];
    expect(buildAssemblyPlan({ recipe: wrongOption, targetLevel: 2, catalog }).issues.map((issue) => issue.code)).toEqual(["unresolved-option"]);
  });
});

describe("assembly summary for the preview", () => {
  it("lists class levels in the order the classes were taken", () => {
    expect(summarizeClassLevels(sorcadin, 7)).toEqual([{ classKey: "PALADIN_2014", classLevel: 3 }, { classKey: "SORCERER_2014", classLevel: 4 }]);
    expect(summarizeClassLevels(sorcadin, 3)).toEqual([{ classKey: "PALADIN_2014", classLevel: 3 }]);
    expect(summarizeClassLevels(wizard, 1)).toEqual([{ classKey: "WIZARD_2014", classLevel: 1 }]);
  });

  it("marks the multiclass entry, subclass, feat and ability increase levels", () => {
    expect(summarizeAssemblyLevels(sorcadin, 7).map((level) => [level.characterLevel, level.isMulticlassEntry, level.subclassKey, level.featKey])).toEqual([
      [2, false, null, null], [3, false, "OATH_OF_REDEMPTION", null], [4, true, "CLOCKWORK_SOUL", null], [5, false, null, null], [6, false, null, null], [7, false, null, "WAR_CASTER"],
    ]);
    expect(summarizeAssemblyLevels(barbarian, 5).filter((level) => level.hasAbilityScoreIncrease).map((level) => level.characterLevel)).toEqual([4]);
  });
});

describe("open advancement of a level", () => {
  const openRecipe = structuredClone(barbarian);
  openRecipe.progression.find((step) => step.characterLevel === 4)!.decisions!.openAdvancement = true;
  const luckyId = catalog.feats.find((feat) => feat.key === "LUCKY")!.id;

  it("keeps the author's default when the player chooses nothing", () => {
    const { plan } = buildAssemblyPlan({ recipe: openRecipe, targetLevel: 5, catalog });
    expect(plan!.steps[2].input.customAsi).toEqual([{ ability: "STR", value: 2 }]);
    expect(plan!.steps[2].input.featId).toBeUndefined();
  });

  it("replaces the default increase with the chosen feat", () => {
    const { plan, issues } = buildAssemblyPlan({ recipe: openRecipe, targetLevel: 5, catalog, openAdvancements: [{ characterLevel: 4, featKey: "LUCKY" }] });
    expect(issues).toEqual([]);
    expect(plan!.steps[2].input.featId).toBe(luckyId);
    expect(plan!.steps[2].input.customAsi).toEqual([]);
  });

  it("replaces the default with another ability increase", () => {
    const { plan } = buildAssemblyPlan({ recipe: openRecipe, targetLevel: 5, catalog, openAdvancements: [{ characterLevel: 4, abilityScoreIncrease: [{ ability: "CON", amount: 1 }, { ability: "DEX", amount: 1 }] }] });
    expect(plan!.steps[2].input.customAsi).toEqual([{ ability: "CON", value: 1 }, { ability: "DEX", value: 1 }]);
  });

  it("refuses to change a level where the author names the choice", () => {
    const { plan, issues } = buildAssemblyPlan({ recipe: barbarian, targetLevel: 5, catalog, openAdvancements: [{ characterLevel: 4, featKey: "LUCKY" }] });
    expect(plan).toBeNull();
    expect(issues.map((issue) => issue.code)).toEqual(["advancement-not-open"]);
  });

  it("refuses two choices for the same level and a choice above the target level", () => {
    const twice = buildAssemblyPlan({ recipe: openRecipe, targetLevel: 5, catalog, openAdvancements: [{ characterLevel: 4, featKey: "LUCKY" }, { characterLevel: 4, featKey: "ALERT" }] });
    expect(twice.issues.map((issue) => issue.code)).toEqual(["advancement-not-open"]);
    const tooHigh = buildAssemblyPlan({ recipe: openRecipe, targetLevel: 3, catalog, openAdvancements: [{ characterLevel: 4, featKey: "LUCKY" }] });
    expect(tooHigh.issues.map((issue) => issue.code)).toEqual(["advancement-not-open"]);
  });
});

describe("open class options of a level", () => {
  const clockwork = readRecipe("build-sorcerer-clockwork-soul-2014");
  const openRecipe = structuredClone(clockwork);
  openRecipe.progression.find((step) => step.characterLevel === 17)!.decisions!.openClassOptions = true;
  const metamagicIds = (recipe: BuildRecipe, openClassOptions?: { characterLevel: number; classOptions: { optionNameEng: string }[] }[]) => {
    const { plan, issues } = buildAssemblyPlan({ recipe, targetLevel: 17, catalog, openClassOptions });
    return { issues, selections: plan?.steps.find((step) => step.characterLevel === 17)?.input.classChoiceSelections };
  };
  const optionId = (name: string) => catalog.classes.find((entry) => entry.key === "SORCERER_2014")!.choiceOptions.find((option) => option.nameEng === name)!.id;

  it("keeps the author's default and replaces it with the player's choice", () => {
    expect(Object.values(metamagicIds(openRecipe).selections!)).toEqual([optionId("Careful Spell")]);
    expect(Object.values(metamagicIds(openRecipe, [{ characterLevel: 17, classOptions: [{ optionNameEng: "Seeking Spell" }] }]).selections!)).toEqual([optionId("Seeking Spell")]);
  });

  it("refuses to change a level where the author named the options", () => {
    const { issues } = metamagicIds(clockwork, [{ characterLevel: 3, classOptions: [{ optionNameEng: "Seeking Spell" }] }]);
    expect(issues.map((issue) => issue.code)).toEqual(["class-options-not-open"]);
  });
});
