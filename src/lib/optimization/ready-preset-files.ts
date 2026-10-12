import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { readyPresetSchema, type ReadyPreset } from "./ready-preset";
import { idSchema } from "./schema";
import type { BuildRecipe } from "./types";

const PRESETS_DIRECTORY = "data/rpgbot/ready-builds";

export async function listReadyPresetSlugs(): Promise<string[]> {
  const filenames = await readdir(join(process.cwd(), PRESETS_DIRECTORY));
  return filenames.filter((filename) => filename.endsWith(".json") && idSchema.safeParse(filename.slice(0, -5)).success)
    .map((filename) => filename.slice(0, -5)).sort();
}

export async function readReadyPreset(slug: string): Promise<ReadyPreset> {
  return readyPresetSchema.parse(JSON.parse(await readFile(join(process.cwd(), PRESETS_DIRECTORY, `${slug}.json`), "utf8")));
}

export function findReadyPresetRecipe(preset: ReadyPreset, recipes: readonly BuildRecipe[]): BuildRecipe {
  const recipe = recipes.find((entry) => entry.buildId === preset.buildId && entry.revisionId === preset.revisionId);
  if (!recipe) throw new Error(`Missing ready preset recipe: ${preset.buildId}`);
  return recipe;
}
