import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { parseArticleDocument } from "../../src/lib/optimization/document";
import { listDraftSummaries } from "../../src/lib/optimization/draft-reader";
import { loadReadyPresetSearchEntries } from "../../src/lib/optimization/ready-preset-search-index";
import { buildRpgbotSearchArticles } from "../../src/lib/optimization/search-index-builder";

const { values } = parseArgs({ options: { apply: { type: "boolean", default: false } } });
const summaries = (await listDraftSummaries()).filter((article) => article.ruleset === "RULES_2014");
const documents = await Promise.all(summaries.map(async (article) => parseArticleDocument(JSON.parse(
  await readFile(join(process.cwd(), "data/rpgbot/uk", `${article.articleId}.json`), "utf8"),
))));
const articles = buildRpgbotSearchArticles(documents);
const names = articles.map((article) => ({ ...article, sections: article.sections.map(({ sectionId, title }) => ({ sectionId, title })) }));
const presets = await loadReadyPresetSearchEntries();
const artifacts = [{ name: "optimization-omni-search-2014", entries: names }, { name: "optimization-section-search-2014", entries: articles },
  { name: "optimization-preset-search-2014", entries: presets }];
const changes: { outputPath: string; bytes: number }[] = [];
for (const artifact of artifacts) {
  const outputPath = join(process.cwd(), "src/lib/generated", `${artifact.name}.json`);
  const next = `${JSON.stringify(artifact.entries)}\n`;
  if (values.apply) await writeFile(outputPath, next);
  changes.push({ outputPath, bytes: Buffer.byteLength(next) });
}
console.log(JSON.stringify({ mode: values.apply ? "apply" : "preview", articles: articles.length, presets: presets.length,
  sections: articles.reduce((count, article) => count + article.sections.length, 0), changes }, null, 2));
