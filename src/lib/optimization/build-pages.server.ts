import "server-only";
import { notFound } from "next/navigation";
import { isCurrentUserSiteOwner } from "@/server/db/current-user";
import { getAllClasses } from "@/lib/classesData";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { buildLevelOneDraft, type BuildCatalog } from "./build-assembly";
import { readSliceRecipes, readSliceEntityKeys, readSubclassRating } from "./slice-reader";
import type { OptimizationRuleset } from "./types";

export async function loadBuildPage(ruleset: OptimizationRuleset) {
  if (!(await isCurrentUserSiteOwner())) notFound();
  await readSliceEntityKeys();
  const recipes = await readSliceRecipes(ruleset);
  const content = findCharacterCreatorOptions(ruleset);
  const catalog: BuildCatalog = {
    classes: content.classes.map((cls) => ({ key: cls.name, id: cls.classId })),
    races: content.races.map((race) => ({ key: race.name, id: race.raceId, variants: race.raceVariants.map((variant) => ({ key: variant.name, id: variant.raceVariantId })) })),
    backgrounds: content.backgrounds.map((background) => ({ key: background.name, id: background.backgroundId })),
    feats: content.feats.map((feat) => ({ key: feat.name, id: feat.featId })),
  };
  const builds = await Promise.all(recipes.map(async (recipe) => ({
    recipe, startingDraft: buildLevelOneDraft(recipe, catalog),
    rating: recipe.details!.subclassKey ? await readSubclassRating({ ruleset, kind: "subclass", parentKey: recipe.startingClassKey, entityKey: recipe.details!.subclassKey }) : null,
    alternatives: recipe.choices.flatMap((choice) => choice.alternatives.map((alternative) => ({
      alternativeId: alternative.alternativeId, label: translateValue(alternative.entity.entityKey),
      raceId: alternative.entity.kind === "race" ? catalog.races.find((race) => race.key === alternative.entity.entityKey)?.id : undefined,
    }))),
  })));
  return { ruleset, builds, classes: getAllClasses(ruleset).filter((cls) => recipes.some((recipe) => recipe.startingClassKey === cls.key)).map((cls) => ({ key: cls.key, name: cls.name, imageSrc: cls.imageSrc })) };
}

export type BuildPageData = Awaited<ReturnType<typeof loadBuildPage>>;
