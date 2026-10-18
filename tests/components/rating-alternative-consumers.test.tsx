// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ArticleBlock, type BlockContext } from "@/components/optimization/ArticleBlocks";
import { RatingBadge } from "@/components/optimization/RatingBadge";
import { SpellRatingBadge } from "@/components/spells/SpellRatingBadge";
import { SpellRatingChipButton } from "@/components/spells/SpellRatingChipButton";
import { parseArticleDocument } from "@/lib/optimization/document";
import { ratingSchema } from "@/lib/optimization/schema";
import { extractSpellRatings } from "@/lib/optimization/spell-rating-extraction";
import { createSpellRatingFinder, type SpellRatingCatalog } from "@/lib/optimization/spell-rating-lookup";
import type { AnalysisRating, InlineNode } from "@/lib/optimization/types";
import { extractWildshapeRatings } from "@/lib/optimization/wildshape-rating-extraction";
import { buildWildshapeRatingCatalog } from "@/lib/optimization/wildshape-rating-generation";
import { findWildshapeFormRating, type WildshapeRatingCatalog } from "@/lib/optimization/wildshape-rating-lookup";

vi.mock("next/navigation", () => ({ usePathname: () => "/rules/optimization" }));

afterEach(cleanup);

const MOON = { score: 4, sourceColor: "blue", condition: "Коло місяця", subclassKey: "CIRCLE_OF_THE_MOON" } as const;
const HEXBLADE = { score: 4, sourceColor: "blue", condition: "Відьмацький клинок" } as const;
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

  it("заклинання несуть альтернативу від статті до збігу в пікері", () => {
    const rating = { ...octopusRating, context: "Громовий клинок [Booming Blade]", alternative: HEXBLADE };
    const document = buildArticle("section-cantrips", [text("Громовий клинок [Booming Blade]: для ближнього бою.")], rating);
    const extracted = extractSpellRatings(document, [{ engName: "Booming Blade", level: 0 }]);
    expect(extracted.alternatives).toEqual({ "booming-blade": { score: 4, condition: "Відьмацький клинок" } });

    const catalog: SpellRatingCatalog = { lists: { warlock: { titleUk: "", articleSlug: "", sourceUrl: "", scores: extracted.scores, alternatives: extracted.alternatives } } };
    const finder = createSpellRatingFinder(catalog, [{ className: "WARLOCK_2014", subclassName: null }]);
    expect(finder("Booming Blade")).toEqual([{ listKey: "warlock", score: 1, alternative: { score: 4, condition: "Відьмацький клинок" } }]);
  });

  it("значки заклинань у каталозі й пікері показують обидві оцінки з умовою", () => {
    const match = { listKey: "warlock", score: 1, alternative: { score: 4, condition: "Відьмацький клинок" } } as const;
    const catalogBadge = render(<SpellRatingBadge matches={[match]} spellName="Громовий клинок" spellEngName="Booming Blade" />);
    expect(findBadgeTones(catalogBadge.container)).toEqual(["red", "blue"]);
    expect(screen.getByRole("button", { name: /Погано · Відьмацький клинок: Чудово/ })).toBeTruthy();
    catalogBadge.unmount();

    const chip = render(<SpellRatingChipButton rating={match} spell={{ spellId: 1, engName: "Booming Blade", ruleset: "RULES_2014" }} spellName="Громовий клинок" />);
    expect(findBadgeTones(chip.container)).toEqual(["red", "blue"]);
    expect(screen.getByText("Відьмацький клинок")).toBeTruthy();
  });
});
