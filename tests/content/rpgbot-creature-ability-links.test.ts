import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { getAllCreatures } from "@/lib/bestiaryData";
import { findPlainEnglishName } from "@/lib/catalogs/reading-target";
import { toEntitySlug } from "@/lib/slug-utils";
import { normalizeContentName } from "@/lib/optimization/content-hydration";
import { collectCreatureAbilityReferences } from "@/lib/optimization/creature-hydration";
import { collectArticleFeatureHydration } from "@/lib/optimization/feature-hydration";
import { parseArticleDocument } from "@/lib/optimization/document";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";
import { bindingSchema } from "@/lib/optimization/schema";
import type { ContentBlock, ContentReference, InlineNode, OptimizationRuleset } from "@/lib/optimization/types";

const ARTICLE_DIRECTORY = "data/rpgbot/uk";
const articleFiles = readdirSync(ARTICLE_DIRECTORY).filter((name) => name.endsWith(".json")).sort();
const bindings = z.array(bindingSchema).parse(JSON.parse(readFileSync("data/rpgbot/bindings.json", "utf8")));
const articleSubclassKeys = z.record(z.string(), z.string()).parse(JSON.parse(readFileSync("data/rpgbot/article-art.json", "utf8")));
const CREATURE_LINK = /^(\/2024)?\/bestiary\?creature=([^&]+)(&feature=.+)?$/;

const abilityNamesByRuleset = new Map<OptimizationRuleset, Map<string, Set<string>>>();
const creatureSlugsByRuleset = new Map<OptimizationRuleset, Set<string>>();

function findAbilityNamesByCreature(ruleset: OptimizationRuleset) {
  let names = abilityNamesByRuleset.get(ruleset);
  if (names) return names;
  names = new Map();
  for (const ability of collectCreatureAbilityReferences(ruleset)) {
    const slug = CREATURE_LINK.exec(ability.href)![2];
    const owned = names.get(slug) ?? new Set<string>();
    for (const name of collectNames(ability)) owned.add(name);
    names.set(slug, owned);
  }
  abilityNamesByRuleset.set(ruleset, names);
  return names;
}

function findCreatureSlugs(ruleset: OptimizationRuleset) {
  let slugs = creatureSlugsByRuleset.get(ruleset);
  if (!slugs) creatureSlugsByRuleset.set(ruleset, slugs = new Set(getAllCreatures(ruleset).map((creature) => toEntitySlug(creature.nameEng))));
  return slugs;
}

function collectNames(reference: Pick<ContentReference, "name" | "engName">) {
  return [reference.engName, findPlainEnglishName(reference.engName), reference.name]
    .flatMap((name) => [name, name.replace(/\s*\[[^\]]+\]\s*$/, "").replace(/\s*\([^)]*\)\s*$/, "")])
    .map(normalizeContentName).filter(Boolean);
}

function collectLinkNames(href: string, references: ReadonlyMap<string, ContentReference>) {
  const reference = references.get(href);
  const chooserName = /[?&]reference=([^&]+)&section=/.exec(href)?.[1];
  return [...(reference ? collectNames(reference) : []), ...(chooserName ? [normalizeContentName(decodeURIComponent(chooserName))] : [])];
}

function collectNodeLists(block: ContentBlock): InlineNode[][] {
  if (block.type === "rating") return [];
  if (block.type === "list") return block.items;
  if (block.type === "table") return [block.caption ?? [], ...block.headers, ...block.rows.flat()];
  return [block.content];
}

function isChooserOfCreatures(reference: ContentReference | undefined, creatures: readonly string[]) {
  return !!reference?.options?.length && reference.options.every((option) => creatures.includes(CREATURE_LINK.exec(option.href)?.[2] ?? ""));
}

function isReaderOwnLink(href: string) {
  return /^(?:\/2024)?\/(?:spells|rules|weapons|armor|invocations|bestiary)\b/.test(href) || !href.startsWith("/");
}

async function hydratePublishedArticle(file: string) {
  const document = parseArticleDocument(JSON.parse(readFileSync(`${ARTICLE_DIRECTORY}/${file}`, "utf8")));
  const hydrated = await hydrateArticleDocument(document);
  const revisionId = document.article.publishedRevisionId;
  const revision = hydrated.translations.find((entry) => entry.translationRevisionId === revisionId) ?? hydrated.translations.at(-1)!;
  const features = collectArticleFeatureHydration(document.article, document.translations, bindings, articleSubclassKeys[document.article.slug]);
  const ownSectionLinks = new Set(features.targets.filter((target) => target.sectionId).map((target) => `${target.sectionId} ${target.href}`));
  const ownRace = `${document.article.ruleset === "RULES_2024" ? "/2024" : ""}/races?race=${document.article.slug.replace(/-(?:2014|2024)$/, "")}`;
  const isOwnEntity = (sectionId: string, href: string) => ownSectionLinks.has(`${sectionId} ${href}`) || href === ownRace || href.startsWith(`${ownRace}&`);
  return { article: document.article, revision, references: new Map(hydrated.contentReferences.map((reference) => [reference.href, reference])), isOwnEntity };
}

function collectWrongAbilityLinks(article: Awaited<ReturnType<typeof hydratePublishedArticle>>) {
  const abilityNames = findAbilityNamesByCreature(article.article.ruleset);
  const wrong: string[] = [];
  for (const section of article.revision.sections) for (const nodes of section.blocks.flatMap(collectNodeLists)) {
    const links = nodes.filter((node): node is Extract<InlineNode, { type: "link" }> => node.type === "link");
    const creatures = links.flatMap((link) => {
      const match = CREATURE_LINK.exec(link.href);
      return match && !match[3] ? [match[2]] : [];
    });
    if (!creatures.length) continue;
    for (const link of links) {
      if (isReaderOwnLink(link.href) || article.isOwnEntity(section.sectionId, link.href) || isChooserOfCreatures(article.references.get(link.href), creatures)) continue;
      const name = collectLinkNames(link.href, article.references).find((entry) => creatures.some((slug) => abilityNames.get(slug)?.has(entry)));
      if (name) wrong.push(`${article.article.slug}#${section.sectionId} «${link.text}» (${name}) → ${link.href}; creatures: ${[...new Set(creatures)].join(", ")}`);
    }
  }
  return wrong;
}

function collectDeadCreatureLinks(article: Awaited<ReturnType<typeof hydratePublishedArticle>>) {
  const prefix = article.article.ruleset === "RULES_2024" ? "/2024" : "";
  const creatureSlugs = findCreatureSlugs(article.article.ruleset);
  return article.revision.sections.flatMap((section) => section.blocks.flatMap(collectNodeLists).flat()
    .flatMap((node) => {
      const match = node.type === "link" ? CREATURE_LINK.exec(node.href) : null;
      return match && ((match[1] ?? "") !== prefix || !creatureSlugs.has(match[2])) ? [`${article.article.slug}#${section.sectionId} «${node.text}» → ${node.type === "link" ? node.href : ""}`] : [];
    }));
}

describe("RPGbot article links beside a creature", () => {
  it.each(articleFiles)("%s links each creature ability to a creature of the same passage and every creature to the bestiary of its edition", async (file) => {
    const article = await hydratePublishedArticle(file);
    expect(collectWrongAbilityLinks(article)).toEqual([]);
    expect(collectDeadCreatureLinks(article)).toEqual([]);
  }, 60_000);
});

describe("RPGbot links that keep the article's own meaning beside creature names", () => {
  async function collectLinks(file: string, text: string) {
    const { revision } = await hydratePublishedArticle(file);
    return [...new Set(revision.sections.flatMap((section) => section.blocks.flatMap(collectNodeLists).flat()
      .flatMap((node) => node.type === "link" && node.text.replace(/[«».]/g, "") === text ? [node.href] : [])))];
  }

  it("keeps Pack Tactics in the kobold guide on the kobold trait", async () => {
    expect(await collectLinks("rpgbot-kobold-2014.json", "Pack Tactics")).toEqual(["/races?reference=pack-tactics"]);
  }, 60_000);

  it("keeps Charge in the centaur guide on the centaur trait", async () => {
    expect(await collectLinks("rpgbot-centaur-2014.json", "Charge")).toEqual(["/races?race=centaur&feature=charge"]);
  }, 60_000);

  it("links the Eagle heading of the wild shape guide to the creature", async () => {
    expect(await collectLinks("rpgbot-druid-wild-shape-2014.json", "Орел")).toEqual(["/bestiary?creature=eagle"]);
  }, 60_000);

  it.each(["rpgbot-bard-spells-2014.json", "rpgbot-sorcerer-spells-2014.json", "rpgbot-warlock-spells-2014.json", "rpgbot-wizard-spells-2014.json", "rpgbot-warlock-hexblade-2014.json"])(
    "keeps Magic Resistance in %s on the race traits and the pureblood on the race", async (file) => {
      const { references } = await hydratePublishedArticle(file);
      const magicResistance = await collectLinks(file, "Опір магії");
      expect(magicResistance.length).toBeGreaterThan(0);
      for (const href of magicResistance) expect(references.get(href)?.options?.map((option) => option.href).sort()).toEqual(["/races?race=satyr&feature=magic-resistance", "/races?race=yuan-ti&feature=magic-resistance"]);
      const pureblood = [...await collectLinks(file, "юань-ті чистокровного"), ...await collectLinks(file, "Юань-ті Чистокровний")];
      expect(pureblood).toEqual(["/races?race=yuan-ti"]);
    }, 60_000);

  it("keeps Eagle in the totem warrior guide on a chooser of the totem options", async () => {
    const { references } = await hydratePublishedArticle("rpgbot-barbarian-totem-warrior-2014.json");
    const hrefs = await collectLinks("rpgbot-barbarian-totem-warrior-2014.json", "Орел");
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(references.get(href)?.options?.map((option) => option.engName)).toEqual(expect.arrayContaining(["Totem Spirit: Eagle", "Aspect of the Beast: Eagle", "Totemic Attunement: Eagle"]));
  }, 60_000);
});
