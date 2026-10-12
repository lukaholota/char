import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import ratings from "@/lib/generated/rpgbot-spell-ratings.json";
import { toEntitySlug } from "@/lib/slug-utils";
import { findRatingListKeys } from "./spell-rating-casters";
import { isSpellRatingScore } from "./spell-rating-lookup";

const COMMENTS_DIRECTORY = resolve("src/lib/generated/rpgbot-spell-comments");
const spells2014 = JSON.parse(readFileSync(resolve("data/2014/spells.json"), "utf8")) as { engName: string }[];
const spellSlugs = new Set(spells2014.map((spell) => toEntitySlug(spell.engName)));
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
