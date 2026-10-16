import { readFileSync, readdirSync } from "node:fs";
import type { Ruleset } from "@prisma/client";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { findExecutableLevels } from "@/lib/optimization/build-executable-levels";
import { readyPresetSchema, type ReadyPreset } from "@/lib/optimization/ready-preset";
import { buildReadyPresetLevels } from "@/lib/optimization/ready-preset-levels.server";
import { buildRecipeSchema } from "@/lib/optimization/schema";
import type { BuildRecipe } from "@/lib/optimization/types";
import { pickCustomizedLevel } from "./customize";

const READY_BUILDS_DIRECTORY = "data/rpgbot/ready-builds";
const BUILDS_DIRECTORY = "data/rpgbot/builds";

export type StoredPreset = { slug: string; preset: ReadyPreset; recipe: BuildRecipe };
export type PresetSweepCase = { slug: string; ruleset: Ruleset; targetLevel: number; customizedTrial?: number };

export function listPresetSweepCases(ruleset: Ruleset): PresetSweepCase[] {
  return listStoredPresets(ruleset).flatMap((stored) => listPresetLevels(stored).map((targetLevel) => ({ slug: stored.slug, ruleset, targetLevel })));
}

export function listCustomizedSweepCases(ruleset: Ruleset, trials: number): PresetSweepCase[] {
  return listStoredPresets(ruleset).flatMap((stored) => Array.from({ length: trials }, (_unused, customizedTrial) => ({
    slug: stored.slug, ruleset, customizedTrial, targetLevel: pickCustomizedLevel(stored.slug, customizedTrial, listPresetLevels(stored)),
  })));
}

export function listStoredPresets(ruleset: Ruleset): StoredPreset[] {
  return listPresetSlugs().flatMap((slug) => {
    const recipe = readRecipeOf(slug);
    return recipe.ruleset === ruleset ? [{ slug, preset: readPreset(slug), recipe }] : [];
  });
}

export function readStoredPreset(slug: string): StoredPreset {
  return { slug, preset: readPreset(slug), recipe: readRecipeOf(slug) };
}

export function listPresetLevels({ recipe, preset }: StoredPreset): number[] {
  const levels = buildReadyPresetLevels(recipe, findCharacterCreationOptions(recipe.ruleset), preset.subraceKey);
  return [1, ...(levels?.targetLevels ?? [])];
}

export function listLevelsOutsideExecutable(stored: StoredPreset): number[] {
  const executable = findExecutableLevels(stored.recipe);
  return listPresetLevels(stored).filter((level) => !executable.includes(level));
}

export function listSupportedLevelsNotOffered(stored: StoredPreset): number[] {
  const offered = listPresetLevels(stored);
  return stored.recipe.supportedLevels.filter((level) => !offered.includes(level));
}

function listPresetSlugs(): string[] {
  return readdirSync(READY_BUILDS_DIRECTORY).filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -5)).sort();
}

function readPreset(slug: string): ReadyPreset {
  return readyPresetSchema.parse(readPresetJson(slug));
}

function readPresetJson(slug: string): { buildId: string } {
  return JSON.parse(readFileSync(`${READY_BUILDS_DIRECTORY}/${slug}.json`, "utf8"));
}

function readRecipeOf(slug: string): BuildRecipe {
  return buildRecipeSchema.parse(JSON.parse(readFileSync(`${BUILDS_DIRECTORY}/${readPresetJson(slug).buildId}.json`, "utf8")));
}
