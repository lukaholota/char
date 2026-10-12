import { findAliasVariants } from "@/lib/search/searchAliases";
import type { ReadyPreset } from "./ready-preset";
import { findReadyPresetClass } from "./ready-preset-class";
import { findReadyPresetRecipe, listReadyPresetSlugs, readReadyPreset } from "./ready-preset-files";
import { ENTITY_ALIAS_TYPES } from "./search-index-builder";
import { readSliceRecipes } from "./slice-reader";
import type { BuildRecipe } from "./types";

export type ReadyPresetSearchEntry = {
  slug: string;
  title: string;
  className: string;
  classEngName: string;
  subclassName: string;
  subclassEngName: string;
  aliases: string[];
};

export async function loadReadyPresetSearchEntries(): Promise<ReadyPresetSearchEntry[]> {
  const recipes = await readSliceRecipes("RULES_2014");
  const slugs = await listReadyPresetSlugs();
  const entries = await Promise.all(slugs.map(async (slug) => {
    const preset = await readReadyPreset(slug);
    return buildReadyPresetSearchEntry(slug, preset, findReadyPresetRecipe(preset, recipes));
  }));
  assertUniqueSlugs(entries);
  return entries;
}

export function buildReadyPresetSearchEntry(slug: string, preset: ReadyPreset, recipe: BuildRecipe): ReadyPresetSearchEntry {
  const { subclassClass, subclass } = findReadyPresetClass(recipe);
  return {
    slug, title: preset.title, className: subclassClass.name, classEngName: subclassClass.engName,
    subclassName: subclass.name, subclassEngName: subclass.engName,
    aliases: findAliasVariants("RULES_2014", ENTITY_ALIAS_TYPES, [subclassClass.name, subclass.name, subclassClass.key, subclass.key]),
  };
}

function assertUniqueSlugs(entries: readonly ReadyPresetSearchEntry[]): void {
  const slugs = entries.map((entry) => entry.slug);
  if (new Set(slugs).size !== slugs.length) throw new Error("Duplicate ready preset search slug");
}
