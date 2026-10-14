import { describe, expect, it } from "vitest";
import { collectPersRatedCasters, findRatingListKeys, formatRatedCastersParam, hasRatingList, parseRatedCastersParam } from "./spell-rating-casters";
import { matchesRatingSelection } from "./spell-rating-filter";
import { createSpellRatingFinder, findBestSpellRating, sortByBestRating, type SpellRatingCatalog } from "./spell-rating-lookup";

const CATALOG: SpellRatingCatalog = {
  lists: {
    wizard: { titleUk: "Чарівник", articleSlug: "wizard-spells-2014", sourceUrl: "https://example.org/wizard", scores: { fireball: 4, "ice-knife": 2, shatter: 3 } },
    cleric: { titleUk: "Клірик", articleSlug: "cleric-spells-2014", sourceUrl: "https://example.org/cleric", scores: { "spirit-guardians": 4, shatter: 1 } },
    "fighter-eldritch-knight": { titleUk: "Потойбічний лицар", articleSlug: "fighter-eldritch-knight-spells-2014", sourceUrl: "https://example.org/ek", scores: { shield: 4 } },
  },
};

describe("findRatingListKeys", () => {
  it("gives a plain class its own list", () => {
    expect(findRatingListKeys({ className: "WIZARD_2014" })).toEqual(["wizard"]);
  });

  it("gives Eldritch Knight its own list first and the wizard list as a fallback", () => {
    expect(findRatingListKeys({ className: "FIGHTER_2014", subclassName: "ELDRITCH_KNIGHT" })).toEqual(["fighter-eldritch-knight", "wizard"]);
  });

  it("gives Arcane Trickster its own list first and the wizard list as a fallback", () => {
    expect(findRatingListKeys({ className: "ROGUE_2014", subclassName: "ARCANE_TRICKSTER" })).toEqual(["rogue-arcane-trickster", "wizard"]);
  });

  it("gives other fighters, other editions and unknown classes nothing", () => {
    expect(findRatingListKeys({ className: "FIGHTER_2014", subclassName: "CHAMPION" })).toEqual([]);
    expect(findRatingListKeys({ className: "WIZARD_2024" })).toEqual([]);
    expect(findRatingListKeys({ className: "ROGUE_2014", subclassName: "ELDRITCH_KNIGHT" })).toEqual([]);
  });
});

describe("rated casters param", () => {
  it("round-trips class and subclass entries and drops classes without a list", () => {
    const casters = [{ className: "WIZARD_2014" }, { className: "FIGHTER_2014", subclassName: "ELDRITCH_KNIGHT" }, { className: "BARBARIAN_2014" }];
    const param = formatRatedCastersParam(casters);

    expect(param).toBe("WIZARD_2014,FIGHTER_2014:ELDRITCH_KNIGHT");
    expect(parseRatedCastersParam(param)).toEqual([
      { className: "WIZARD_2014", subclassName: null },
      { className: "FIGHTER_2014", subclassName: "ELDRITCH_KNIGHT" },
    ]);
  });

  it("parses a missing param as no casters", () => {
    expect(parseRatedCastersParam(null)).toEqual([]);
    expect(parseRatedCastersParam("")).toEqual([]);
  });

  it("collects main class and multiclasses of a character", () => {
    const casters = collectPersRatedCasters({
      class: { name: "CLERIC_2014" },
      subclass: null,
      multiclasses: [{ class: { name: "FIGHTER_2014" }, subclass: { name: "ELDRITCH_KNIGHT" } }],
    });

    expect(casters).toEqual([{ className: "CLERIC_2014", subclassName: null }, { className: "FIGHTER_2014", subclassName: "ELDRITCH_KNIGHT" }]);
    expect(hasRatingList(casters)).toBe(true);
    expect(hasRatingList([{ className: "BARBARIAN_2014" }])).toBe(false);
  });
});

describe("createSpellRatingFinder", () => {
  it("looks a spell up by its English name", () => {
    const find = createSpellRatingFinder(CATALOG, [{ className: "WIZARD_2014" }]);

    expect(find("Fireball")).toEqual([{ listKey: "wizard", score: 4 }]);
    expect(find("Ice Knife")).toEqual([{ listKey: "wizard", score: 2 }]);
    expect(find("Unknown Spell")).toEqual([]);
  });

  it("returns one rating per class of a multiclass character", () => {
    const find = createSpellRatingFinder(CATALOG, [{ className: "WIZARD_2014" }, { className: "CLERIC_2014" }]);

    expect(find("Shatter")).toEqual([{ listKey: "wizard", score: 3 }, { listKey: "cleric", score: 1 }]);
    expect(findBestSpellRating(find("Shatter"))).toEqual({ listKey: "wizard", score: 3 });
  });

  it("falls back to the wizard list for Eldritch Knight spells outside its own list", () => {
    const find = createSpellRatingFinder(CATALOG, [{ className: "FIGHTER_2014", subclassName: "ELDRITCH_KNIGHT" }]);

    expect(find("Shield")).toEqual([{ listKey: "fighter-eldritch-knight", score: 4 }]);
    expect(find("Fireball")).toEqual([{ listKey: "wizard", score: 4 }]);
  });

  it("does not repeat a list shared by two entries", () => {
    const find = createSpellRatingFinder(CATALOG, [{ className: "WIZARD_2014" }, { className: "FIGHTER_2014", subclassName: "ELDRITCH_KNIGHT" }]);

    expect(find("Fireball")).toEqual([{ listKey: "wizard", score: 4 }]);
  });

  it("ignores scores that are not 1 to 4", () => {
    const find = createSpellRatingFinder({ lists: { wizard: { titleUk: "", articleSlug: "", sourceUrl: "", scores: { fireball: 7 } } } }, [{ className: "WIZARD_2014" }]);

    expect(find("Fireball")).toEqual([]);
  });
});

describe("sortByBestRating", () => {
  it("puts better scores first, keeps the original order of ties and leaves unrated last", () => {
    const names = ["a", "b", "c", "d", "e"];
    const scores: Record<string, number | null> = { a: 2, b: null, c: 4, d: 2, e: 3 };

    expect(sortByBestRating(names, (name) => scores[name])).toEqual(["c", "e", "a", "d", "b"]);
  });
});

describe("rating filter", () => {
  it("keeps everything when nothing is selected and only matching scores otherwise", () => {
    expect(matchesRatingSelection(new Set(), null)).toBe(true);
    expect(matchesRatingSelection(new Set(["3", "4"]), 4)).toBe(true);
    expect(matchesRatingSelection(new Set(["3", "4"]), 2)).toBe(false);
    expect(matchesRatingSelection(new Set(["3", "4"]), null)).toBe(false);
  });
});
