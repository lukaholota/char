import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { findBackgroundStartingItems } from "@/rules/background-equipment";
import { buildReadyPresetDraft, type ReadyPreset } from "./ready-preset";
import { readSliceArticle, readSliceRecipes } from "./slice-reader";
import type { BuildRecipe } from "./types";
import type { CreatorContent } from "@/server/db/creator-content-query";
import type { ReadyPresetCatalogEntry } from "./ready-preset-catalog";
import { idSchema } from "./schema";
import { buildReadyPresetOptions } from "./ready-preset-options";
import { buildPresetAbilitySources } from "./ready-preset-abilities";
import { hasFirstLevelSubclass } from "./ready-preset-identity";
import { findReadyPresetClass } from "./ready-preset-class";
import { findExecutableLevels } from "./build-executable-levels";
import { findReadyPresetRecipe, listReadyPresetSlugs, readReadyPreset } from "./ready-preset-files";
import { buildReadyPresetLevels } from "./ready-preset-levels.server";
import { createLogger } from "@/server/logging/logger";

export async function loadReadyPresetPage(slug: string) {
  const slugs = await listReadyPresetSlugs();
  if (!idSchema.safeParse(slug).success || !slugs.includes(slug)) notFound();
  const preset = await readReadyPreset(slug);
  const recipe = findReadyPresetRecipe(preset, await readSliceRecipes("RULES_2014"));
  await verifyReadyPresetSource(preset, recipe);
  return buildReadyPresetPageData(preset, recipe, findCharacterCreationOptions("RULES_2014"));
}

const DEVELOPMENT_CATALOG_TTL_MS = 60_000;

const log = createLogger("rpgbot.ready-presets");

let cachedReadyPresetCatalog: Promise<ReadyPresetCatalogEntry[]> | null = null;
let cachedReadyPresetCatalogAt = 0;

export function loadReadyPresetCatalog(): Promise<ReadyPresetCatalogEntry[]> {
  const isFresh = process.env.NODE_ENV === "production" || Date.now() - cachedReadyPresetCatalogAt < DEVELOPMENT_CATALOG_TTL_MS;
  if (cachedReadyPresetCatalog && isFresh) return cachedReadyPresetCatalog;
  cachedReadyPresetCatalogAt = Date.now();
  cachedReadyPresetCatalog = buildReadyPresetCatalog().catch((error) => {
    cachedReadyPresetCatalog = null;
    throw error;
  });
  return cachedReadyPresetCatalog;
}

async function buildReadyPresetCatalog(): Promise<ReadyPresetCatalogEntry[]> {
  const slugs = await listReadyPresetSlugs();
  const recipes = await readSliceRecipes("RULES_2014");
  const content = findCharacterCreationOptions("RULES_2014");
  const entries = await Promise.all(slugs.map(async (slug) => {
    try {
      const preset = await readReadyPreset(slug);
      const recipe = findReadyPresetRecipe(preset, recipes);
      await verifyReadyPresetSource(preset, recipe);
      const draft = buildReadyPresetDraft(recipe, preset, content);
      return buildReadyPresetCatalogEntry(slug, preset, recipe, { draft, content });
    } catch (err) {
      log.error("ready-preset.catalog.skipped", { slug, err });
      return null;
    }
  }));
  return entries.filter((entry) => entry !== null);
}

function buildReadyPresetCatalogEntry(slug: string, preset: ReadyPreset, recipe: BuildRecipe, { draft, content }: { draft: ReturnType<typeof buildReadyPresetDraft>; content: CreatorContent }): ReadyPresetCatalogEntry {
  const { subclassClass, subclass } = findReadyPresetClass(recipe);
  const { race, variant, subrace } = findReadyPresetPageContent(draft, content);
  const classLabel = [...new Set(recipe.progression.map((step) => step.classKey))]
    .map((key) => translateValue(content.classes.find((entry) => entry.name === key)!.name)).join(" / ");
  const portraitSrc = preset.portraitSrc && existsSync(join(process.cwd(), "public", preset.portraitSrc)) ? preset.portraitSrc : null;
  return { slug, buildId: preset.buildId, title: preset.title, description: preset.description, className: subclassClass.name,
    subclassName: subclass.name, raceName: translateValue(variant?.name ?? subrace?.name ?? race.name), baseRaceName: translateValue(race.name), classLabel,
    startingClassKey: recipe.startingClassKey, startingSubclassKey: subclassClass.key === recipe.startingClassKey ? subclass.key : null, raceKey: race.name,
    maxLevel: Math.max(...findExecutableLevels(recipe)), sourceTitle: recipe.title, portraitSrc,
    subclassImageSrc: subclass.imageSrc ?? null, classImageSrc: subclassClass.imageSrc };
}

async function verifyReadyPresetSource(preset: ReadyPreset, recipe: BuildRecipe) {
  const document = await readSliceArticle(preset.articleSlug, "RULES_2014");
  const primary = recipe.sourceRefs[0];
  const translation = document?.translations.find((entry) => entry.translationRevisionId === primary.translationRevisionId);
  const sections = translation?.sections;
  if (!sections || document?.article.articleId !== primary.articleId || translation.sourceRevisionId !== primary.sourceRevisionId) throw new Error(`Missing ready preset article revision: ${preset.articleSlug}`);
  const refs = [...recipe.sourceRefs, ...recipe.details!.nodes.flatMap((node) => node.sourceRefs), ...recipe.details!.levelPlans.flatMap((plan) => plan.sourceRefs)];
  if (refs.some((ref) => ref.articleId !== primary.articleId || ref.translationRevisionId !== primary.translationRevisionId || ref.sourceRevisionId !== primary.sourceRevisionId)) throw new Error(`Ready preset source revision mismatch: ${preset.buildId}`);
  for (const sectionId of [preset.skillSection, preset.equipmentSection, ...preset.featSection ? [preset.featSection] : [], ...preset.spells ? [preset.spells.sectionId] : [], ...refs.map((ref) => ref.sectionId)]) {
    if (!sections.some((section) => section.sectionId === sectionId)) throw new Error(`Missing ready preset source: ${sectionId}`);
  }
}

function buildReadyPresetPageData(preset: ReadyPreset, recipe: BuildRecipe, content: CreatorContent) {
  const draft = buildReadyPresetDraft(recipe, preset, content);
  const pageContent = findReadyPresetPageContent(draft, content);
  return { preset, recipe, draft, options: buildReadyPresetOptions(draft, content),
    creator: {
      characterClass: { classId: pageContent.characterClass.classId, name: pageContent.characterClass.name, ruleset: pageContent.characterClass.ruleset,
        startingEquipmentOption: pageContent.characterClass.startingEquipmentOption, languages: pageContent.characterClass.languages },
      race: { raceId: pageContent.race.raceId, ASI: pageContent.race.ASI, languages: pageContent.race.languages,
        raceChoiceOptions: pageContent.race.raceChoiceOptions, subraces: pageContent.subrace ? [pageContent.subrace] : [] },
      variant: pageContent.variant, subrace: pageContent.subrace, background: pageContent.background, weapons: content.weapons,
    },
    summary: buildReadyPresetSummary(pageContent, recipe), abilityInput: buildPresetAbilitySources(draft, content),
    levels: buildReadyPresetLevels(recipe, content),
    belongings: findBackgroundStartingItems(pageContent.background, undefined),
  };
}

function findReadyPresetPageContent(draft: ReturnType<typeof buildReadyPresetDraft>, content: CreatorContent) {
  const characterClass = content.classes.find((entry) => entry.classId === draft.classId)!;
  const race = content.races.find((entry) => entry.raceId === draft.raceId)!;
  return { draft, characterClass, race,
    variant: race.raceVariants.find((entry) => entry.raceVariantId === draft.raceVariantId),
    subrace: race.subraces.find((entry) => entry.subraceId === draft.subraceId),
    background: content.backgrounds.find((entry) => entry.backgroundId === draft.backgroundId)!,
    feat: content.feats.find((entry) => entry.featId === draft.featId),
  };
}
type ReadyPresetPageContent = ReturnType<typeof findReadyPresetPageContent>;

function buildReadyPresetSummary({ draft, characterClass, race, variant, subrace, background, feat }: ReadyPresetPageContent, recipe: BuildRecipe) {
  const { subclass, subclassLevel } = findReadyPresetClass(recipe);
  const featOptions = feat?.featChoiceOptions.filter((entry) => Object.values(draft.featChoiceSelections).flat().includes(entry.choiceOptionId)) ?? [];
  return { className: translateValue(characterClass.name), raceName: translateValue(variant?.name ?? subrace?.name ?? race.name),
    backgroundName: translateValue(background.name), subclassName: subclass.name, subclassLevel,
    featName: feat ? translateValue(feat.name) : null, featOptionLabel: featOptions.map((entry) => entry.choiceOption.optionName).join(", ") || null,
    startsWithSubclass: hasFirstLevelSubclass(characterClass),
  };
}

export type ReadyPresetPageData = Awaited<ReturnType<typeof loadReadyPresetPage>>;

export async function findReadyPresetSlugForBuild(buildId: string): Promise<string | null> {
  for (const slug of await listReadyPresetSlugs()) {
    if ((await readReadyPreset(slug)).buildId === buildId) return slug;
  }
  return null;
}
