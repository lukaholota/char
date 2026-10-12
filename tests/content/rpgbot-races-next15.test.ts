import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parseArticleDocument } from "@/lib/optimization/document";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";
import { collectBlockText } from "@/lib/optimization/block-text";
import { findGlossaryMarkers } from "@/lib/refs/glossary-marker";

const slugs = ["reborn", "grung", "gith", "kenku", "custom-lineage", "harengon", "aarakocra", "firbolg", "hadozee", "triton", "hexblood", "dwarf", "orc", "gnome", "goblin"];
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

it("Ancestral Legacy preserves skills and movement; Hadozee Dodge reads the correct rules", async () => {
  const reborn = await hydrate("reborn");
  const legacy = reborn.contentReferences.find((ref) => ref.engName === "Ancestral Legacy");
  expect(legacy?.description).toContain("володіння навичками");
  expect(legacy?.description).toContain("під час створення персонажа");
  const hadozee = await hydrate("hadozee");
  const dodge = hadozee.contentReferences.find((ref) => ref.engName === "Hadozee Resilience");
  expect(dodge?.description).toContain("к6");
  expect(dodge?.description).toContain("реакц");
});

it("old Orc and Kenku rules remain readable beside their MPMM revisions", async () => {
  const orc = await hydrate("orc");
  expect(orc.contentReferences.find((ref) => ref.engName === "Aggressive")?.description).toContain("ближче до ворога");
  expect(orc.contentReferences.find((ref) => ref.engName === "Primal Intuition")?.description).toContain("двома навичками");
  const kenku = await hydrate("kenku");
  expect(kenku.contentReferences.find((ref) => ref.engName === "Kenku Training")?.description).toContain("Спритність рук");
  expect(kenku.contentReferences.some((ref) => ref.engName === "Kenku Recall")).toBe(true);
});

it("Svirfneblin Magic has all four spells and their actual limits", async () => {
  const gnome = await hydrate("gnome");
  const magic = gnome.contentReferences.find((ref) => ref.engName === "Svirfneblin Magic");
  expect(magic?.description).toContain("необмежено");
  expect(magic?.description).toContain("на себе");
  expect(magic?.description).toContain("Blindness/Deafness");
  expect(magic?.description).toContain("Blur");
  expect(magic?.description).toContain("Disguise Self");
  expect(magic?.description).toContain("найнижчому можливому рівні");
});

it("old Kenku speech uses the opposed check rather than the MPMM DC", async () => {
  const kenku = await hydrate("kenku");
  const mimicry = kenku.contentReferences.find((ref) => ref.engName === "Mimicry (Kenku VGTM)");
  expect(mimicry?.description).toContain("протиставленою");
  expect(mimicry?.description).toContain("Харизми (Обман)");
});

it("source-book superscripts retain the actual feature-heading ratings", async () => {
  const expected = { dwarf: { "section-dwarven-fortitude": 1, "section-squat-nimbleness": 2 },
    gnome: { "section-fade-awayxgte": 4, "section-squat-nimblenessxgte": 2, "section-svirfneblin-magiceepc-scag": 2 } };
  for (const [slug, sections] of Object.entries(expected)) {
    const article = await hydrate(slug);
    for (const [sectionId, score] of Object.entries(sections)) {
      expect(article.ratings.find((rating) => rating.sectionId === sectionId)?.score).toBe(score);
    }
  }
});
