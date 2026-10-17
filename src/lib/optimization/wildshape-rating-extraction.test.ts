import { describe, expect, it } from "vitest";
import { parseArticleDocument } from "./document";
import { extractWildshapeRatings } from "./wildshape-rating-extraction";
import type { InlineNode } from "./types";

const CREATURES = [
  { nameEng: "Wolf", type: "Звір" },
  { nameEng: "Axe Beak", type: "Звір" },
  { nameEng: "Ox", type: "Звір (Худоба)" },
  { nameEng: "Ankylosaurus", type: "Звір (Динозавр)" },
  { nameEng: "Cranium Rat", type: "Аберація" },
];

const text = (value: string): InlineNode => ({ type: "text", text: value });
const source = (): InlineNode => ({ type: "link", text: "MM", href: "https://rpgbot.net/dnd5/abbreviations/" });

type RatingFixture = { sectionId: string; item?: number; context: string; score: 1 | 2 | 3 | 4 };

function buildDocument(items: Record<string, InlineNode[][]>, ratings: RatingFixture[]) {
  const colorByScore = { 1: "red", 2: "orange", 3: "green", 4: "blue" } as const;
  return parseArticleDocument({
    sources: [{ sourceId: "fixture-source", rulesets: ["RULES_2014"] }],
    sourceRevisions: [{ revisionId: "source-r1", sourceId: "fixture-source", fetchedAt: "2026-10-17T00:00:00Z", contentHash: "a".repeat(64),
      title: "Fixture", authors: ["Author"], sourceFile: "source/fixture.txt", evidence: "Original fixture" }],
    article: { articleId: "fixture-wild-shape", sourceId: "fixture-source", slug: "fixture-wild-shape", ruleset: "RULES_2014",
      titleUk: "Приклад", titleEn: "Example", topics: [], status: "unpublished" },
    translations: [{ translationRevisionId: "translation-r1", articleId: "fixture-wild-shape", sourceRevisionId: "source-r1", status: "draft",
      sections: Object.entries(items).map(([sectionId, listItems]) => ({
        sectionId, heading: sectionId, blocks: [
          { blockId: `intro-${sectionId}`, type: "paragraph", content: [text("Вступ розділу.")] },
          { blockId: `list-${sectionId}`, type: "list", ordered: false, items: listItems },
        ],
      })) }],
    ratings: ratings.map((rating, index) => ({
      ratingId: `r${index}`, articleId: "fixture-wild-shape", translationRevisionId: "translation-r1", sectionId: rating.sectionId,
      targetBlockId: rating.item === undefined ? `intro-${rating.sectionId}` : `list-${rating.sectionId}`,
      optionId: rating.item === undefined ? `${rating.sectionId}-intro` : `${rating.sectionId}-list-item-${rating.item}`,
      context: rating.context, score: rating.score, sourceColor: colorByScore[rating.score], explanationBlockId: `list-${rating.sectionId}`,
    })),
  });
}

describe("extractWildshapeRatings", () => {
  it("reads both name markers, keeps glossary nodes in the comment and maps Cow to Ox", () => {
    const document = buildDocument(
      { "section-7": [
        [text("Вовк{{Wolf}}"), source(), text(": «Тактика зграї»{{Pack Tactics}}.")],
        [text("{{Сокироклюв|Axe Beak}}"), source(), text(": швидкий.")],
        [text("Корова{{Cow}}"), source(), text(": повільна.")],
      ] },
      [
        { sectionId: "section-7", item: 0, context: "Вовк", score: 3 },
        { sectionId: "section-7", item: 1, context: "Сокироклюв", score: 2 },
        { sectionId: "section-7", item: 2, context: "Корова", score: 1 },
      ],
    );

    expect(extractWildshapeRatings(document, CREATURES)).toEqual({
      forms: {
        "axe-beak": { score: 2, sectionId: "section-7", nodes: [text("швидкий.")] },
        ox: { score: 1, sectionId: "section-7", nodes: [text("повільна.")] },
        wolf: { score: 3, sectionId: "section-7", nodes: [text("«Тактика зграї»{{Pack Tactics}}.")] },
      },
      skippedNames: [],
      unresolvedNames: [],
    });
  });

  it("finds the list item by context when the rating points at the intro paragraph", () => {
    const document = buildDocument(
      { "section-cr_3": [[text("Анкілозавр{{Ankylosaurus}} "), source(), text(": чудовий танк.")]] },
      [{ sectionId: "section-cr_3", context: "Анкілозавр", score: 4 }],
    );

    expect(extractWildshapeRatings(document, CREATURES).forms).toEqual({
      ankylosaurus: { score: 4, sectionId: "section-cr_3", nodes: [text("чудовий танк.")] },
    });
  });

  it("skips non-beasts and elemental forms, and reports names missing from the bestiary", () => {
    const document = buildDocument(
      {
        "section-cr_0": [
          [text("Черепний щур{{Cranium Rat}}"), source(), text(": телепатія.")],
          [text("Стегозавр{{Stegosaurus}}"), source(), text(": хвіст.")],
        ],
        "section-elemental-forms": [[text("Повітря: швидкий політ.")]],
      },
      [
        { sectionId: "section-cr_0", item: 0, context: "Черепний щур", score: 2 },
        { sectionId: "section-cr_0", item: 1, context: "Стегозавр", score: 4 },
        { sectionId: "section-elemental-forms", item: 0, context: "Повітря", score: 4 },
      ],
    );

    expect(extractWildshapeRatings(document, CREATURES)).toEqual({
      forms: {},
      skippedNames: ["Черепний щур", "Повітря"],
      unresolvedNames: ["Stegosaurus"],
    });
  });

  it("refuses two ratings for one form", () => {
    const document = buildDocument(
      { "section-7": [[text("Вовк{{Wolf}}"), source(), text(": раз.")], [text("Вовк{{Wolf}}"), source(), text(": два.")]] },
      [
        { sectionId: "section-7", item: 0, context: "Вовк", score: 3 },
        { sectionId: "section-7", item: 1, context: "Вовк", score: 1 },
      ],
    );

    expect(() => extractWildshapeRatings(document, CREATURES)).toThrow(/wolf/);
  });
});
