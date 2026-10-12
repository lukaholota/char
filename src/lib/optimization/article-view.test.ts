import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildArticleOutline, buildDraftArticleHref, buildLinkTargets, buildListTree, buildOutlineTree, buildRatingIndex,
  buildSectionTocEntries, describeRating, findCellRating, findHeaderRating, findDraftArticlesPath, findHeadingLevel, findHeadingRating, findRating, findRatingItemIndex,
  findSectionSubtree, groupDraftSummaries, groupListNodesByKind, isHeadingRating, readRatingCell, readRatingItemIndex, resolveArticleLink, type DraftSummary, type ListNode,
} from "./article-view";
import { parseArticleDocument } from "./document";
import type { ArticleDocument, ContentBlock } from "./types";

const text = (value: string) => [{ type: "text" as const, text: value }];
const paragraph = (blockId: string): ContentBlock => ({ blockId, type: "paragraph", content: text(blockId) });
const section = (sectionId: string, blocks: ContentBlock[], parentSectionId?: string, sourceAnchor?: string) =>
  ({ sectionId, heading: sectionId, blocks, parentSectionId, sourceAnchor });

describe("buildArticleOutline", () => {
  it("рахує глибину за батьківськими розділами й лишає порожній розділ, якщо в нього є діти", () => {
    const outline = buildArticleOutline([
      section("a", []), section("a1", [paragraph("b1")], "a"), section("a1x", [paragraph("b2")], "a1"), section("b", [paragraph("b3")]),
    ]);
    expect(outline.map((entry) => [entry.sectionId, entry.depth])).toEqual([["a", 0], ["a1", 1], ["a1x", 2], ["b", 0]]);
  });

  it("пропускає порожній розділ без дітей: це зміст, який замінює згенерований", () => {
    const outline = buildArticleOutline([section("toc", []), section("body", [paragraph("b1")])]);
    expect(outline.map((entry) => entry.sectionId)).toEqual(["body"]);
  });

  it("обмежує рівень заголовка шостим", () => {
    expect([0, 1, 4, 9].map(findHeadingLevel)).toEqual([2, 3, 6, 6]);
  });
});

describe("дерево розділів і зміст", () => {
  const outline = () => buildArticleOutline([
    section("a", [paragraph("b0")]), section("a1", [paragraph("b1")], "a"), section("a1x", [paragraph("b2")], "a1"),
    section("a2", [paragraph("b3")], "a"), section("b", [paragraph("b4")]),
  ]);

  it("збирає дерево за батьківськими розділами, а не за сусідством у списку", () => {
    const tree = buildOutlineTree(outline());
    expect(tree.map((node) => node.sectionId)).toEqual(["a", "b"]);
    expect(tree[0].children.map((node) => node.sectionId)).toEqual(["a1", "a2"]);
    expect(tree[0].children[0].children.map((node) => node.sectionId)).toEqual(["a1x"]);
  });

  it("дає записи змісту: розділи верхнього рівня з усіма нащадками як підпунктами", () => {
    expect(buildSectionTocEntries(buildOutlineTree(outline()))).toEqual([
      { id: "a", title: "a", href: "#a", samePage: true, subsections: [
        { id: "a1", title: "a1", href: "#a1", samePage: true },
        { id: "a1x", title: "a1x", href: "#a1x", samePage: true },
        { id: "a2", title: "a2", href: "#a2", samePage: true },
      ] },
      { id: "b", title: "b", href: "#b", samePage: true, subsections: [] },
    ]);
  });
});

describe("findSectionSubtree", () => {
  const sections = () => [
    section("intro", [paragraph("b0")]), section("subclasses", [], undefined), section("mercy", [paragraph("b1")], "subclasses"),
    section("mercy-build", [paragraph("b2")], "mercy"), section("shadow", [paragraph("b3")], "subclasses"), section("third-party", [paragraph("b4")]),
  ];

  it("лишає розділ підкласу разом з його підрозділами й нічого більше", () => {
    expect(findSectionSubtree(sections(), "mercy").map((entry) => entry.sectionId)).toEqual(["mercy", "mercy-build"]);
  });

  it("не тягне сусідів і батьківський розділ", () => {
    expect(findSectionSubtree(sections(), "shadow").map((entry) => entry.sectionId)).toEqual(["shadow"]);
  });

  it("повертає статтю цілою, якщо розділу з таким id немає", () => {
    expect(findSectionSubtree(sections(), "missing")).toHaveLength(6);
  });
});

describe("адреси й групи", () => {
  const summary = (slug: string, titleUk: string, topics: string[]): DraftSummary => ({
    articleId: `rpgbot-${slug}`, slug, ruleset: "RULES_2014", titleUk, titleEn: titleUk, topics, revisionStatus: "draft", sectionCount: 1, ratingCount: 0,
  });

  it("веде в довідник тієї редакції, до якої належить стаття", () => {
    expect(findDraftArticlesPath("RULES_2014")).toBe("/rules/optimization");
    expect(buildDraftArticleHref("RULES_2024", "monk-2024", "section-x")).toBe("/2024/rules/optimization/monk-2024#section-x");
  });

  it("групує за першою темою з великої літери й сортує українською", () => {
    const groups = groupDraftSummaries([
      summary("fighter", "Воїн", ["Воїн"]), summary("shadow", "Шлях тіні", ["Монах"]), summary("monk", "Монах — гайд", ["Монах"]),
      summary("feat", "Риса", ["риса"]), summary("none", "Без теми", []),
    ]);
    expect(groups.map((group) => group.title)).toEqual(["Воїн", "Монах", "Риса", "Інше"]);
    expect(groups[1].summaries.map((entry) => entry.slug)).toEqual(["monk", "shadow"]);
  });

  it("веде від загального до конкретного: покажчики першими, клас від гайду до підкласів, теми після класів", () => {
    const groups = groupDraftSummaries([
      summary("races", "Орк", ["races"]), summary("race", "Людина", ["race"]), summary("index", "Покажчик", ["class"]),
      summary("tempest", "Домен бурі", ["Клірик", "Домен бурі", "підклас"]), summary("spells", "Огляд заклинань", ["Клірик", "заклинання"]),
      summary("subclasses", "Підкласи Клірика", ["Клірик", "підкласи"]), summary("cleric", "Клірик — класовий гайд", ["Клірик", "класовий гайд", "раси"]),
      summary("divinity", "Божественний канал", ["Клірик", "Божественний канал"]),
    ]);
    expect(groups.map((group) => group.title)).toEqual(["Класи", "Клірик", "Раси"]);
    expect(groups[1].summaries.map((entry) => entry.slug)).toEqual(["cleric", "subclasses", "spells", "divinity", "tempest"]);
    expect(groups[2].summaries.map((entry) => entry.slug)).toEqual(["race", "races"]);
  });
});

describe("buildListTree", () => {
  const list = (items: string[], depths?: number[], itemKinds?: ("ordered" | "unordered")[], ordered = false): Extract<ContentBlock, { type: "list" }> =>
    ({ blockId: "list", type: "list", ordered, items: items.map(text), depths, itemKinds });
  const shape = (nodes: ListNode[]): unknown[] => nodes.map((node) => [node.itemIndex, node.ordered, shape(node.children)]);

  it("будує вкладені пункти з глибин, зберігаючи номер пункту в оригіналі", () => {
    const tree = buildListTree(list(["a", "b", "c", "d", "e"], [0, 1, 2, 1, 0]));
    expect(shape(tree)).toEqual([[0, false, [[1, false, [[2, false, []]]], [3, false, []]]], [4, false, []]]);
  });

  it("бере вид кожного пункту з itemKinds, а без нього — з прапорця списку", () => {
    expect(shape(buildListTree(list(["a", "b"], [0, 1], ["unordered", "ordered"])))).toEqual([[0, false, [[1, true, []]]]]);
    expect(shape(buildListTree(list(["a", "b"], undefined, undefined, true)))).toEqual([[0, true, []], [1, true, []]]);
  });

  it("розділяє сусідні пункти різного виду на окремі списки", () => {
    const groups = groupListNodesByKind(buildListTree(list(["a", "b", "c"], [0, 0, 0], ["ordered", "ordered", "unordered"])));
    expect(groups.map((group) => [group.ordered, group.nodes.map((node) => node.itemIndex)])).toEqual([[true, [0, 1]], [false, [2]]]);
  });
});

describe("оцінки", () => {
  const rating = (targetBlockId: string, optionId?: string) => ({
    ratingId: `rating-${targetBlockId}-${optionId ?? "block"}`, articleId: "x", translationRevisionId: "t", sectionId: "s",
    targetBlockId, optionId, context: "Кі", score: 4 as const, sourceColor: "blue" as const, explanationBlockId: targetBlockId,
  });

  it("знаходить оцінку за блоком і номером пункту", () => {
    const list: ContentBlock = { blockId: "list-1", type: "list", ordered: false, items: [text("Один"), text("Два"), text("Три")] };
    const index = buildRatingIndex([rating("list-1", "s-block-list-1-item-2"), rating("p-1", "s-block-p-1")], [list, paragraph("p-1")]);
    expect(findRating(index, "list-1", 2)?.targetBlockId).toBe("list-1");
    expect(findRating(index, "list-1", 1)).toBeUndefined();
    expect(findRating(index, "p-1")?.targetBlockId).toBe("p-1");
    expect(readRatingItemIndex({ optionId: "s-block-list-1-item-12" })).toBe(12);
    expect(readRatingItemIndex({ optionId: undefined })).toBeUndefined();
  });

  it("знаходить оцінку комірки таблиці за рядком і стовпцем", () => {
    const table: ContentBlock = { blockId: "t-1", type: "table", headers: [text("Хар.")], rows: [[text("Сила")], [text("Спритність")]] };
    const index = buildRatingIndex([rating("t-1", "s-block-t-1-row-0-0"), rating("t-1", "s-block-t-1-row-1-0")], [table]);
    expect(findCellRating(index, "t-1", 0, 0)?.optionId).toBe("s-block-t-1-row-0-0");
    expect(findCellRating(index, "t-1", 1, 0)?.optionId).toBe("s-block-t-1-row-1-0");
    expect(findCellRating(index, "t-1", 2, 0)).toBeUndefined();
    expect(findRating(index, "t-1")).toBeUndefined();
    expect(readRatingCell({ optionId: "s-block-t-1-row-3-2" })).toEqual({ rowIndex: 3, cellIndex: 2 });
    expect(readRatingCell({ optionId: "s-block-list-1-item-2" })).toBeUndefined();
  });

  it("не губить окремі оцінки заголовків таблиці й не змішує їх із першим рядком", () => {
    const table: ContentBlock = { blockId: "t-1", type: "table", headers: [text("Клірик"), text("Друїд")], rows: [[text("Так"), text("Так")]] };
    const header = rating("t-1", "s-block-t-1-header-0");
    const nextHeader = rating("t-1", "s-block-t-1-header-1");
    const body = rating("t-1", "s-block-t-1-row-0-0");
    const index = buildRatingIndex([header, nextHeader, body], [table]);
    expect(index.size).toBe(3);
    expect(findHeaderRating(index, "t-1", 0)).toBe(header);
    expect(findHeaderRating(index, "t-1", 1)).toBe(nextHeader);
    expect(findCellRating(index, "t-1", 0, 0)).toBe(body);
  });

  it("без номера в optionId знаходить пункт за назвою на початку тексту", () => {
    const list: ContentBlock = {
      blockId: "list-1", type: "list", ordered: true,
      items: [text("Шаленство{{Frenzy}}: поки ви в Люті"), text("Шалений удар: інше"), text("Відвага: ще")],
    };
    const named = (context: string) => ({ optionId: "frenzy", context });
    expect(findRatingItemIndex(named("Шаленство"), list)).toBe(0);
    expect(findRatingItemIndex(named("Шалений удар"), list)).toBe(1);
    expect(findRatingItemIndex(named("Шал"), list)).toBeUndefined();
    expect(findRatingItemIndex(named("Невідомо"), list)).toBeUndefined();
    expect(findRatingItemIndex(named("Шаленство"), paragraph("p-1"))).toBeUndefined();
  });

  it("пояснює оцінку числом і словом, а не лише кольором", () => {
    expect(describeRating({ score: 4, context: "Кі" })).toEqual({ tone: "blue", score: 4, label: "Чудово", hint: "Чудові варіанти, нерідко необхідні для роботи персонажа. Дуже часто корисні.", summary: "Оцінка «Кі»: 4 з 4, чудово" });
    expect(describeRating({ score: 1, context: "Х" }).label).toBe("Погано");
    expect(describeRating({ score: 2, context: "Х" }).tone).toBe("orange");
    expect(describeRating({ score: 3, context: "Х" }).label).toBe("Добре");
    expect(describeRating({ context: "Невмируще тіло" })).toMatchObject({ tone: "none", label: "Без оцінки" });
  });
});

describe("resolveArticleLink", () => {
  it("links only to rendered sections, preserving empty parents with visible children", () => {
    const sourceUrl = "https://rpgbot.net/fixture/";
    const targets = buildLinkTargets([{ sourceUrl, slug: "fixture-2014", ruleset: "RULES_2014", sections: [
      section("empty", [], undefined, "empty"),
      section("parent", [], undefined, "parent"),
      section("child", [paragraph("body")], "parent", "child"),
    ] }]);
    expect(resolveArticleLink(`${sourceUrl}#empty`, targets).href).toBe("/rules/optimization/fixture-2014");
    expect(resolveArticleLink(`${sourceUrl}#parent`, targets).href).toBe("/rules/optimization/fixture-2014#parent");
    expect(resolveArticleLink(`${sourceUrl}#child`, targets).href).toBe("/rules/optimization/fixture-2014#child");
  });

  const targets = buildLinkTargets([{
    sourceUrl: "https://rpgbot.net/dnd5/classes/monk/", slug: "monk-2014", ruleset: "RULES_2014" as const,
    sections: [section("section-class-features", [paragraph("b1")], undefined, "class-features")],
  }]);

  it("веде на переклад, коли такий є, і на розділ, коли якір відомий", () => {
    expect(resolveArticleLink("https://rpgbot.net/dnd5/classes/monk", targets)).toEqual({ href: "/rules/optimization/monk-2014", isExternal: false });
    expect(resolveArticleLink("https://rpgbot.net/dnd5/classes/monk/#class-features", targets).href).toBe("/rules/optimization/monk-2014#section-class-features");
    expect(resolveArticleLink("https://rpgbot.net/dnd5/classes/monk/#unknown", targets).href).toBe("/rules/optimization/monk-2014");
  });

  it("зіставляє довший фрагмент із єдиним якорем розділу, на який він закінчується", () => {
    const comparison = buildLinkTargets([{
      sourceUrl: "https://rpgbot.net/dnd5/classes/monk/subclasses/", slug: "monk-subclasses-2014", ruleset: "RULES_2014" as const,
      sections: [section("section-mercy", [paragraph("b1")], undefined, "mercy"), section("section-open-hand", [paragraph("b2")], undefined, "open-hand")],
    }]);
    expect(resolveArticleLink("https://rpgbot.net/dnd5/classes/monk/subclasses#way-of-mercy", comparison).href).toBe("/rules/optimization/monk-subclasses-2014#section-mercy");
    expect(resolveArticleLink("https://rpgbot.net/dnd5/classes/monk/subclasses#way-of-the-open-hand", comparison).href).toBe("/rules/optimization/monk-subclasses-2014#section-open-hand");
    const ambiguous = buildLinkTargets([{
      sourceUrl: "https://rpgbot.net/x/", slug: "x-2014", ruleset: "RULES_2014" as const,
      sections: [section("s-self", [paragraph("b1")], undefined, "self"), section("s-astral", [paragraph("b2")], undefined, "astral-self")],
    }]);
    expect(resolveArticleLink("https://rpgbot.net/x/#way-of-astral-self", ambiguous).href).toBe("/rules/optimization/x-2014");
  });

  it("лишає оригінальну адресу, коли перекладу ще немає", () => {
    expect(resolveArticleLink("https://rpgbot.net/dnd5/classes/rogue/", targets)).toEqual({ href: "https://rpgbot.net/dnd5/classes/rogue/", isExternal: true });
    expect(resolveArticleLink("/spells/fireball", targets)).toEqual({ href: "/spells/fireball", isExternal: false });
  });
});

describe("усі приватні чернетки", () => {
  const directory = join(process.cwd(), "data/rpgbot/uk");
  const documents: ArticleDocument[] = readdirSync(directory).filter((name) => name.endsWith(".json"))
    .map((name) => parseArticleDocument(JSON.parse(readFileSync(join(directory, name), "utf8"))));

  it("читає хоча б одинадцять сторінок Монаха 2014", () => {
    expect(documents.filter((document) => document.article.slug.startsWith("monk") && document.article.ruleset === "RULES_2014").length).toBeGreaterThanOrEqual(11);
  });

  it("має унікальні адреси статей", () => {
    expect(new Set(documents.map((document) => document.article.slug)).size).toBe(documents.length);
  });

  it("кладе кожну оцінку на існуючий блок або пункт і не губить жодної", () => {
    for (const document of documents) {
      const revision = document.translations[document.translations.length - 1];
      const blocks = new Map(revision.sections.flatMap((entry) => entry.blocks.map((block) => [block.blockId, block] as const)));
      const headingRatings = document.ratings.filter(isHeadingRating);
      for (const rating of document.ratings.filter((entry) => !isHeadingRating(entry))) {
        const block = blocks.get(rating.targetBlockId)!;
        const itemIndex = findRatingItemIndex(rating, block);
        const where = `${document.article.articleId}: ${rating.ratingId}`;
        if (block.type === "list") expect(itemIndex !== undefined && itemIndex < block.items.length, where).toBe(true);
        else expect(itemIndex, where).toBeUndefined();
      }
      for (const rating of headingRatings) {
        expect(findHeadingRating(document.ratings, rating.sectionId), rating.ratingId).toBe(rating);
        expect(revision.sections.some((entry) => entry.sectionId === rating.sectionId), rating.ratingId).toBe(true);
      }
      expect(buildRatingIndex(document.ratings, [...blocks.values()]).size, document.article.articleId).toBe(document.ratings.length - headingRatings.length);
    }
  });

  it("показує кожен пункт списку рівно один раз", () => {
    const countNodes = (nodes: ListNode[]): number => nodes.reduce((sum, node) => sum + 1 + countNodes(node.children), 0);
    for (const document of documents) {
      for (const entry of document.translations[document.translations.length - 1].sections) {
        for (const block of entry.blocks) {
          if (block.type === "list") expect(countNodes(buildListTree(block)), block.blockId).toBe(block.items.length);
        }
      }
    }
  });
});
