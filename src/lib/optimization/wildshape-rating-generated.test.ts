import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import ratings from "@/lib/generated/rpgbot-wildshape-ratings.json";
import { findCreatureReadingLink } from "@/lib/creature-link";
import { toEntitySlug } from "@/lib/slug-utils";
import { findSpellLinkInHref } from "@/lib/spell-link";
import { findTermLinkInHref } from "@/lib/term-link";
import { isBeast } from "@/rules/wildshape";
import { isSpellRatingScore } from "./spell-rating-lookup";

const creatures2014 = JSON.parse(readFileSync(resolve("src/lib/generated/creatures.json"), "utf8")) as { nameEng: string; type: string; ruleset: string }[];
const creatureSlugs2014 = new Set(creatures2014.filter((creature) => creature.ruleset === "RULES_2014").map((creature) => toEntitySlug(creature.nameEng)));
const beastSlugs = new Set(creatures2014
  .filter((creature) => creature.ruleset === "RULES_2014" && isBeast(creature.type))
  .map((creature) => toEntitySlug(creature.nameEng)));
const article = JSON.parse(readFileSync(resolve(`data/rpgbot/uk/rpgbot-${ratings.articleSlug}.json`), "utf8")) as { translations: { sections: { sectionId: string }[] }[] };
const articleSectionIds = new Set(article.translations.at(-1)!.sections.map((section) => section.sectionId));

describe("згенеровані оцінки звіриних форм RPGbot", () => {
  it("оцінюють щонайменше 95 форм, і всі вони — звірі бестіарію 2014 з оцінкою 1–4", () => {
    const forms = Object.entries(ratings.forms);

    expect(forms.length).toBeGreaterThanOrEqual(95);
    for (const [slug, form] of forms) {
      expect(beastSlugs.has(slug), slug).toBe(true);
      expect(isSpellRatingScore(form.score), slug).toBe(true);
      expect(form.comment.length, slug).toBeGreaterThan(0);
    }
  });

  it("ведуть кожну форму до розділу статті з порадою", () => {
    for (const [slug, form] of Object.entries(ratings.forms)) {
      expect(articleSectionIds.has(form.sectionId), slug).toBe(true);
      expect(ratings.sections[form.sectionId as keyof typeof ratings.sections]?.notes.length, slug).toBeGreaterThan(0);
    }
  });

  it("мають джерело RPGbot і примітку про політ і плавання", () => {
    expect(ratings.sourceUrl).toMatch(/^https:\/\/rpgbot\.net\//);
    expect(ratings.movementNote).toContain("8-го рівня");
  });

  it("не оцінюють форм, яких Дика форма 2014 не дає", () => {
    expect(Object.keys(ratings.forms)).not.toEqual(expect.arrayContaining(["cranium-rat"]));
    for (const sectionId of Object.values(ratings.forms).map((form) => form.sectionId)) expect(sectionId).not.toBe("section-elemental-forms");
  });

  it("мають лише посилання, які пікер відкриває на місці: заклинання, терміни й істоти бестіарію 2014", () => {
    const texts = [ratings.movementNote, ...Object.values(ratings.sections).flatMap((section) => section.notes), ...Object.values(ratings.forms).map((form) => form.comment)];
    const hrefs = texts.flatMap((text) => [...text.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]));

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const creatureLink = findCreatureReadingLink(href);
      const isCreatureInBestiary = creatureLink?.ruleset === "RULES_2014" && creatureSlugs2014.has(creatureLink.key);
      expect(Boolean(findSpellLinkInHref(href) || findTermLinkInHref(href) || isCreatureInBestiary), href).toBe(true);
    }
  });

  it("не тягнуть каталог у стартовий бандл: його імпортує лише завантажувач", () => {
    const importers = listSourceFiles(resolve("src")).filter((path) => /^\s*(import|export)[^;]*from\s*["'][^"']*rpgbot-wildshape-ratings/m.test(readFileSync(path, "utf8")));

    expect(importers.map((path) => path.slice(resolve("src").length + 1))).toEqual(["lib/optimization/wildshape-rating-catalog.ts"]);
  });
});

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "generated" ? [] : listSourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}
