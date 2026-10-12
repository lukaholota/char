import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parseArticleDocument } from "@/lib/optimization/document";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";
import { collectBlockText } from "@/lib/optimization/block-text";
import { findGlossaryMarkers } from "@/lib/refs/glossary-marker";

it.each(["half-orc", "leonin", "goliath"])("%s має читабельні описи всіх згаданих здібностей", async (slug) => {
  const document = parseArticleDocument(JSON.parse(readFileSync(`data/rpgbot/uk/rpgbot-${slug}-2014.json`, "utf8")));
  const hydrated = await hydrateArticleDocument(document);
  const markers = hydrated.translations.flatMap((revision) => revision.sections.flatMap((section) =>
    section.blocks.flatMap(collectBlockText).flatMap(findGlossaryMarkers)
  ));
  expect(markers.every((marker) => marker.original === "Unearthed Arcana")).toBe(true);
  for (const reference of hydrated.contentReferences) {
    if (reference.options) expect(reference.options.every((option) => !!option.description)).toBe(true);
    else expect(reference.description || reference.details.length).toBeTruthy();
  }
});

it("голіаф розрізняє відновлення Stone’s Endurance у VGM та MPMM", async () => {
  const document = parseArticleDocument(JSON.parse(readFileSync("data/rpgbot/uk/rpgbot-goliath-2014.json", "utf8")));
  const hydrated = await hydrateArticleDocument(document);
  const legacy = hydrated.contentReferences.find((reference) => reference.engName === "Stone's Endurance (VGM)");
  const modern = hydrated.contentReferences.find((reference) => reference.href === "/races?race=goliath&feature=stones-endurance");
  expect(legacy?.description).toContain("короткий або тривалий відпочинок");
  expect(legacy?.description).not.toContain("Бонус Майстерності");
  expect(modern?.description).toContain("Бонус Майстерності");
  expect(modern?.description).toContain("довгий відпочинок");
  const defaultSections = hydrated.translations[0].sections.filter((section) => /section-(?:barbarian|fighter|paladin|ranger)-2/.test(section.sectionId));
  expect(defaultSections).toHaveLength(4);
  for (const section of defaultSections) {
    expect(JSON.stringify(section.blocks)).toContain(legacy?.href);
    expect(JSON.stringify(section.blocks)).not.toContain(modern?.href);
  }
});

it("Мітка Пошуку містить повний expanded список Eberron", async () => {
  const source = JSON.parse(readFileSync("tests/fixtures/5etools/raw-slices/races.json", "utf8"));
  const mark = source.subrace.find((entry: { name?: string; raceName?: string; source?: string }) =>
    entry.name === "Variant; Mark of Finding" && entry.raceName === "Half-Orc" && entry.source === "ERLW"
  );
  const names = Object.values(mark.additionalSpells[0].expanded).flat() as string[];
  expect(names).toHaveLength(9);
  const document = parseArticleDocument(JSON.parse(readFileSync("data/rpgbot/uk/rpgbot-half-orc-2014.json", "utf8")));
  const hydrated = await hydrateArticleDocument(document);
  const reference = hydrated.contentReferences.find((entry) => entry.engName === "Half-Orc (Mark of Finding)");
  const spellLinks = [...reference!.description!.matchAll(/href="\/spells\/([^"]+)"/g)].map((match) => match[1]);
  expect(spellLinks.sort()).toEqual(names.map((name) => name.replace(/[^a-z0-9]+/g, "-")).sort());
  expect(reference?.description).toContain("додаються до списку заклинань вашого класу");
});
