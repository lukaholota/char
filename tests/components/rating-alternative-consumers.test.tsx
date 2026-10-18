// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { getAllClasses } from "@/lib/classesData";
import { ArticleBlock, type BlockContext } from "@/components/optimization/ArticleBlocks";
import { RatingBadge } from "@/components/optimization/RatingBadge";
import { SpellRatingBadge } from "@/components/spells/SpellRatingBadge";
import { SpellRatingChipButton } from "@/components/spells/SpellRatingChipButton";
import { parseArticleDocument } from "@/lib/optimization/document";
import { ratingSchema } from "@/lib/optimization/schema";
import { extractSpellRatings } from "@/lib/optimization/spell-rating-extraction";
import { buildSpellScoreFinder } from "@/lib/optimization/ready-preset-spell-scores";
import { spellRatingCatalog } from "@/lib/optimization/spell-rating-catalog";
import { findRatingListKeys } from "@/lib/optimization/spell-rating-casters";
import { createSpellRatingFinder, type SpellRatingCatalog } from "@/lib/optimization/spell-rating-lookup";
import type { AnalysisRating, InlineNode } from "@/lib/optimization/types";
import { extractWildshapeRatings } from "@/lib/optimization/wildshape-rating-extraction";
import { buildWildshapeRatingCatalog } from "@/lib/optimization/wildshape-rating-generation";
import { findWildshapeFormRating, type WildshapeRatingCatalog } from "@/lib/optimization/wildshape-rating-lookup";

vi.mock("next/navigation", () => ({ usePathname: () => "/rules/optimization" }));

afterEach(cleanup);

type Alternative = NonNullable<AnalysisRating["alternative"]>;
const MOON: Alternative = { score: 4, sourceColor: "blue", condition: "Коло місяця", subclassKeys: ["CIRCLE_OF_THE_MOON"] };
const HEXBLADE: Alternative = { score: 4, sourceColor: "blue", condition: "Відьмацький клинок", subclassKeys: ["HEXBLADE"] };
const text = (value: string): InlineNode => ({ type: "text", text: value });

const octopusRating: AnalysisRating = {
  ratingId: "r-octopus", articleId: "fixture", translationRevisionId: "translation-r1", sectionId: "section-cr_1",
  targetBlockId: "list-section-cr_1", optionId: "section-cr_1-list-item-0", context: "Гігантський восьминіг",
  score: 1, sourceColor: "red", explanationBlockId: "list-section-cr_1", alternative: MOON,
};

function buildArticle(sectionId: string, item: InlineNode[], rating: AnalysisRating) {
  return parseArticleDocument({
    sources: [{ sourceId: "fixture-source", rulesets: ["RULES_2014"] }],
    sourceRevisions: [{ revisionId: "source-r1", sourceId: "fixture-source", fetchedAt: "2026-10-17T00:00:00Z", contentHash: "a".repeat(64),
      title: "Fixture", authors: ["Author"], sourceFile: "source/fixture.txt", evidence: "Original fixture" }],
    article: { articleId: "fixture", sourceId: "fixture-source", slug: "fixture", ruleset: "RULES_2014", titleUk: "Приклад", titleEn: "Example", topics: [], status: "unpublished" },
    translations: [{ translationRevisionId: "translation-r1", articleId: "fixture", sourceRevisionId: "source-r1", status: "draft", sections: [
      { sectionId: "section-animal-forms", heading: "Форми", blocks: [{ blockId: "intro-animal", type: "paragraph", content: [text("Політ і плавання — з 8-го рівня.")] }] },
      { sectionId, heading: sectionId, blocks: [
        { blockId: `intro-${sectionId}`, type: "paragraph", content: [text("Вступ розділу.")] },
        { blockId: `list-${sectionId}`, type: "list", ordered: false, items: [item] },
      ] },
    ] }],
    ratings: [{ ...rating, targetBlockId: `list-${sectionId}`, sectionId, optionId: `${sectionId}-list-${sectionId}-item-0`, explanationBlockId: `list-${sectionId}` }],
  });
}

const findBadgeTones = (container: HTMLElement) => [...container.querySelectorAll("[data-rating-tone]")].map((badge) => badge.getAttribute("data-rating-tone"));

describe("друга оцінка RPGbot — для кожного споживача", () => {
  it("схема приймає альтернативу лише з оцінкою, що відповідає кольору", () => {
    expect(ratingSchema.safeParse(octopusRating).success).toBe(true);
    expect(ratingSchema.safeParse({ ...octopusRating, alternative: { ...MOON, score: 3 } }).success).toBe(false);
  });

  it("бейдж статті показує обидві оцінки з видимою умовою, і читач екрана чує умову другої", () => {
    const { container } = render(<RatingBadge rating={octopusRating} />);

    expect(findBadgeTones(container)).toEqual(["red", "blue"]);
    expect(screen.getByText("Коло місяця")).toBeTruthy();
    expect(screen.getByText(/: 1 з 4, погано\.$/)).toBeTruthy();
    expect(screen.getByText(/^Коло місяця: .*4 з 4, чудово\.$/)).toBeTruthy();
  });

  it("блок оцінки статті малює дві оцінки", () => {
    const context = { ratings: [octopusRating] } as unknown as BlockContext;
    const { container } = render(<ArticleBlock block={{ blockId: "b", type: "rating", ratingId: "r-octopus" }} context={context} />);

    expect(findBadgeTones(container)).toEqual(["red", "blue"]);
  });

  it("Дика форма: друїд Кола місяця бачить 4 для Гігантського восьминога, решта — 1", async () => {
    const document = buildArticle("section-cr_1", [text("Гігантський восьминіг [Giant Octopus]: тримає під водою.")], octopusRating);
    const creatures = [{ nameEng: "Giant Octopus", type: "Звір" }];

    expect(extractWildshapeRatings(document, creatures).forms["giant-octopus"].alternative).toEqual(MOON);
    const { catalog } = await buildWildshapeRatingCatalog(document, creatures, "https://rpgbot.net/");
    expect(catalog.forms["giant-octopus"]).toMatchObject({ score: 1, moonScore: 4 });
    expect(findWildshapeFormRating(catalog, "giant-octopus", true)?.score).toBe(4);
    expect(findWildshapeFormRating(catalog, "giant-octopus", false)?.score).toBe(1);
  });

  it("Дика форма без альтернативи лишає Колу місяця основну оцінку", () => {
    const catalog: WildshapeRatingCatalog = { titleUk: "", articleSlug: "", sourceUrl: "", movementNote: "", sections: {},
      forms: { wolf: { score: 3, sectionId: "s", comment: "" } } };

    expect(findWildshapeFormRating(catalog, "wolf", true)?.score).toBe(3);
  });

  it("заклинання: персонаж бачить лише оцінку свого підкласу", () => {
    const rating = { ...octopusRating, context: "Громовий клинок [Booming Blade]", alternative: HEXBLADE };
    const document = buildArticle("section-cantrips", [text("Громовий клинок [Booming Blade]: для ближнього бою.")], rating);
    const extracted = extractSpellRatings(document, [{ engName: "Booming Blade", level: 0 }]);
    expect(extracted.alternatives).toEqual({ "booming-blade": { score: 4, condition: "Відьмацький клинок", subclassKeys: ["HEXBLADE"] } });

    const catalog: SpellRatingCatalog = { lists: { warlock: { titleUk: "", articleSlug: "", sourceUrl: "", scores: extracted.scores, alternatives: extracted.alternatives } } };
    const findFor = (subclassName: string | null) => createSpellRatingFinder(catalog, [{ className: "WARLOCK_2014", subclassName }])("Booming Blade");
    expect(findFor("HEXBLADE")).toEqual([{ listKey: "warlock", score: 4 }]);
    expect(findFor("THE_FIEND")).toEqual([{ listKey: "warlock", score: 1 }]);
    expect(findFor(null)).toEqual([{ listKey: "warlock", score: 1 }]);
  });

  it("друга оцінка заклинання без підкласу не проходить генерацію", () => {
    const rating = { ...octopusRating, context: "Громовий клинок [Booming Blade]", alternative: { score: 4, sourceColor: "blue", condition: "для ближнього бою" } satisfies Alternative };
    const document = buildArticle("section-cantrips", [text("Громовий клинок [Booming Blade]: для ближнього бою.")], rating);
    expect(() => extractSpellRatings(document, [{ engName: "Booming Blade", level: 0 }])).toThrow(/не називає підклас/);
  });

  it("каталог: винахідник-Зброяр і Бойовий коваль отримують свою оцінку, Алхімік — основну", () => {
    const findFor = (subclassName: string) => createSpellRatingFinder(spellRatingCatalog, [{ className: "ARTIFICER_2014", subclassName }])("Booming Blade");
    expect(findFor("ARMORER")).toEqual([{ listKey: "artificer", score: 4 }]);
    expect(findFor("BATTLE_SMITH")).toEqual([{ listKey: "artificer", score: 4 }]);
    expect(findFor("ALCHEMIST")).toEqual([{ listKey: "artificer", score: 1 }]);
  });

  it("пресет і підвищення рівня рахують заклинання за підкласом", () => {
    expect(buildSpellScoreFinder("WARLOCK_2014", "HEXBLADE")("Booming Blade")).toBe(4);
    expect(buildSpellScoreFinder("WARLOCK_2014", "THE_FIEND")("Booming Blade")).toBe(1);
  });

  it("кожен підклас другої оцінки існує в редакції статті, а підклас заклинання читає її список", () => {
    const articles = readdirSync("data/rpgbot/uk").filter((file) => file.endsWith(".json"))
      .map((file) => JSON.parse(readFileSync(`data/rpgbot/uk/${file}`, "utf8")) as { article: { slug: string; ruleset: "RULES_2014" | "RULES_2024" }; ratings: AnalysisRating[] });
    const unknown = articles.flatMap(({ article, ratings }) => {
      const subclassKeys = new Set(getAllClasses(article.ruleset).flatMap((entry) => entry.subclasses.map((subclass) => subclass.key)));
      return ratings.flatMap((rating) => rating.alternative?.subclassKeys ?? []).filter((key) => !subclassKeys.has(key)).map((key) => `${article.slug}: ${key}`);
    });
    expect(unknown).toEqual([]);

    const classes = getAllClasses("RULES_2014");
    const unreachable = Object.entries(spellRatingCatalog.lists).flatMap(([listKey, list]) => Object.values(list.alternatives ?? {})
      .flatMap((alternative) => alternative.subclassKeys)
      .filter((subclassKey) => !classes.some((entry) => entry.subclasses.some((subclass) => subclass.key === subclassKey)
        && findRatingListKeys({ className: entry.key, subclassName: subclassKey }).includes(listKey)))
      .map((subclassKey) => `${listKey}: ${subclassKey}`));
    expect(unreachable).toEqual([]);
  });

  it("значки заклинань показують одну оцінку", () => {
    const match = { listKey: "warlock", score: 4 } as const;
    const catalogBadge = render(<SpellRatingBadge matches={[match]} spellName="Громовий клинок" spellEngName="Booming Blade" />);
    expect(findBadgeTones(catalogBadge.container)).toEqual(["blue"]);
    expect(screen.getByRole("button", { name: "Оцінка RPGbot для «Громовий клинок»: Чудово" })).toBeTruthy();
    catalogBadge.unmount();

    const chip = render(<SpellRatingChipButton rating={match} spell={{ spellId: 1, engName: "Booming Blade", ruleset: "RULES_2014" }} spellName="Громовий клинок" />);
    expect(findBadgeTones(chip.container)).toEqual(["blue"]);
  });
});
