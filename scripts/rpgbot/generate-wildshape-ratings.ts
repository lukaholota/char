import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { parseArticleDocument } from "../../src/lib/optimization/document";
import { readSourceManifest } from "../../src/lib/optimization/source-policy";
import { buildWildshapeRatingCatalog, type GeneratedWildshapeRatings } from "../../src/lib/optimization/wildshape-rating-generation";
import type { KnownCreature } from "../../src/lib/optimization/wildshape-rating-extraction";

const { values } = parseArgs({ options: {
  input: { type: "string", default: "data/rpgbot" },
  creatures: { type: "string", default: "src/lib/generated/creatures.json" },
  output: { type: "string", default: "src/lib/generated" },
} });

const ARTICLE_FILE = "rpgbot-druid-wild-shape-2014.json";
const OUTPUT_FILE = "rpgbot-wildshape-ratings.json";
const MINIMUM_FORMS = 95;
/// Яких звірів гайду немає в бестіарії 2014 проєкту — не помилка зіставлення.
const KNOWN_MISSING_FORMS = new Set(["Stegosaurus", "Brontosaurus"]);
/// Форми елементалів (Elemental Wild Shape не підтримано) і Черепний щур — у MPMM він аберація.
const EXPECTED_SKIPS = new Set(["Повітря", "Земля", "Вогонь", "Вода", "Черепний щур"]);

async function main() {
  const input = resolve(values.input!);
  const document = parseArticleDocument(JSON.parse(await readFile(join(input, "uk", ARTICLE_FILE), "utf8")));
  const creatures = await readCreatures2014(resolve(values.creatures!));
  const sourceUrl = await readSourceUrl(join(input, "manifest.json"), document.article.sourceId);

  const generated = await buildWildshapeRatingCatalog(document, creatures, sourceUrl);
  failOnUnresolvedNames(generated.unresolvedNames);
  failOnUnexpectedSkips(generated.skippedNames);
  failOnShrunkOutput(generated);

  const output = resolve(values.output!);
  await mkdir(output, { recursive: true });
  await writeFile(join(output, OUTPUT_FILE), `${JSON.stringify(generated.catalog, null, 1)}\n`);
  console.log(JSON.stringify({ forms: Object.keys(generated.catalog.forms).length, skipped: generated.skippedNames, missing: generated.unresolvedNames }, null, 2));
}

async function readCreatures2014(path: string): Promise<KnownCreature[]> {
  const creatures = JSON.parse(await readFile(path, "utf8")) as (KnownCreature & { ruleset: string })[];
  return creatures.filter((creature) => creature.ruleset === "RULES_2014");
}

async function readSourceUrl(manifestPath: string, sourceId: string): Promise<string> {
  const entry = (await readSourceManifest(manifestPath)).find((candidate) => candidate.sourceId === sourceId && candidate.disposition === "included");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { entries: { sourceId: string; canonicalUrl: string }[] };
  const sourceUrl = entry ? manifest.entries.find((candidate) => candidate.sourceId === sourceId)?.canonicalUrl : undefined;
  if (!sourceUrl) throw new Error(`У manifest немає включеного джерела ${sourceId}`);
  return sourceUrl;
}

function failOnUnresolvedNames(names: string[]) {
  const unexpected = names.filter((name) => !KNOWN_MISSING_FORMS.has(name));
  if (unexpected.length > 0) throw new Error(`Оцінки без істоти в бестіарії 2014: ${unexpected.join("; ")}`);
}

function failOnUnexpectedSkips(names: string[]) {
  const unexpected = names.filter((name) => !EXPECTED_SKIPS.has(name));
  if (unexpected.length > 0) throw new Error(`Оцінки форм, які не є звірами: ${unexpected.join("; ")}`);
}

function failOnShrunkOutput(generated: GeneratedWildshapeRatings) {
  const forms = Object.keys(generated.catalog.forms).length;
  if (forms < MINIMUM_FORMS) throw new Error(`Каталог оцінок форм схлопнувся: ${forms}, очікували щонайменше ${MINIMUM_FORMS}. Файл НЕ перезаписано.`);
}

await main();
