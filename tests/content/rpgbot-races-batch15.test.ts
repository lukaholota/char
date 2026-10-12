import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parseArticleDocument } from "@/lib/optimization/document";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";
import { collectBlockText } from "@/lib/optimization/block-text";
import { findGlossaryMarkers } from "@/lib/refs/glossary-marker";
import { readRaceFeatureSeedInputs } from "../../prisma/seed/raceFeatureSeed";

const slugs = ["githyanki", "deep-gnome", "kender", "loxodon", "shadar-kai", "githzerai", "eladrin", "duergar", "autognome", "fairy", "vedalken", "simic-hybrid", "warforged", "changeling", "locathah"];
const proseOriginals = new Set(["Unearthed Arcana", "Svirfneblin", "Krynn", "Shadowfell", "Feywild", "mind flayer"]);

async function hydrate(slug: string) {
  return hydrateArticleDocument(parseArticleDocument(JSON.parse(readFileSync(`data/rpgbot/uk/rpgbot-${slug}-2014.json`, "utf8"))));
}

it.each(slugs)("%s має повні модалки всіх згаданих здібностей 2014", async (slug) => {
  const article = await hydrate(slug);
  const markers = article.translations.flatMap((revision) => revision.sections.flatMap((section) => section.blocks.flatMap(collectBlockText).flatMap(findGlossaryMarkers)));
  expect(markers.filter((marker) => !proseOriginals.has(marker.original))).toEqual([]);
  for (const reference of article.contentReferences) {
    if (reference.options) expect(reference.options.every((option) => !!option.description)).toBe(true);
    else expect(reference.description || reference.details.length).toBeTruthy();
  }
  expect(article.ratings.every((rating) => !!rating.context)).toBe(true);
});

it.each(["eladrin", "shadar-kai"])("%s відкриває Транс MPMM з тимчасовими володіннями", async (slug) => {
  const article = await hydrate(slug);
  const trance = article.contentReferences.find((ref) => ref.engName.startsWith("Trance ("));
  expect(trance?.description).toContain("два володіння");
  expect(trance?.description).toContain("4 години");
  expect(trance?.description).toContain("наступного тривалого відпочинку");
  const ancestry = article.contentReferences.find((ref) => ref.engName === "Fey Ancestry (MPMM)");
  expect(ancestry?.description).toContain("припинення стану зачарування");
  expect(ancestry?.description).not.toContain("приспати");
  if (slug === "eladrin") expect(trance?.description).toContain("змінити свою пору року");
});

it("усі шість модифікацій симічного гібрида відкривають повні умови вибору", async () => {
  const article = await hydrate("simic-hybrid");
  const enhancement = article.contentReferences.find((ref) => ref.engName === "Animal Enhancements");
  for (const name of ["Manta Glide", "Nimble Climber", "Underwater Adaptation", "Acid Spit", "Carapace", "Grappling Appendages"]) expect(enhancement?.description).toContain(name);
  expect(enhancement?.description).toContain("якого ще не маєте");
  expect(enhancement?.description).toContain("мінімум один раз");
  expect(enhancement?.description).toContain("100 футів");
});

it("Astral Knowledge дає зброю або інструмент; Mental Discipline не захищає від читання думок", () => {
  const features = readRaceFeatureSeedInputs();
  expect(features.find((f) => f.engName === "Astral Knowledge")?.description).toContain("зброєю або інструментом");
  const mental = features.find((f) => f.engName === "Mental Discipline")?.description;
  expect(mental).toContain("зачарування та переляку");
  expect(mental).not.toContain("думки");
});


it("помилкова Diamond Body в аналізі ряткидків відкриває Diamond Soul", async () => {
  const article = await hydrate("deep-gnome");
  const section = article.translations.at(-1)!.sections.find((entry) => entry.sectionId === "section-monk");
  const nodes = section!.blocks.flatMap((block) => block.type === "paragraph" ? block.content : []);
  const link = nodes.find((node) => node.type === "link" && node.text === "Алмазна душа");
  expect(nodes.map((node) => node.text).join("")).toContain("а не Diamond Body на 13-му");
  expect(link).toBeTruthy();
  if (!link || link.type !== "link") throw new Error("Missing Ukrainian Diamond Soul link");
  expect(article.contentReferences.find((ref) => ref.href === link.href)?.engName).toBe("Diamond Soul");
});
