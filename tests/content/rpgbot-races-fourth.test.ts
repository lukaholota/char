import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parseArticleDocument } from "@/lib/optimization/document";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";
import { collectBlockText } from "@/lib/optimization/block-text";
import { findGlossaryMarkers } from "@/lib/refs/glossary-marker";

it.each(["tortle", "kalashtar", "verdan"])("%s має читабельні описи всіх згаданих здібностей", async (slug) => {
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


it("черепаха відкриває повні правила Захисту без обладунків Монаха", async () => {
  const document = parseArticleDocument(JSON.parse(readFileSync("data/rpgbot/uk/rpgbot-tortle-2014.json", "utf8")));
  const hydrated = await hydrateArticleDocument(document);
  const feature = hydrated.contentReferences.find((reference) => reference.href === "/classes?class=monk&feature=unarmored-defense-monk-1");
  expect(feature?.description).toContain("не носите жодних обладунків і не тримаєте щит");
});

it("затримка дихання черепахи відповідає годині з MPMM", async () => {
  const source = JSON.parse(readFileSync("tests/fixtures/5etools/raw-slices/races.json", "utf8"));
  const race = source.race.find((entry: { name?: string; source?: string }) => entry.name === "Tortle" && entry.source === "MPMM");
  const original = race.entries.find((entry: { name?: string }) => entry.name === "Hold Breath");
  expect(original.entries).toEqual(["You can hold your breath for up to 1 hour."]);
  const document = parseArticleDocument(JSON.parse(readFileSync("data/rpgbot/uk/rpgbot-tortle-2014.json", "utf8")));
  const hydrated = await hydrateArticleDocument(document);
  const feature = hydrated.contentReferences.find((reference) => reference.href === "/races?race=tortle&feature=hold-breath-tortle");
  expect(feature?.description).toContain("1 години");
  expect(feature?.description).not.toContain("15 хвилин");
});

it("Natural Armor відкриває українські правила панцира черепахи", async () => {
  const document = parseArticleDocument(JSON.parse(readFileSync("data/rpgbot/uk/rpgbot-tortle-2014.json", "utf8")));
  const hydrated = await hydrateArticleDocument(document);
  const feature = hydrated.contentReferences.find((reference) => reference.href === "/races?race=tortle&feature=shell-armor");
  expect(feature?.description).toContain("базовий КБ 17");
  expect(feature?.description).toContain("Ви не можете носити легкий, середній або важкий обладунок");
});
