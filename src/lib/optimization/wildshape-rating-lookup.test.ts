import { describe, expect, it } from "vitest";
import { findWildshapeEligibility, findWildshapeLimits, type WildshapeContext } from "@/rules/wildshape";
import {
  canRateWildshape,
  findRecommendationScore,
  findWildshapeFormRating,
  findWildshapeRatingNotes,
  type WildshapeRatingCatalog,
} from "./wildshape-rating-lookup";

const CATALOG: WildshapeRatingCatalog = {
  titleUk: "Дика форма",
  articleSlug: "druid-wild-shape-2014",
  sourceUrl: "https://rpgbot.net/",
  movementNote: "Політ — з 8 рівня.",
  sections: { "section-cr_1": { title: "ПН 1", notes: ["Порада ПН 1."] } },
  forms: { "giant-eagle": { score: 3, sectionId: "section-cr_1", comment: "Летить." }, broken: { score: 7, sectionId: "section-cr_1", comment: "" } },
};

const standing = (context: WildshapeContext) => ({ ...context, limits: findWildshapeLimits(context) });
const moonDruid2 = { druidLevel: 2, isMoonCircle: true, ruleset: "RULES_2014" } as const;
const eagle = { nameEng: "Giant Eagle", type: "Звір", challenge: "1", flySpeed: 80, swimSpeed: null, climbSpeed: null, burrowSpeed: null, hasConditionalSpeed: false };

describe("canRateWildshape", () => {
  it("оцінює лише друїда 2014 з Дикою формою в каталозі 2014", () => {
    expect(canRateWildshape("RULES_2014", standing(moonDruid2))).toBe(true);
    expect(canRateWildshape("RULES_2024", standing(moonDruid2))).toBe(false);
    expect(canRateWildshape("RULES_2014", standing({ ...moonDruid2, ruleset: "RULES_2024" }))).toBe(false);
    expect(canRateWildshape("RULES_2014", standing({ ...moonDruid2, druidLevel: 1 }))).toBe(false);
    expect(canRateWildshape("RULES_2014", null)).toBe(false);
  });
});

describe("findWildshapeFormRating", () => {
  it("повертає оцінку форми, а невідомий ключ і зіпсовану оцінку — як null", () => {
    expect(findWildshapeFormRating(CATALOG, "giant-eagle")).toEqual({ score: 3, sectionId: "section-cr_1", comment: "Летить." });
    expect(findWildshapeFormRating(CATALOG, "wolf")).toBeNull();
    expect(findWildshapeFormRating(CATALOG, "constructor")).toBeNull();
    expect(findWildshapeFormRating(CATALOG, "broken")).toBeNull();
  });
});

describe("findWildshapeRatingNotes", () => {
  it("додає примітку про рух лише тоді, коли форму блокує політ чи плавання", () => {
    const rating = findWildshapeFormRating(CATALOG, "giant-eagle")!;
    const locked = findWildshapeEligibility(eagle, moonDruid2);
    const open = findWildshapeEligibility(eagle, { ...moonDruid2, druidLevel: 8 });

    expect(findWildshapeRatingNotes(CATALOG, rating, locked)).toEqual({ sectionTitle: "ПН 1", sectionNotes: ["Порада ПН 1."], movementNote: "Політ — з 8 рівня." });
    expect(findWildshapeRatingNotes(CATALOG, rating, open).movementNote).toBeNull();
    expect(findWildshapeRatingNotes(CATALOG, { ...rating, sectionId: "section-missing" }, null)).toEqual({ sectionTitle: "", sectionNotes: [], movementNote: null });
  });
});

describe("findRecommendationScore", () => {
  it("піднімає лише форму, доступну вже зараз", () => {
    const rating = findWildshapeFormRating(CATALOG, "giant-eagle");

    expect(findRecommendationScore(rating, findWildshapeEligibility(eagle, { ...moonDruid2, druidLevel: 8 }))).toBe(3);
    expect(findRecommendationScore(rating, findWildshapeEligibility(eagle, moonDruid2))).toBeNull();
    expect(findRecommendationScore(null, findWildshapeEligibility(eagle, { ...moonDruid2, druidLevel: 8 }))).toBeNull();
    expect(findRecommendationScore(rating, null)).toBeNull();
  });
});
