import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { getAllClasses } from "@/lib/classesData";
import { findFeatureKey } from "@/lib/catalogs/reading-target";
import { findBoundFeatureContent, findBoundFeatureRating } from "./feature-analysis";
import { hydrateArticleDocument } from "./hydration-catalog";
import { cacheInProduction } from "./production-cache";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { buildDraftArticleHref, buildRecipeGuideHref, findDraftRevision, findHeadingRating } from "./article-view";
import { findTranslatedArticleSlug } from "./draft-reader";
import { findLoneLink } from "./inline-view";
import { bindingSchema, buildRecipeSchema, entitySchema, idSchema, slicePreviewSchema } from "./schema";
import { parseArticleDocument } from "./document";
import { readExcludedSourceIds } from "./source-policy";
import { entityIdentity, resolvePrimaryBinding } from "./bindings";
import type { ArticleDocument, BuildRecipe, EntityRef, OptimizationRuleset } from "./types";

const ROOT = join(process.cwd(), "data/rpgbot");
const cachedDocuments = new Map<string, { modifiedAt: number; document: ArticleDocument }>();

export async function readSliceArticle(slug: string, ruleset: OptimizationRuleset) {
  idSchema.parse(slug);
  const path = join(ROOT, "uk", `rpgbot-${slug}.json`);
  const modifiedAt = (await stat(path)).mtimeMs;
  let cached = cachedDocuments.get(slug);
  if (!cached || cached.modifiedAt !== modifiedAt) {
    cached = { modifiedAt, document: parseArticleDocument(JSON.parse(await readFile(path, "utf8"))) };
    cachedDocuments.set(slug, cached);
  }
  if (cached.document.article.ruleset !== ruleset) return null;
  if ((await readExcludedSourceIds(join(ROOT, "manifest.json"))).has(cached.document.article.sourceId)) return null;
  return cached.document;
}

export async function readSliceBindings() {
  return z.array(bindingSchema).parse(JSON.parse(await readFile(join(ROOT, "bindings.json"), "utf8")));
}

let cachedRecipes: Promise<BuildRecipe[]> | null = null;

export async function readSliceRecipes(ruleset: OptimizationRuleset) {
  const recipes = await (process.env.NODE_ENV === "production" ? cachedRecipes ??= readAllRecipes().catch((error) => {
    cachedRecipes = null;
    throw error;
  }) : readAllRecipes());
  return recipes.filter((recipe) => recipe.ruleset === ruleset);
}

async function readAllRecipes(): Promise<BuildRecipe[]> {
  const names = (await readdir(join(ROOT, "builds"))).filter((name) => /^build-[a-z0-9-]+\.json$/.test(name));
  return Promise.all(names.map(async (name) => buildRecipeSchema.parse(JSON.parse(await readFile(join(ROOT, "builds", name), "utf8")))));
}

export function collectSliceCatalog(ruleset: OptimizationRuleset): EntityRef[] {
  const content = findCharacterCreatorOptions(ruleset);
  const createEntity = (kind: EntityRef["kind"], entityKey: string, parentKey?: string): EntityRef => ({ ruleset, kind, entityKey, ...(parentKey ? { parentKey } : {}) });
  return [
    ...getAllClasses(ruleset).flatMap((cls) => [createEntity("class", cls.key), ...cls.subclasses.flatMap((sub) => [createEntity("subclass", sub.key, cls.key), ...sub.features.map((feature) => createEntity("feature", findFeatureKey(feature), sub.key))])]),
    ...content.races.flatMap((race) => [createEntity("race", race.name), ...race.raceVariants.map((variant) => createEntity("variant", variant.name, race.name))]),
    ...content.backgrounds.map((background) => createEntity("background", background.name)),
    ...content.feats.map((feat) => createEntity("feat", feat.name)),
  ];
}

export const readSlicePreview = cacheInProduction(buildSlicePreview, "rpgbot-slice-preview");

export const readHydratedSliceArticle = cacheInProduction(async (slug: string, ruleset: OptimizationRuleset) => {
  const document = await readSliceArticle(slug, ruleset);
  return document && hydrateArticleDocument(document);
}, "rpgbot-slice-article");

export async function readSubclassRating(entity: EntityRef) {
  const resolved = resolvePrimaryBinding(await readSliceBindings(), entity);
  if (resolved.status !== "resolved") return null;
  const document = await readSliceArticle(resolved.binding.articleId.replace(/^rpgbot-/, ""), entity.ruleset);
  return document ? findHeadingRating(document.ratings, resolved.binding.sectionId) : null;
}

async function buildSlicePreview(entity: EntityRef) {
  entitySchema.parse(entity);
  const bindings = await readSliceBindings();
  const resolved = resolvePrimaryBinding(bindings, entity);
  if (resolved.status !== "resolved") return null;
  const binding = resolved.binding;
  const slug = binding.articleId.replace(/^rpgbot-/, "");
  const document = await readSliceArticle(slug, entity.ruleset);
  if (!document) return null;
  const rating = findHeadingRating(document.ratings, binding.sectionId);
  const recipes = (await readSliceRecipes(entity.ruleset)).filter((recipe) => recipe.startingClassKey === entity.parentKey && recipe.details?.subclassKey === entity.entityKey);
  return { binding, slug, rating, title: document.article.titleUk,
    href: buildDraftArticleHref(entity.ruleset, slug, binding.sectionId),
    guideHref: await findSectionGuideHref(document, binding.sectionId),
    builds: recipes.map((recipe) => ({ buildId: recipe.buildId, title: recipe.title, guideHref: buildRecipeGuideHref(recipe) })),
    features: await collectSubclassFeatureAnalyses(entity, bindings) };
}

async function findSectionGuideHref(document: ArticleDocument, sectionId: string): Promise<string | null> {
  const section = findDraftRevision(document).sections.find((entry) => entry.sectionId === sectionId);
  const hrefs = section?.blocks.flatMap((block) => (block.type === "paragraph" ? findLoneLink(block.content)?.href ?? [] : [])) ?? [];
  const { ruleset, slug: ownSlug } = document.article;
  for (const href of hrefs) {
    const slug = await findTranslatedArticleSlug(href, ruleset);
    if (slug && slug !== ownSlug && await readSliceArticle(slug, ruleset)) return buildDraftArticleHref(ruleset, slug);
  }
  return null;
}

async function collectSubclassFeatureAnalyses(entity: EntityRef, bindings: Awaited<ReturnType<typeof readSliceBindings>>) {
  if (entity.kind !== "subclass") return [];
  const subclass = getAllClasses(entity.ruleset).find((entry) => entry.key === entity.parentKey)?.subclasses.find((entry) => entry.key === entity.entityKey);
  if (!subclass) return [];
  const featureBindings = subclass.features.flatMap((feature) => {
    const resolved = resolvePrimaryBinding(bindings, { ruleset: entity.ruleset, kind: "feature", parentKey: entity.entityKey, entityKey: findFeatureKey(feature) });
    return resolved.status === "resolved" ? [resolved.binding] : [];
  });
  const documents = new Map<string, Promise<ArticleDocument | null>>();
  function readFeatureDocument(slug: string) {
    if (!documents.has(slug)) documents.set(slug, readHydratedSliceArticle(slug, entity.ruleset));
    return documents.get(slug)!;
  }
  const analyses = await Promise.all(featureBindings.map(async (binding) => {
    const feature = subclass.features.find((entry) => findFeatureKey(entry) === binding.entity.entityKey);
    const slug = binding.articleId.replace(/^rpgbot-/, "");
    const document = await readFeatureDocument(slug);
    const bound = document && findBoundFeatureContent(document.translations.at(-1)!, binding);
    if (!feature || !document || !bound) return null;
    const nodes = [...bound.content, ...(bound.childrenBlock?.items.flat() ?? [])];
    const hrefs = new Set(nodes.filter((node) => node.type === "link").map((node) => node.href));
    return { binding, name: feature.name, engName: feature.engName, level: feature.level, content: bound.content, childrenBlock: bound.childrenBlock,
      contentReferences: document.contentReferences?.filter((reference) => hrefs.has(reference.href)) ?? [],
      rating: findBoundFeatureRating(document, binding), href: buildDraftArticleHref(entity.ruleset, slug, binding.sectionId) };
  }));
  return analyses.filter((analysis) => analysis !== null);
}

export async function readSliceEntityKeys() {
  const keys = z.array(entitySchema).parse(JSON.parse(await readFile(join(ROOT, "entity-keys.json"), "utf8")));
  const available = new Set([ ...collectSliceCatalog("RULES_2014"), ...collectSliceCatalog("RULES_2024") ].map(entityIdentity));
  const missing = keys.filter((key) => !available.has(entityIdentity(key)));
  if (missing.length) throw new Error(`Missing catalog keys: ${missing.map(entityIdentity).join(", ")}`);
  return keys;
}

export type SlicePreview = z.infer<typeof slicePreviewSchema>;
