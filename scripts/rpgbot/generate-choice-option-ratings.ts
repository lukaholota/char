import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { parseArticleDocument } from "../../src/lib/optimization/document";
import { readSourceManifest } from "../../src/lib/optimization/source-policy";
import {
  buildChoiceOptionRatingList,
  listRatedChoiceGroups,
  RATED_CLASS_SOURCES,
  type RatedClassSource,
} from "../../src/lib/optimization/choice-option-rating-generation";
import type { ChoiceOptionRatingCatalog } from "../../src/lib/optimization/choice-option-rating-lookup";

const { values } = parseArgs({ options: {
  input: { type: "string", default: "data/rpgbot" },
  output: { type: "string", default: "src/lib/generated" },
} });

const OUTPUT_FILE = "rpgbot-choice-option-ratings.json";

async function main() {
  const input = resolve(values.input!);
  const catalog: ChoiceOptionRatingCatalog = { classes: {} };
  const summary: Record<string, { rated: number; unrated: string[] }> = {};

  for (const source of RATED_CLASS_SOURCES) {
    const generated = await buildClassList(input, source);
    failOnUnexpectedUnrated(source, generated.unratedNames);
    catalog.classes[source.className] = generated.list;
    summary[source.className] = { rated: Object.keys(generated.list.options).length, unrated: generated.unratedNames };
  }

  const output = resolve(values.output!);
  await mkdir(output, { recursive: true });
  await writeFile(join(output, OUTPUT_FILE), `${JSON.stringify(catalog, null, 1)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

async function buildClassList(input: string, source: RatedClassSource) {
  const document = parseArticleDocument(JSON.parse(await readFile(join(input, "uk", source.articleFile), "utf8")));
  const classCatalog = JSON.parse(await readFile(resolve(source.catalogFile), "utf8"));
  const sourceUrl = await readSourceUrl(join(input, "manifest.json"), document.article.sourceId);
  return buildChoiceOptionRatingList(document, listRatedChoiceGroups(source, classCatalog), sourceUrl);
}

async function readSourceUrl(manifestPath: string, sourceId: string): Promise<string> {
  const entry = (await readSourceManifest(manifestPath)).find((candidate) => candidate.sourceId === sourceId && candidate.disposition === "included");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { entries: { sourceId: string; canonicalUrl: string }[] };
  const sourceUrl = entry ? manifest.entries.find((candidate) => candidate.sourceId === sourceId)?.canonicalUrl : undefined;
  if (!sourceUrl) throw new Error(`У manifest немає включеного джерела ${sourceId}`);
  return sourceUrl;
}

function failOnUnexpectedUnrated(source: RatedClassSource, unratedNames: string[]) {
  const expected = new Set(source.expectedUnratedNames);
  const unexpected = unratedNames.filter((name) => !expected.has(name));
  if (unexpected.length > 0) throw new Error(`${source.className}: варіанти без оцінки RPGbot: ${unexpected.join("; ")}. Файл НЕ перезаписано.`);
}

await main();
