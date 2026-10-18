import { getAllCreatures } from "@/lib/bestiaryData";
import { toEntitySlug } from "@/lib/slug-utils";
import { hydrateArticleDocument } from "./hydration-catalog";
import { flattenLinksLeavingPicker } from "./picker-links";
import { buildCommentMarkdown } from "./spell-rating-comment-markdown";
import { extractChoiceOptionRatings, type ChoiceOptionRatingSource, type RatedChoiceGroup } from "./choice-option-rating-extraction";
import type { ChoiceOptionRatingList } from "./choice-option-rating-lookup";
import type { ArticleDocument, ContentBlock } from "./types";

export type RatedClassSource = {
  className: string;
  articleFile: string;
  catalogFile: string;
  groups: readonly { groupNameEng: string; sectionId: string }[];
  expectedUnratedNames: readonly string[];
};

export type GeneratedChoiceOptionRatings = { list: ChoiceOptionRatingList; unratedNames: string[] };

type ClassCatalog = { choiceGroups: { groupNameEng: string; options: { engName: string }[] }[] };

/// Гайд — версії 2020 і не оцінює «Криваве прокляття оголення» з версії 2022.
/// Мутагени Ордену мутантів у гайді оцінені, але їх обирають на кроці підкласу, де значків ще немає.
export const RATED_CLASS_SOURCES: readonly RatedClassSource[] = [
  {
    className: "BLOOD_HUNTER_2014",
    articleFile: "rpgbot-blood-hunter-2014.json",
    catalogFile: "data/blood-hunter/blood-hunter.json",
    groups: [
      { groupNameEng: "Blood Curses", sectionId: "section-blood-curses" },
      { groupNameEng: "Crimson Rites", sectionId: "section-class-features" },
    ],
    expectedUnratedNames: ["Blood Curse of Exposure"],
  },
];

export function listRatedChoiceGroups(source: RatedClassSource, catalog: ClassCatalog): RatedChoiceGroup[] {
  return source.groups.map(({ groupNameEng, sectionId }) => {
    const group = catalog.choiceGroups.find((entry) => entry.groupNameEng === groupNameEng);
    if (!group) throw new Error(`У каталозі ${source.className} немає групи ${groupNameEng}`);
    return { sectionId, optionNames: group.options.map((option) => option.engName) };
  });
}

export async function buildChoiceOptionRatingList(document: ArticleDocument, groups: readonly RatedChoiceGroup[], sourceUrl: string): Promise<GeneratedChoiceOptionRatings> {
  const extracted = extractChoiceOptionRatings(document, groups);
  const comments = await hydrateComments(document, extracted.options);
  const list: ChoiceOptionRatingList = {
    titleUk: document.article.titleUk,
    articleSlug: document.article.slug,
    sourceUrl,
    options: Object.fromEntries(
      Object.entries(extracted.options).map(([name, option]) => [name, { score: option.score, sectionId: option.sectionId, comment: comments.get(name) ?? "" }]),
    ),
  };
  return { list, unratedNames: extracted.unratedNames };
}

async function hydrateComments(document: ArticleDocument, options: Record<string, ChoiceOptionRatingSource>): Promise<Map<string, string>> {
  const nameBySlug = new Map(Object.keys(options).map((name) => [toEntitySlug(name), name]));
  const sectionIds = [...new Set(Object.values(options).map((option) => option.sectionId))];
  const sections = sectionIds.map((sectionId) => ({
    sectionId,
    heading: sectionId,
    blocks: [...nameBySlug]
      .filter(([, name]) => options[name].sectionId === sectionId)
      .map(([slug, name]): ContentBlock => ({ blockId: slug, type: "paragraph", content: options[name].nodes })),
  }));
  const hydrated = await hydrateArticleDocument({ article: document.article, translations: [{ ...document.translations.at(-1)!, sections }] });
  const creatureSlugs = new Set(getAllCreatures("RULES_2014").map((creature) => toEntitySlug(creature.nameEng)));
  return new Map(
    hydrated.translations[0].sections.flatMap((section) =>
      section.blocks.flatMap((block) => (block.type === "paragraph" ? [[nameBySlug.get(block.blockId)!, buildCommentMarkdown(flattenLinksLeavingPicker(block.content, creatureSlugs))] as const] : [])),
    ),
  );
}
