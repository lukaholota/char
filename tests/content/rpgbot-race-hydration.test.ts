import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";
import { parseArticleDocument } from "@/lib/optimization/document";

describe("расовий гайд відкриває правила власної раси", () => {
  it.each([
    ["astral-elf", ["Astral Trance", "Fey Ancestry"]],
    ["sea-elf", ["Trance", "Keen Senses", "Fey Ancestry", "Friend of the Sea"]],
  ])("%s", async (slug, names) => {
    const article = parseArticleDocument(JSON.parse(readFileSync(`data/rpgbot/uk/rpgbot-${slug}-2014.json`, "utf8")));
    const hydrated = await hydrateArticleDocument(article);
    for (const name of names) {
      const reference = hydrated.contentReferences.find((entry) =>
        entry.href.startsWith(`/races?race=${slug}&feature=`) && entry.engName.startsWith(name)
      );
      expect(reference, name).toBeDefined();
      expect(reference?.description, name).toBeTruthy();
      expect(reference?.options, name).toBeUndefined();
    }
    expect(hydrated.contentReferences.some((entry) => entry.href.startsWith("/classes?reference=fey%20ancestry"))).toBe(false);
  });
});

describe("здібності класів у гайді Совина", () => {
  it.each([
    ["Armor Model", "/classes?class=artificer&subclass=armorer&feature=armor-model-3", "Лазутчик"],
    ["Unarmored Defense", "/classes?class=barbarian&feature=unarmored-defense-1", "щит"],
  ])("%s відкриває повні правила", async (_name, href, text) => {
    const article = parseArticleDocument(JSON.parse(readFileSync("data/rpgbot/uk/rpgbot-owlin-2014.json", "utf8")));
    const hydrated = await hydrateArticleDocument(article);
    const reference = hydrated.contentReferences.find((entry) => entry.href === href);
    expect(reference).toBeDefined();
    expect(reference?.description).toContain(text);
  });
});
