import { describe, expect, it } from "vitest";
import { parseArticleDocument } from "./document";
import { extractSpellRatings } from "./spell-rating-extraction";
import type { InlineNode } from "./types";

const SPELLS = [
  { engName: "Ice Knife", level: 1 },
  { engName: "Fireball", level: 3 },
  { engName: "Spirit of Death", level: 4 },
  { engName: "Power Word Stun", level: 8 },
  { engName: "Destructive Wave", level: 5 },
  { engName: "Acid Splash", level: 0 },
];

const text = (value: string): InlineNode => ({ type: "text", text: value });
const link = (value: string): InlineNode => ({ type: "link", text: value, href: "https://example.org/" });
const superscript = (value: string): InlineNode => ({ type: "superscript", text: value });

type RatingFixture = { ratingId: string; sectionId: string; blockId: string; item: number; context: string; score: 1 | 2 | 3 | 4 };

function buildDocument(items: Record<string, InlineNode[][]>, ratings: RatingFixture[]) {
  const colorByScore = { 1: "red", 2: "orange", 3: "green", 4: "blue" } as const;
  return parseArticleDocument({
    sources: [{ sourceId: "fixture-source", rulesets: ["RULES_2014"] }],
    sourceRevisions: [{ revisionId: "source-r1", sourceId: "fixture-source", fetchedAt: "2026-10-05T00:00:00Z", contentHash: "a".repeat(64),
      title: "Fixture", authors: ["Author"], sourceFile: "source/fixture.txt", evidence: "Original fixture" }],
    article: { articleId: "fixture-wizard-spells", sourceId: "fixture-source", slug: "fixture-wizard-spells", ruleset: "RULES_2014",
      titleUk: "Приклад", titleEn: "Example", topics: [], status: "unpublished" },
    translations: [{ translationRevisionId: "translation-r1", articleId: "fixture-wizard-spells", sourceRevisionId: "source-r1", status: "draft",
      sections: Object.entries(items).map(([sectionId, listItems]) => ({
        sectionId, heading: sectionId, blocks: [{ blockId: `block-${sectionId}`, type: "list", ordered: false, items: listItems }],
      })) }],
    ratings: ratings.map((rating) => ({
      ratingId: rating.ratingId, articleId: "fixture-wizard-spells", translationRevisionId: "translation-r1", sectionId: rating.sectionId,
      targetBlockId: `block-${rating.sectionId}`, optionId: `${rating.sectionId}-block-${rating.sectionId}-item-${rating.item}`,
      context: rating.context, score: rating.score, sourceColor: colorByScore[rating.score], explanationBlockId: `block-${rating.sectionId}`,
    })),
  });
}

describe("extractSpellRatings", () => {
  it("reads score and comment of an entry with a parenthesized source", () => {
    const document = buildDocument(
      { "section-spells-1": [[text("Крижаний кинджал [Ice Knife] "), superscript("("), link("XGtE"), superscript(")"), text(": найближче до Вогнекуля [Fireball].")]] },
      [{ ratingId: "r1", sectionId: "section-spells-1", blockId: "b", item: 0, context: "Крижаний кинджал [Ice Knife]", score: 2 }],
    );

    expect(extractSpellRatings(document, SPELLS)).toEqual({
      scores: { "ice-knife": 2 },
      comments: { "ice-knife": { nodes: [text("найближче до Вогнекуля [Fireball].")], sectionId: "section-spells-1" } },
      alternatives: {},
      unresolvedNames: [],
    });
  });

  it("reads an entry whose source link follows the name without parentheses", () => {
    const document = buildDocument(
      { "section-cantrips": [[text("Кислотні бризки [Acid splash]"), link("PHB"), text(": можливість уразити двох ворогів: спокушає.")]] },
      [{ ratingId: "r1", sectionId: "section-cantrips", blockId: "b", item: 0, context: "Кислотні бризки [Acid splash]", score: 3 }],
    );

    expect(extractSpellRatings(document, SPELLS).comments).toEqual({ "acid-splash": { nodes: [text("можливість уразити двох ворогів: спокушає.")], sectionId: "section-cantrips" } });
  });

  it("finds the English name in the entry when the rating context has only the Ukrainian one", () => {
    const document = buildDocument(
      { "section-spells-8": [[text("Слово сили: Приголомшення [Power Word Stun] "), superscript("("), link("PHB"), superscript(")"), text(": ризикувати важко.")]] },
      [{ ratingId: "r1", sectionId: "section-spells-8", blockId: "b", item: 0, context: "Слово сили", score: 1 }],
    );

    expect(extractSpellRatings(document, SPELLS)).toMatchObject({ scores: { "power-word-stun": 1 }, comments: { "power-word-stun": { nodes: [text("ризикувати важко.")], sectionId: "section-spells-8" } } });
  });

  it("uses the first known spell when the entry head names an unknown one first", () => {
    const document = buildDocument(
      { "section-spells-5": [[text("Руйнівна кара{{Destructive Smite}} / Руйнівна хвиля [Destructive Wave] (PHB): це непогано.")]] },
      [{ ratingId: "r1", sectionId: "section-spells-5", blockId: "b", item: 0, context: "Руйнівна кара", score: 3 }],
    );

    expect(extractSpellRatings(document, SPELLS)).toMatchObject({ scores: { "destructive-wave": 3 }, comments: { "destructive-wave": { nodes: [text("це непогано.")], sectionId: "section-spells-5" } } });
  });

  it("keeps the rating from the section that matches the spell level when a spell is rated twice", () => {
    const entry = [text("Дух смерті [Spirit of Death] (PHB): коментар.")];
    const document = buildDocument(
      { "section-spells-3": [entry], "section-spells-4": [entry] },
      [
        { ratingId: "r1", sectionId: "section-spells-3", blockId: "b", item: 0, context: "Дух смерті [Spirit of Death]", score: 1 },
        { ratingId: "r2", sectionId: "section-spells-4", blockId: "b", item: 0, context: "Дух смерті [Spirit of Death]", score: 3 },
      ],
    );

    expect(extractSpellRatings(document, SPELLS).scores).toEqual({ "spirit-of-death": 3 });
  });

  it("skips an option that RPGbot lists next to spells but that is not a spell", () => {
    const document = buildDocument(
      { "section-spells-5": [[text("Вигнання{{Dismissal}} (PHB): гірша версія Вигнання [Banishment].")]] },
      [{ ratingId: "r1", sectionId: "section-spells-5", blockId: "b", item: 0, context: "Вигнання", score: 1 }],
    );

    expect(extractSpellRatings(document, SPELLS)).toEqual({ scores: {}, comments: {}, alternatives: {}, unresolvedNames: [] });
  });

  it("reports a rating that matches no spell instead of dropping it silently", () => {
    const document = buildDocument(
      { "section-spells-1": [[text("Вигадка [Not A Spell] (PHB): текст.")]] },
      [{ ratingId: "r1", sectionId: "section-spells-1", blockId: "b", item: 0, context: "Вигадка [Not A Spell]", score: 2 }],
    );

    expect(extractSpellRatings(document, SPELLS)).toEqual({ scores: {}, comments: {}, alternatives: {}, unresolvedNames: ["Вигадка [Not A Spell]"] });
  });

  it("keeps glossary markers and following inline nodes in the comment", () => {
    const document = buildDocument(
      { "section-spells-1": [[text("Крижаний кинджал [Ice Knife] (PHB): шкода променевої{{radiant}} дії.")]] },
      [{ ratingId: "r1", sectionId: "section-spells-1", blockId: "b", item: 0, context: "Крижаний кинджал [Ice Knife]", score: 2 }],
    );

    expect(extractSpellRatings(document, SPELLS).comments["ice-knife"]?.nodes).toEqual([text("шкода променевої{{radiant}} дії.")]);
  });
});
