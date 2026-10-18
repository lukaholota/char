import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { toEntitySlug } from "../../src/lib/slug-utils";
import { parseArticleDocument } from "../../src/lib/optimization/document";
import { buildSpellRatingFiles, findSpellRatingListKey } from "../../src/lib/optimization/spell-rating-generation";
import { readSourceManifest } from "../../src/lib/optimization/source-policy";
import type { SpellRatingComment } from "../../src/lib/optimization/spell-rating-comment-markdown";
import type { SpellRatingCatalog } from "../../src/lib/optimization/spell-rating-lookup";
import type { ArticleDocument } from "../../src/lib/optimization/types";

const { values } = parseArgs({ options: {
  input: { type: "string", default: "data/rpgbot" },
  spells: { type: "string", default: "data/2014/spells.json" },
  creatures: { type: "string", default: "src/lib/generated/creatures.json" },
  output: { type: "string", default: "src/lib/generated" },
} });

const MINIMUM_LISTS = 11;
const MINIMUM_RATED_SPELLS = 1400;

async function main() {
  const input = resolve(values.input!);
  const documents = await readSpellListDocuments(join(input, "uk"));
  const spells = JSON.parse(await readFile(resolve(values.spells!), "utf8")) as { engName: string; level: number }[];
  const creatureSlugs = await readCreatureSlugs2014(resolve(values.creatures!));
  const sourceUrls = await readSourceUrls(join(input, "manifest.json"));

  const generated = await buildSpellRatingFiles(documents, spells, creatureSlugs, sourceUrls);
  failOnUnresolvedNames(generated.unresolved);
  failOnShrunkOutput(generated.catalog);

  const output = resolve(values.output!);
  await mkdir(output, { recursive: true });
  await writeFile(join(output, "rpgbot-spell-ratings.json"), `${JSON.stringify(generated.catalog, null, 1)}\n`);
  await writeCommentFiles(join(output, "rpgbot-spell-comments"), generated.comments);
  console.log(JSON.stringify(summarize(generated.catalog), null, 2));
}

async function writeCommentFiles(directory: string, comments: Record<string, Record<string, SpellRatingComment>>) {
  await mkdir(directory, { recursive: true });
  for (const [listKey, commentBySlug] of Object.entries(comments)) {
    await writeFile(join(directory, `${listKey}.json`), `${JSON.stringify(commentBySlug)}\n`);
  }
}

async function readSpellListDocuments(directory: string): Promise<Map<string, ArticleDocument>> {
  const documents = new Map<string, ArticleDocument>();
  for (const fileName of (await readdir(directory)).sort()) {
    const listKey = findSpellRatingListKey(fileName);
    if (listKey) documents.set(listKey, parseArticleDocument(JSON.parse(await readFile(join(directory, fileName), "utf8"))));
  }
  return documents;
}

async function readCreatureSlugs2014(path: string): Promise<Set<string>> {
  const creatures = JSON.parse(await readFile(path, "utf8")) as { nameEng: string; ruleset: string }[];
  return new Set(creatures.filter((creature) => creature.ruleset === "RULES_2014").map((creature) => toEntitySlug(creature.nameEng)));
}

async function readSourceUrls(manifestPath: string): Promise<Map<string, string>> {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { entries: { sourceId: string; canonicalUrl: string }[] };
  const included = new Set((await readSourceManifest(manifestPath)).filter((entry) => entry.disposition === "included").map((entry) => entry.sourceId));
  return new Map(manifest.entries.filter((entry) => included.has(entry.sourceId)).map((entry) => [entry.sourceId, entry.canonicalUrl]));
}

function failOnUnresolvedNames(unresolved: { listKey: string; names: string[] }[]) {
  if (unresolved.length === 0) return;
  throw new Error(`Оцінки без заклинання в каталозі 2014:\n${unresolved.map(({ listKey, names }) => `${listKey}: ${names.join("; ")}`).join("\n")}`);
}

function failOnShrunkOutput(catalog: SpellRatingCatalog) {
  const { lists, ratedSpells } = summarize(catalog);
  if (lists < MINIMUM_LISTS || ratedSpells < MINIMUM_RATED_SPELLS) {
    throw new Error(`Каталог оцінок схлопнувся: ${lists} списків і ${ratedSpells} оцінок, очікували щонайменше ${MINIMUM_LISTS} і ${MINIMUM_RATED_SPELLS}. Файли НЕ перезаписано.`);
  }
}

function summarize(catalog: SpellRatingCatalog) {
  const lists = Object.values(catalog.lists);
  return { lists: lists.length, ratedSpells: lists.reduce((sum, list) => sum + Object.keys(list.scores).length, 0) };
}

await main();
