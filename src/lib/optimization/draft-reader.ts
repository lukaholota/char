import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildLinkTargets, findDraftRevision, normalizeSourceUrl, summarizeDraft, type DraftSummary, type LinkTargets } from "./article-view";
import { parseArticleDocument } from "./document";
import { readExcludedSourceIds, readSourceManifest } from "./source-policy";
import type { ArticleDocument, OptimizationRuleset } from "./types";

type DraftLocations = { draftsDirectory: string; coverageLedgerPath: string };

const DEFAULT_LOCATIONS: DraftLocations = {
  draftsDirectory: join(process.cwd(), "data/rpgbot/uk"),
  coverageLedgerPath: join(process.cwd(), "data/rpgbot/translation.coverage.json"),
};

export async function listDraftSummaries(locations = DEFAULT_LOCATIONS): Promise<DraftSummary[]> {
  const documents = await loadDraftDocuments(locations.draftsDirectory);
  return documents.map(summarizeDraft);
}

export async function listDraftRevisions(locations = DEFAULT_LOCATIONS) {
  const documents = await loadDraftDocuments(locations.draftsDirectory);
  return documents.map((document) => ({ slug: document.article.slug, revision: findDraftRevision(document) }));
}

export async function readDraftArticle(slug: string, locations = DEFAULT_LOCATIONS) {
  const documents = await loadDraftDocuments(locations.draftsDirectory);
  const document = documents.find((entry) => entry.article.slug === slug);
  if (!document) return null;
  const revision = findDraftRevision(document);
  const sourceUrlsByArticleId = await readSourceUrlsByArticleId(locations);
  return {
    article: document.article,
    revision,
    ratings: document.ratings.filter((rating) => rating.translationRevisionId === revision.translationRevisionId),
    sourceRevision: document.sourceRevisions.find((source) => source.revisionId === revision.sourceRevisionId)!,
    sourceUrl: sourceUrlsByArticleId.get(document.article.articleId)?.[0],
    summaries: documents.map(summarizeDraft),
    linkTargets: buildDraftLinkTargets(documents.filter((entry) => entry.article.ruleset === document.article.ruleset), sourceUrlsByArticleId),
  };
}

export async function findTranslatedArticleSlug(href: string, ruleset: OptimizationRuleset, locations = DEFAULT_LOCATIONS): Promise<string | null> {
  const { key } = normalizeSourceUrl(href);
  const ledger = JSON.parse(await readFile(locations.coverageLedgerPath, "utf8")) as { rows: LedgerRow[] };
  const aliases = await readSourceAliases(locations);
  const articleIds = ledger.rows.filter((row) => row.ruleset === ruleset && collectRowUrls(row, aliases).some((url) => normalizeSourceUrl(url).key === key)).flatMap((row) => row.articleIds);
  const translated = articleIds.find((articleId) => existsSync(join(locations.draftsDirectory, `${articleId}.json`)));
  return translated?.replace(/^rpgbot-/, "") ?? null;
}

let cachedDefaultDocuments: Promise<ArticleDocument[]> | null = null;

function loadDraftDocuments(directory: string): Promise<ArticleDocument[]> {
  if (process.env.NODE_ENV !== "production" || directory !== DEFAULT_LOCATIONS.draftsDirectory) return readDraftDocuments(directory);
  return cachedDefaultDocuments ??= readDraftDocuments(directory).catch((error) => {
    cachedDefaultDocuments = null;
    throw error;
  });
}

async function readDraftDocuments(directory: string): Promise<ArticleDocument[]> {
  const fileNames = await listDraftFileNames(directory);
  if (!fileNames.length) return [];
  const excluded = await readExcludedSourceIds(join(directory, "..", "manifest.json"));
  const documents = await Promise.all(fileNames.map(async (fileName) => parseArticleDocument(JSON.parse(await readFile(join(directory, fileName), "utf8")))));
  return documents.filter((document) => !excluded.has(document.article.sourceId));
}

async function listDraftFileNames(directory: string): Promise<string[]> {
  try {
    return (await readdir(directory)).filter((fileName) => /^rpgbot-.+\.json$/.test(fileName)).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function buildDraftLinkTargets(documents: readonly ArticleDocument[], sourceUrlsByArticleId: ReadonlyMap<string, string[]>): LinkTargets {
  return buildLinkTargets(documents.flatMap((document) => (sourceUrlsByArticleId.get(document.article.articleId) ?? []).map((sourceUrl) => (
    { sourceUrl, slug: document.article.slug, ruleset: document.article.ruleset, sections: findDraftRevision(document).sections }))));
}

type LedgerRow = { sourceId: string; ruleset: string; canonicalUrl: string; articleIds: string[] };

async function readSourceUrlsByArticleId(locations: DraftLocations): Promise<Map<string, string[]>> {
  try {
    const ledger = JSON.parse(await readFile(locations.coverageLedgerPath, "utf8")) as { rows: LedgerRow[] };
    const aliases = await readSourceAliases(locations);
    return new Map(ledger.rows.flatMap((row) => row.articleIds.map((articleId) => [articleId, collectRowUrls(row, aliases)] as const)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Map();
    throw error;
  }
}

function collectRowUrls(row: LedgerRow, aliases: ReadonlyMap<string, string[]>): string[] {
  return [row.canonicalUrl, ...(aliases.get(row.sourceId) ?? [])];
}

async function readSourceAliases(locations: DraftLocations): Promise<Map<string, string[]>> {
  const entries = await readSourceManifest(join(locations.draftsDirectory, "..", "manifest.json"));
  return new Map(entries.map((entry) => [entry.sourceId, entry.aliases]));
}
