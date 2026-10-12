import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { afterEach, expect, it, vi } from "vitest";
import { fixtureCorpus } from "./fixtures.test-helper";
import { generateIndices } from "./indices";
import { loadCorpus } from "../../../scripts/rpgbot/load-corpus";
import { readPublishedArticle } from "./article-reader.server";

vi.mock("server-only", () => ({}));
const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

async function writeFixture() {
  const directory = await mkdtemp(join(tmpdir(), "optimization-contract-")); directories.push(directory);
  await mkdir(join(directory, "uk"));
  const corpus = fixtureCorpus();
  const document = { sources: corpus.sources, sourceRevisions: corpus.sourceRevisions,
    article: corpus.articles[0], translations: corpus.translations, ratings: corpus.ratings };
  for (const [name, value] of Object.entries({ "manifest.json": { entries: [{ sourceId: "fixture-source", disposition: "included", rulesets: ["2014"] }] },
    "bindings.json": corpus.bindings, "entity-keys.json": [corpus.bindings[0].entity], "builds.json": [], "uk/comparison.json": document }))
    await writeFile(join(directory, name), JSON.stringify(value));
  return { directory, corpus, document };
}

it("loads separate files and reads only the published revision of one article", async () => {
  const { directory, corpus } = await writeFixture();
  const loaded = await loadCorpus(directory);
  expect(loaded.corpus).toEqual(corpus);
  const summary = generateIndices(loaded.corpus, loaded.catalog).articles[0];
  await writeFile(join(directory, "uk/unrelated.json"), "invalid unrelated JSON");
  const result = await readPublishedArticle(summary, join(directory, "uk"));
  expect(result.revision.translationRevisionId).toBe("translation-r1");
  expect(result.ratings).toHaveLength(3);
  await expect(readPublishedArticle({ ...summary, translationRevisionId: "missing" }, join(directory, "uk"))).rejects.toThrow("mismatch");
  await expect(readPublishedArticle({ ...summary, articleId: "../escape" }, join(directory, "uk"))).rejects.toThrow();
});
it("rejects sources absent from the included manifest and document edition conflicts", async () => {
  const { directory, document } = await writeFixture();
  document.sources[0].rulesets = ["RULES_2024"];
  document.article.ruleset = "RULES_2024";
  document.ratings = [];
  document.translations[0].sections = [document.translations[0].sections[0]];
  await writeFile(join(directory, "uk/comparison.json"), JSON.stringify(document));
  await expect(loadCorpus(directory)).rejects.toThrow("conflicts");
  await writeFile(join(directory, "manifest.json"), JSON.stringify({ entries: [] }));
  await expect(loadCorpus(directory)).rejects.toThrow("conflicts");
});

it("keeps excluded source documents on disk while omitting them from the publishable corpus", async () => {
  const { directory, document } = await writeFixture();
  await writeFile(join(directory, "manifest.json"), JSON.stringify({ entries: [{ sourceId: "fixture-source", disposition: "excluded", rulesets: ["2014"] }] }));
  await writeFile(join(directory, "bindings.json"), "[]");
  const loaded = await loadCorpus(directory);
  expect(loaded.corpus.articles).toEqual([]);
  expect(loaded.corpus.translations).toEqual([]);
  expect(JSON.parse(await readFile(join(directory, "uk", `${document.article.articleId}.json`), "utf8"))).toEqual(document);
});
it("rejects a document relying on another article's translation", async () => {
  const { directory, document } = await writeFixture();
  document.translations[0].articleId = "other-article";
  await writeFile(join(directory, "uk/comparison.json"), JSON.stringify(document));
  await expect(loadCorpus(directory)).rejects.toThrow("invalid-revision-ref");
});
it("loads a feature option and rejects a dangling option in a document", async () => {
  const { directory, corpus } = await writeFixture();
  const binding = { ...corpus.bindings[0], entity: { ruleset: "RULES_2014", kind: "feature", parentKey: "CHAMPION", entityKey: "fixture-3" },
    optionId: "comparison-section-list-item-0", ratingIds: [] };
  await writeFile(join(directory, "bindings.json"), JSON.stringify([binding]));
  await writeFile(join(directory, "entity-keys.json"), JSON.stringify([binding.entity]));
  expect((await loadCorpus(directory)).corpus.bindings[0].optionId).toBe(binding.optionId);
  await writeFile(join(directory, "bindings.json"), JSON.stringify([{ ...binding, optionId: "comparison-section-list-item-1" }]));
  await expect(loadCorpus(directory)).rejects.toThrow("invalid-binding-option");
});
it("previews without writes, applies deterministic indices and produces an empty second diff", async () => {
  const { directory } = await writeFixture(); const output = join(directory, "generated");
  const args = ["scripts/rpgbot/generate-indices.ts", "--input", directory, "--output", output];
  const run = (extra: string[] = []) => JSON.parse(execFileSync("bun", [...args, ...extra], { encoding: "utf8" }));
  expect(run().changes.every((entry: { changed: boolean }) => entry.changed)).toBe(true);
  await expect(readFile(join(output, "optimization-articles.json"))).rejects.toMatchObject({ code: "ENOENT" });
  expect(run(["--apply"]).mode).toBe("apply");
  const first = await readFile(join(output, "optimization-articles.json"), "utf8");
  expect(run().changes.every((entry: { changed: boolean }) => !entry.changed)).toBe(true);
  run(["--apply"]);
  expect(await readFile(join(output, "optimization-articles.json"), "utf8")).toBe(first);
});
