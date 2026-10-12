import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { entitySchema, bindingSchema, buildRecipeSchema } from "../../src/lib/optimization/schema";
import { readSourceManifest } from "../../src/lib/optimization/source-policy";
import { requireValidCorpus } from "../../src/lib/optimization/validation";
import { parseArticleDocument } from "../../src/lib/optimization/document";
import type { ArticleDocument, Corpus } from "../../src/lib/optimization/types";

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readDocuments(directory: string) {
  const names = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  return Promise.all(names.map(async (name) => {
    const document = parseArticleDocument(await readJson(join(directory, name)));
    if (name !== `${document.article.articleId}.json`) throw new Error(`Article file must be named ${document.article.articleId}.json`);
    return document;
  }));
}

function collectManifestSources(manifest: Awaited<ReturnType<typeof readSourceManifest>>): Corpus["sources"] {
  return manifest.filter((entry) => entry.disposition === "included").map((entry) => ({
    sourceId: entry.sourceId,
    rulesets: entry.rulesets.map((edition) => edition === "2014" ? "RULES_2014" as const : "RULES_2024" as const),
  }));
}

function checkDocumentSources(documents: ArticleDocument[], sources: Corpus["sources"]) {
  for (const document of documents) for (const source of document.sources) {
    const registered = sources.find((entry) => entry.sourceId === source.sourceId);
    if (!registered || [...source.rulesets].sort().join() !== [...registered.rulesets].sort().join())
      throw new Error(`Document source conflicts with included manifest: ${source.sourceId}`);
  }
}

function collectSourceRevisions(documents: ArticleDocument[]) {
  const revisions = documents.flatMap((document) => document.sourceRevisions);
  const sourceRevisions = [...new Map(revisions.map((revision) => [revision.revisionId, revision])).values()];
  for (const revision of revisions) {
    if (JSON.stringify(revision) !== JSON.stringify(sourceRevisions.find((entry) => entry.revisionId === revision.revisionId)))
      throw new Error(`Conflicting source revision: ${revision.revisionId}`);
  }
  return sourceRevisions;
}

export async function loadCorpus(directory: string) {
  const manifest = await readSourceManifest(join(directory, "manifest.json"));
  const sources = collectManifestSources(manifest);
  const excluded = new Set(manifest.filter((entry) => entry.disposition === "excluded").map((entry) => entry.sourceId));
  const documents = (await readDocuments(join(directory, "uk"))).filter((document) => !excluded.has(document.article.sourceId));
  checkDocumentSources(documents, sources);
  const sourceRevisions = collectSourceRevisions(documents);
  const catalog = z.array(entitySchema).parse(await readJson(join(directory, "entity-keys.json")));
  const bindings = z.array(bindingSchema).parse(await readJson(join(directory, "bindings.json")));
  const recipes = z.array(buildRecipeSchema).parse(await readJson(join(directory, "builds.json")));
  const corpus = requireValidCorpus({ schemaVersion: 1, sources, sourceRevisions,
    articles: documents.map((document) => document.article),
    translations: documents.flatMap((document) => document.translations),
    ratings: documents.flatMap((document) => document.ratings), bindings, recipes }, catalog);
  return { corpus, catalog };
}
