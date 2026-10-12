import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getSubclassImagePath } from "@/lib/assets/image-manifest";
import { getAllClasses } from "@/lib/classesData";
import { findArticleImageSrc } from "./article-art";
import { summarizeDraft } from "./article-view";
import { parseArticleDocument } from "./document";

const draftsDirectory = join(process.cwd(), "data/rpgbot/uk");
const subclassKeyBySlug: Record<string, string> = JSON.parse(readFileSync(join(process.cwd(), "data/rpgbot/article-art.json"), "utf8"));
const summaries = readdirSync(draftsDirectory)
  .filter((fileName) => /^rpgbot-.+\.json$/.test(fileName))
  .map((fileName) => summarizeDraft(parseArticleDocument(JSON.parse(readFileSync(join(draftsDirectory, fileName), "utf8")))));

describe("арт карток статей RPGbot", () => {
  it("таблиця вказує лише на наявні статті", () => {
    const slugs = new Set(summaries.map((summary) => summary.slug));
    expect(Object.keys(subclassKeyBySlug).filter((slug) => !slugs.has(slug))).toEqual([]);
  });

  it.each(Object.entries(subclassKeyBySlug))("%s → %s: підклас існує в тій самій редакції й має арт", (slug, subclassKey) => {
    const summary = summaries.find((entry) => entry.slug === slug)!;
    const knownKeys = getAllClasses(summary.ruleset).flatMap((characterClass) => characterClass.subclasses.map((subclass) => subclass.key));
    expect(knownKeys).toContain(subclassKey);
    expect(getSubclassImagePath(subclassKey)).not.toBeNull();
    expect(findArticleImageSrc(summary, subclassKeyBySlug)).toBe(getSubclassImagePath(subclassKey));
  });

  it("гайд підкласу з таблиці отримує арт підкласу", () => {
    const glamour = summaries.find((summary) => summary.slug === "bard-glamour-2014")!;
    expect(findArticleImageSrc(glamour, subclassKeyBySlug)).toBe("/images/subclasses/bard-glamour.webp");
  });

  it("кожен класовий гайд отримує арт свого класу", () => {
    const classGuides = summaries.filter((summary) => summary.topics[1] === "класовий гайд");
    expect(classGuides.length).toBeGreaterThan(0);
    for (const guide of classGuides) expect(findArticleImageSrc(guide, subclassKeyBySlug), guide.slug).toMatch(/^\/images\/classes\/[a-z_]+\.webp$/);
  });

  it("статті без підкласу чи класу лишаються без арту", () => {
    const spells = summaries.find((summary) => summary.slug === "bard-spells-2014")!;
    const feat = summaries.find((summary) => summary.slug === "bomber-2024")!;
    expect(findArticleImageSrc(spells, subclassKeyBySlug)).toBeNull();
    expect(findArticleImageSrc(feat, subclassKeyBySlug)).toBeNull();
  });
});
