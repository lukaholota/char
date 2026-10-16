import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getAllClasses } from "@/lib/classesData";
import { listExecutableSteps } from "./build-executable-levels";
import { findReadyPresetClass } from "./ready-preset-class";
import { readyPresetSchema } from "./ready-preset";
import { buildRecipeSchema } from "./schema";
import type { BuildRecipe } from "./types";

const ROOT = "data/rpgbot";
const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const presetSlugs = readdirSync(`${ROOT}/ready-builds`).filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -5)).sort();
const classes = getAllClasses("RULES_2014");
const ARTIFICER_SUBCLASS_KEYS = classes.find((entry) => entry.key === "ARTIFICER_2014")!.subclasses.map((entry) => entry.key);

function readPresetRecipe(slug: string): BuildRecipe {
  const preset = readyPresetSchema.parse(readJson(`${ROOT}/ready-builds/${slug}.json`));
  return buildRecipeSchema.parse(readJson(`${ROOT}/builds/${preset.buildId}.json`));
}

function listBuildSteps(recipe: BuildRecipe) {
  return [recipe.progression.find((step) => step.characterLevel === 1)!, ...listExecutableSteps(recipe)];
}

function countClassLevels(recipe: BuildRecipe): Map<string, number> {
  const levels = new Map<string, number>();
  for (const step of listBuildSteps(recipe)) levels.set(step.classKey, (levels.get(step.classKey) ?? 0) + 1);
  return levels;
}

function cutRecipeToLevel(recipe: BuildRecipe, level: number): BuildRecipe {
  return { ...recipe, supportedLevels: recipe.supportedLevels.filter((entry) => entry <= level), progression: recipe.progression.filter((step) => step.characterLevel <= level) };
}

describe("main class of every ready preset", () => {
  it.each(presetSlugs)("%s is grouped under the class with the most levels and a subclass that class reaches", (slug) => {
    const recipe = readPresetRecipe(slug);
    const { mainClass, mainSubclass, mainSubclassLevel } = findReadyPresetClass(recipe);
    const levels = countClassLevels(recipe);
    const mostLevels = Math.max(...levels.values());
    expect(levels.get(mainClass.key)).toBe(mostLevels);
    if (levels.get(recipe.startingClassKey) === mostLevels) expect(mainClass.key).toBe(recipe.startingClassKey);
    expect(mainClass.subclasses.map((entry) => entry.key)).toContain(mainSubclass.key);
    const subclassStep = listBuildSteps(recipe).find((step) => step.classKey === mainClass.key && step.subclassKey === mainSubclass.key);
    expect(subclassStep?.characterLevel).toBe(mainSubclassLevel);
  });

  it.each(presetSlugs)("%s describes its first subclass with the class that owns and reaches it", (slug) => {
    const recipe = readPresetRecipe(slug);
    const { subclassClass, subclass, subclassLevel } = findReadyPresetClass(recipe);
    expect(subclassClass.subclasses.map((entry) => entry.key)).toContain(subclass.key);
    expect(listBuildSteps(recipe).find((step) => step.classKey === subclassClass.key && step.subclassKey === subclass.key)?.characterLevel).toBe(subclassLevel);
  });

  it("never labels a wizard build with an Artificer subclass it cannot reach", () => {
    const wizardBuilds = presetSlugs.map((slug) => ({ slug, ...findReadyPresetClass(readPresetRecipe(slug)) })).filter((entry) => entry.mainClass.key === "WIZARD_2014");
    expect(wizardBuilds.length).toBeGreaterThan(10);
    for (const build of wizardBuilds) {
      expect(ARTIFICER_SUBCLASS_KEYS, build.slug).not.toContain(build.mainSubclass.key);
      expect(ARTIFICER_SUBCLASS_KEYS, build.slug).not.toContain(build.subclass.key);
    }
  });

  it("puts an Artificer-dip wizard under the Wizard school and counts the starting levels", () => {
    const result = findReadyPresetClass(readPresetRecipe("wizard-abjuration-2014"));
    expect(result).toMatchObject({ mainSubclassLevel: 3, subclassLevel: 3, startingClassLevels: 1 });
    expect([result.characterClass.key, result.mainClass.key, result.mainSubclass.key, result.subclassClass.key]).toEqual(["ARTIFICER_2014", "WIZARD_2014", "SCHOOL_OF_ABJURATION", "WIZARD_2014"]);
  });

  it("keeps the level-one domain of a Cleric dip for the first level while the build is labelled by its Sorcerer origin", () => {
    const result = findReadyPresetClass(readPresetRecipe("sorcerer-divine-soul-2014"));
    expect([result.subclassClass.key, result.subclass.key, result.subclassLevel]).toEqual(["CLERIC_2014", "ORDER_DOMAIN", 1]);
    expect([result.mainClass.key, result.mainSubclass.key, result.mainSubclassLevel, result.startingClassLevels]).toEqual(["SORCERER_2014", "DIVINE_SOUL", 2, 1]);
  });

  it("opens the starting class subclass at the character level it is taken, after an early dip", () => {
    const result = findReadyPresetClass(readPresetRecipe("hexadin-ancients-2014"));
    expect([result.subclass.key, result.subclassLevel, result.mainClass.key, result.startingClassLevels]).toEqual(["OATH_OF_THE_ANCIENTS", 4, "PALADIN_2014", 1]);
  });

  it("prefers the starting class on a tie and falls back to the planned subclass before the class reaches it", () => {
    const result = findReadyPresetClass(cutRecipeToLevel(readPresetRecipe("hexadin-ancients-2014"), 2));
    expect([result.mainClass.key, result.mainSubclass.key, result.mainSubclassLevel, result.startingClassLevels]).toEqual(["PALADIN_2014", "OATH_OF_THE_ANCIENTS", 3, 1]);
  });

  it("uses the planned subclass of a recipe that stops at the first level", () => {
    const result = findReadyPresetClass(cutRecipeToLevel(readPresetRecipe("wizard-evocation-2014"), 1));
    expect([result.mainClass.key, result.mainSubclass.key, result.mainSubclassLevel, result.subclass.key]).toEqual(["WIZARD_2014", "SCHOOL_OF_EVOCATION", 2, "SCHOOL_OF_EVOCATION"]);
  });

  it("groups a build of several dips under its largest class, and a tie without the starting class under the class taken first", () => {
    const recipe = readPresetRecipe("d4-dispenser-cleric-peace-2014");
    const result = findReadyPresetClass(recipe);
    expect([result.mainClass.key, result.mainSubclass.key, result.startingClassLevels]).toEqual(["WARLOCK_2014", "FIEND", 1]);
    const tied = cutRecipeToLevel(recipe, 7);
    expect([...countClassLevels(tied)]).toEqual([["CLERIC_2014", 1], ["WARLOCK_2014", 3], ["ARTIFICER_2014", 3]]);
    expect(findReadyPresetClass(tied).mainClass.key).toBe("WARLOCK_2014");
  });
});
