import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getAllRuleCategories } from "@/lib/rulesData";
import { isCurrentUserSiteOwner } from "@/server/db/current-user";
import { findArticleImageSrc, type SubclassKeyBySlug } from "./article-art";
import { groupDraftSummaries, pickLinkedTargets, type DraftSummary } from "./article-view";
import { listDraftSummaries, readDraftArticle } from "./draft-reader";
import { collectBlockLinks, hydrateArticleDocument } from "./hydration-catalog";
import { cacheInProduction } from "./production-cache";
import { dropFetchedReferenceText } from "./reference-card-target";
import { findArticleCatalogLinks } from "./article-catalog-links.server";
import type { OptimizationRuleset } from "./types";

export async function loadIndexPageData(ruleset: OptimizationRuleset) {
  await requireAccessTo(ruleset);
  const summaries = (await listDraftSummaries()).filter((summary) => summary.ruleset === ruleset);
  return { ruleset, summaries: await addArticleArt(summaries), ruleCategories: listRuleCategoryLinks() };
}

async function addArticleArt(summaries: DraftSummary[]): Promise<DraftSummary[]> {
  const subclassKeyBySlug = await readSubclassKeyBySlug();
  return summaries.map((summary) => ({ ...summary, imageSrc: findArticleImageSrc(summary, subclassKeyBySlug) }));
}

async function readSubclassKeyBySlug(): Promise<SubclassKeyBySlug> {
  return JSON.parse(await readFile(join(process.cwd(), "data/rpgbot/article-art.json"), "utf8"));
}

// Metadata and the page read the same article within one request.
export const loadArticlePageData = cache(async (ruleset: OptimizationRuleset, slug: string) => {
  await requireAccessTo(ruleset);
  const article = await readHydratedArticle(slug);
  if (!article || article.article.ruleset !== ruleset) notFound();
  return { ...article, linkTargets: new Map(article.linkTargets), ruleCategories: listRuleCategoryLinks() };
});

async function hydrateArticlePage(slug: string) {
  const draft = await readDraftArticle(slug);
  if (!draft) return null;
  const { summaries, ...article } = draft;
  const hydrated = await hydrateArticleDocument({ article: draft.article, translations: [draft.revision] });
  const groups = groupDraftSummaries(summaries.filter((summary) => summary.ruleset === draft.article.ruleset));
  const revision = hydrated.translations[0];
  // The cache stores JSON, which would turn the Map into an empty object.
  const linkTargets = pickLinkedTargets(article.linkTargets, revision.sections.flatMap((section) => section.blocks.flatMap(collectBlockLinks)));
  return { ...article, linkTargets, revision, contentReferences: hydrated.contentReferences.map(dropFetchedReferenceText), groups, catalogLinks: await findArticleCatalogLinks(draft.article) };
}

const readHydratedArticle = cacheInProduction(hydrateArticlePage, "rpgbot-article-page");

async function requireAccessTo(ruleset: OptimizationRuleset) {
  if (ruleset === "RULES_2014") return;
  if (!(await isCurrentUserSiteOwner())) notFound();
}

function listRuleCategoryLinks() {
  return getAllRuleCategories().map((category) => ({ key: category.key, title: category.title }));
}
