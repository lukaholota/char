import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import ratings from "@/lib/generated/rpgbot-spell-ratings.json";
import { toEntitySlug } from "@/lib/slug-utils";
import { isKeptInPicker } from "./picker-links";
import { findRatingListKeys } from "./spell-rating-casters";
import { findSpellRatingListKey } from "./spell-rating-generation";
import { isSpellRatingScore } from "./spell-rating-lookup";

const COMMENTS_DIRECTORY = resolve("src/lib/generated/rpgbot-spell-comments");
const spells2014 = JSON.parse(readFileSync(resolve("data/2014/spells.json"), "utf8")) as { engName: string }[];
const spellSlugs = new Set(spells2014.map((spell) => toEntitySlug(spell.engName)));
const creatures2014 = JSON.parse(readFileSync(resolve("src/lib/generated/creatures.json"), "utf8")) as { nameEng: string; ruleset: string }[];
const creatureSlugs2014 = new Set(creatures2014.filter((creature) => creature.ruleset === "RULES_2014").map((creature) => toEntitySlug(creature.nameEng)));
const readComments = (listKey: string) => JSON.parse(readFileSync(join(COMMENTS_DIRECTORY, `${listKey}.json`), "utf8")) as Record<string, { text: string; sectionId: string }>;

describe("згенеровані оцінки заклинань RPGbot", () => {
  it("мають список для кожного класу й підкласу, який ми зіставляємо", () => {
    const mappedClasses = [
      { className: "ARTIFICER_2014" }, { className: "BARD_2014" }, { className: "CLERIC_2014" }, { className: "DRUID_2014" },
      { className: "PALADIN_2014" }, { className: "RANGER_2014" }, { className: "SORCERER_2014" }, { className: "WARLOCK_2014" },
      { className: "WIZARD_2014" }, { className: "FIGHTER_2014", subclassName: "ELDRITCH_KNIGHT" }, { className: "ROGUE_2014", subclassName: "ARCANE_TRICKSTER" },
    ];
    const listKeys = mappedClasses.flatMap(findRatingListKeys);

    expect(listKeys.length).toBeGreaterThan(0);
    for (const listKey of listKeys) expect(Object.keys(ratings.lists)).toContain(listKey);
  });

  it("містять лише оцінки 1–4 для заклинань, що є в каталозі 2014", () => {
    for (const [listKey, list] of Object.entries(ratings.lists)) {
      for (const [slug, score] of Object.entries(list.scores)) {
        expect(isSpellRatingScore(score), `${listKey}/${slug}`).toBe(true);
        expect(spellSlugs.has(slug), `${listKey}/${slug}`).toBe(true);
      }
    }
  });

  it("мають посилання на розбір RPGbot для кожного списку", () => {
    for (const list of Object.values(ratings.lists)) expect(list.sourceUrl).toMatch(/^https:\/\/rpgbot\.net\//);
  });

  it("мають коментар із розділом статті до кожної оцінки й жодного зайвого", () => {
    for (const [listKey, list] of Object.entries(ratings.lists)) {
      const comments = readComments(listKey);
      expect(Object.keys(comments).sort(), listKey).toEqual(Object.keys(list.scores).sort());
      for (const comment of Object.values(comments)) expect(comment.sectionId).toMatch(/^section-(cantrips|spells-\d)$/);
    }
  });

  it("вказують на статтю, яку читає наш довідник", () => {
    for (const list of Object.values(ratings.lists)) {
      const articlePath = resolve("data/rpgbot/uk", `rpgbot-${list.articleSlug}.json`);
      expect(existsSync(articlePath), list.articleSlug).toBe(true);
    }
  });

  it("мають у коментарях лише посилання, які не виводять з пікера: заклинання, терміни, істоти бестіарію 2014 і зовнішні джерела", () => {
    const hrefs = Object.keys(ratings.lists).flatMap((listKey) =>
      Object.values(readComments(listKey)).flatMap((comment) => [...comment.text.matchAll(/\]\(([^)]+)\)/g)].map((match) => `${listKey}: ${match[1]}`)));
    const leavingPicker = hrefs.filter((entry) => !isKeptInPicker(entry.slice(entry.indexOf(": ") + 2), creatureSlugs2014));

    expect(hrefs.length).toBeGreaterThan(0);
    expect(leavingPicker).toEqual([]);
  });

  it("несуть другу оцінку з умовою для заклинань, оцінених у статті двома кольорами", () => {
    const lists = ratings.lists as Record<string, { scores: Record<string, number>; alternatives?: Record<string, { score: number; condition: string }> }>;
    const alternativeOf = (listKey: string, slug: string) => lists[listKey].alternatives?.[slug];

    for (const [listKey, slug] of [["artificer", "booming-blade"], ["artificer", "green-flame-blade"], ["warlock", "booming-blade"], ["warlock", "green-flame-blade"], ["warlock", "sword-burst"], ["wizard", "sword-burst"]]) {
      const alternative = alternativeOf(listKey, slug);
      expect(alternative, `${listKey}/${slug}`).toBeDefined();
      expect(isSpellRatingScore(alternative!.score), `${listKey}/${slug}`).toBe(true);
      expect(alternative!.condition.length, `${listKey}/${slug}`).toBeGreaterThan(0);
    }
    for (const [listKey, list] of Object.entries(lists)) {
      for (const slug of Object.keys(list.alternatives ?? {})) expect(list.scores[slug], `${listKey}/${slug}`).toBeDefined();
    }
  });

  it("не беруть статтю про заклинання-стіни за список заклинань класу", () => {
    expect(findSpellRatingListKey("rpgbot-wall-spells-2014.json")).toBeNull();
    expect(findSpellRatingListKey("rpgbot-wizard-spells-2014.json")).toBe("wizard");
    expect(Object.keys(ratings.lists)).not.toContain("wall");
  });

  it("не тягнуть коментарі в стартовий бандл: на них немає статичних імпортів", () => {
    const offenders = listSourceFiles(resolve("src")).filter((path) => /^\s*(import|export)[^;]*from\s*["'][^"']*rpgbot-spell-comments/m.test(readFileSync(path, "utf8")));

    expect(offenders).toEqual([]);
  });
});

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "generated" ? [] : listSourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".test.ts") ? [path] : [];
  });
}
