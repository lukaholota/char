import { expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { collectContextualReferenceAliases } from "@/lib/optimization/contextual-reference-aliases";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";
import { parseArticleDocument } from "@/lib/optimization/document";
import type { HydrationTarget } from "@/lib/optimization/content-hydration";

// Each test links a whole RPGbot article (several seconds); under a full parallel run that crosses the default 15 s.
vi.setConfig({ testTimeout: 60_000 });

it("keeps race form aliases within the verified article and rejects conflicting native parents", () => {
  const parent: HydrationTarget = { name: "Ґенасі", engName: "Genasi (Air)", kind: "race", href: "/races?race=genasi-air" };
  const article = { slug: "artificer-races-2014", ruleset: "RULES_2014" as const };
  expect(collectContextualReferenceAliases(article, [parent])).toEqual(expect.arrayContaining([expect.objectContaining({ engName: "Air", href: parent.href, markerOnly: true })]));
  expect(collectContextualReferenceAliases({ ...article, slug: "summoning-2014" }, [parent])).toEqual([]);
  expect(collectContextualReferenceAliases({ ...article, ruleset: "RULES_2024" }, [parent])).toEqual([]);
  expect(collectContextualReferenceAliases(article, [parent, { ...parent, href: "/races?race=conflicting-air" }])).toEqual([]);
});

it.each([
  ["druid-circle-of-stars-2014", "Starry Form", "starry-form-2", "Кубок"],
  ["bard-2014", "Blade Flourish", "blade-flourish-3", "Розчерк"],
  ["wizard-abjuration-2014", "Aberrant Spirit", "/bestiary?creature=aberrant-spirit", ""],
  ["bard-glamour-2014", "Mantle of Inspiration", "mantle-of-inspiration-3", ""],
  ["bard-eloquence-2014", "Bardic Inspiration", "bardic-inspiration-1", ""],
  ["sorcerer-lunar-sorcery-2014", "Rune Shaper", "/feats?", ""],
  ["monk-way-of-mercy-2014", "Half-Elf (Wood Elf Descent)", "/races?reference=half-elf-wood-elf-descent", ""],
])("hydrates the precise existing full native body in %s", async (slug, original, href, body) => {
  const document = parseArticleDocument(JSON.parse(await readFile(`data/rpgbot/uk/rpgbot-${slug}.json`, "utf8")));
  const hydrated = await hydrateArticleDocument(document);
  const reference = hydrated.contentReferences.find((entry) => entry.engName === original && entry.href.includes(href));
  expect(reference, original).toBeDefined();
  expect(reference!.description.length).toBeGreaterThan(100);
  if (body) expect(reference!.description).toContain(body);
});

it("opens both Dispel Evil and Good action components through the full native spell", async () => {
  const document = parseArticleDocument(JSON.parse(await readFile("data/rpgbot/uk/rpgbot-cleric-spells-2014.json", "utf8")));
  const hydrated = await hydrateArticleDocument(document);
  const texts = JSON.stringify(hydrated.translations);
  expect(texts).not.toContain("{{Break Enchantment}}");
  expect(texts).not.toContain("{{Dismissal}}");
  expect(texts).toContain("dispel-evil-and-good");
});

it("offers both 2014 Fallen rules versions instead of choosing Volo for a Multiverse row", async () => {
  const document = parseArticleDocument(JSON.parse(await readFile("data/rpgbot/uk/rpgbot-artificer-races-2014.json", "utf8")));
  const hydrated = await hydrateArticleDocument(document);
  const reference = hydrated.contentReferences.find((entry) => entry.engName.toLowerCase() === "fallen" && entry.options);
  expect(reference?.options?.map((option) => option.engName)).toEqual(expect.arrayContaining(["Fallen Aasimar", "Celestial Revelation"]));
  expect(reference?.options?.length).toBe(2);
  for (const option of reference!.options!) expect(option.description.length).toBeGreaterThan(500);
});
