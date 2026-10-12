import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parseArticleDocument } from "@/lib/optimization/document";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";
import { getAllSpells } from "@/lib/spellsData";
import { buildSpellHref, buildSpellSlug } from "@/lib/spell-link";

function expectLinkedSpell(description: string | undefined, engName: string) {
  const spell = getAllSpells("RULES_2014").find((entry) => entry.engName.toLowerCase() === engName.toLowerCase());
  expect(spell, engName).toBeDefined();
  const href = buildSpellHref({ spellKey: buildSpellSlug(spell!.engName), ruleset: "RULES_2014" });
  const name = spell!.name.replace(/\s*\[[^\]]+\]$/, "");
  const links = [...(description ?? "").matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)];
  expect(links.some((link) => link[1] === href && link[2].replace(/\s*\[[^\]]+\]$/, "") === name), engName).toBe(true);
}

async function readHydratedGuide(slug: string) {
  const document = parseArticleDocument(JSON.parse(readFileSync(`data/rpgbot/uk/rpgbot-${slug}-2014.json`, "utf8")));
  return hydrateArticleDocument(document);
}

it("MPMM Shifting uses proficiency-based HP and long-rest uses", async () => {
  const article = await readHydratedGuide("shifter");
  const shifting = article.contentReferences.flatMap((reference) => reference.options ?? [reference]).find((reference) => reference.engName === "Shifting");
  expect(shifting?.description).toContain("2 × ваш Бонус Майстерності");
  expect(shifting?.description).toContain("тривалого відпочинку");
  expect(shifting?.description).not.toContain("короткий");
});

it("MPMM Longtooth includes the bite on transformation and Wildhunt checks incapacitation", async () => {
  const article = await readHydratedGuide("shifter");
  expect(article.contentReferences.find((reference) => reference.engName === "Shifting: Longtooth")?.description).toContain("Коли ви використовуєте Shifting");
  expect(article.contentReferences.find((reference) => reference.engName === "Shifting: Wildhunt")?.description).toContain("Недієздатні");
});

it("Hammering Horns requires a bonus action and a target within five feet", async () => {
  const article = await readHydratedGuide("minotaur");
  const horns = article.contentReferences.find((reference) => reference.engName === "Hammering Horns");
  expect(horns?.description).toContain("бонусну дію");
  expect(horns?.description).toContain("5 футів");
});

it("Use an Object opens its existing Ukrainian rule card even without a dictionary entry", async () => {
  const article = await readHydratedGuide("thri-kreen");
  const paragraphs = article.translations.flatMap((revision) => revision.sections.flatMap((section) => section.blocks));
  expect(JSON.stringify(paragraphs)).toContain("/rules/combat#actions-in-combat--use-an-object");
  expect(JSON.stringify(paragraphs)).not.toContain("Use an Object{{Use an Object}}");
});

it.each([
  ["Healing", ["Cure Wounds", "Healing Word", "Lesser Restoration", "Prayer of Healing", "Aura of Vitality", "Mass Healing Word", "Aura of Purity", "Aura of Life", "Greater Restoration"]],
  ["Hospitality", ["Goodberry", "Sleep", "Aid", "Calm Emotions", "Create Food and Water", "Leomund's Tiny Hut", "Aura of Purity", "Mordenkainen's Private Sanctum", "Hallow"]],
] as const)("%s dragonmark retains its complete level-one-through-five spell list", async (mark, spells) => {
  const article = await readHydratedGuide("halfling");
  const reference = article.contentReferences.flatMap((entry) => entry.options ?? [entry]).find((entry) => entry.engName === `Spells of the Mark (${mark})`);
  for (const spell of spells) expectLinkedSpell(reference?.description, spell);
});

it("an explicitly qualified shield opens equipment instead of colliding with the spell", async () => {
  const article = await readHydratedGuide("dhampir");
  expect(article.contentReferences.find((reference) => reference.kind === "armor" && reference.engName === "Shield")?.href).toBe("/armor/shield");
  expect(JSON.stringify(article.translations)).not.toContain("Shield (armor)");
});

it("Rune Shaper opens the complete thirteen-rune list with the correct rune limit", async () => {
  const article = await readHydratedGuide("glory-of-the-giants-backgrounds-and-feats");
  const description = article.contentReferences.find((reference) => reference.engName === "Rune Shaper")?.description;
  expect(description).toContain("половині вашого Бонусу Майстерності");
  for (const spell of ["Fog Cloud", "Armor of Agathys", "Sanctuary", "Thunderwave"]) expectLinkedSpell(description, spell);
});

it("Squire of Solamnia preserves mounted movement and hit-dependent expenditure", async () => {
  const article = await readHydratedGuide("dragonlance-backgrounds-and-feats");
  const description = article.contentReferences.find((reference) => reference.engName === "Squire of Solamnia")?.description;
  expect(description).toContain("5 футів переміщення");
  expect(description).toContain("лише якщо атака влучає");
  expect(description).not.toContain("Володіння середніми");
});

it("Rune Knight runes open Rune Carver instead of the Bigby Rune Shaper feat", async () => {
  const article = await readHydratedGuide("oversized-weapons");
  const blocks = article.translations.at(-1)!.sections.flatMap((section) => section.blocks);
  expect(JSON.stringify(blocks)).not.toContain("Fire Rune (Rune Knight)");
  expect(article.contentReferences.find((reference) => reference.engName === "Rune Carver")?.description).toContain("руни");
});

it.each([
  ["Detection", ["Detect evil and good", "Detect Poison and Disease", "Detect Thoughts", "Find Traps", "Clairvoyance", "Nondetection", "Arcane eye", "Divination", "Legend Lore"]],
  ["Storm", ["Feather Fall", "Fog Cloud", "Gust of Wind", "Levitate", "Sleet Storm", "Wind Wall", "Conjure Minor Elementals", "Control Water", "Conjure Elemental"]],
] as const)("%s half-elf dragonmark opens its full expanded spell list", async (mark, spells) => {
  const article = await readHydratedGuide("half-elf");
  const reference = article.contentReferences.flatMap((entry) => entry.options ?? [entry]).find((entry) => entry.engName === `Spells of the Mark (${mark})`);
  for (const spell of spells) expectLinkedSpell(reference?.description, spell);
});

it("Magical Detection describes Wisdom casting, three spells and no material components", async () => {
  const article = await readHydratedGuide("half-elf");
  const description = article.contentReferences.find((entry) => entry.engName === "Magical Detection")?.description;
  expectLinkedSpell(description, "Detect Poison and Disease");
  expectLinkedSpell(description, "See Invisibility");
  expect(description).toContain("Мудрість");
  expect(description).toContain("матеріальні компоненти");
  expect(description).not.toContain('/spells/detect-thoughts');
});

it("MPMM Aasimar Healing Hands rolls proficiency-count d4s instead of healing flat proficiency", async () => {
  const article = await readHydratedGuide("aasimar");
  const reference = article.contentReferences.flatMap((entry) => entry.options ?? [entry]).find((entry) => entry.engName === "Healing Hands");
  expect(reference?.description).toContain("кількість к4");
  expect(reference?.description).toContain("тривалого відпочинку");
});

it("Aasimar article keeps Volo action/level damage separate from MPMM bonus-action/proficiency damage", async () => {
  const article = await readHydratedGuide("aasimar");
  const modern = article.contentReferences.find((entry) => entry.engName === "Celestial Revelation")?.description;
  expect(modern).toContain("бонусною дією");
  expect(modern).toContain("Бонусу Майстерності");
  expect(modern).toContain("швидкості ходьби");
  const original = article.contentReferences.find((entry) => entry.engName === "Radiant Soul (VGM)")?.description;
  expect(original).toContain("можете дією");
  expect(original).toContain("рівню персонажа");
  expect(original).toContain("30 футів");
});

it("Winged Tiefling permits medium armor and Mammon retains separate recharge/component rules", async () => {
  const article = await readHydratedGuide("tiefling");
  const references = article.contentReferences.flatMap((entry) => entry.options ?? [entry]);
  const winged = references.find((entry) => entry.engName === "Tiefling (Winged)")?.description;
  expect(winged).toContain("важк");
  expect(winged).not.toContain("середні або важкі");
  const mammon = references.find((entry) => entry.engName === "Tiefling (Mammon)")?.description;
  expect(mammon).toContain("короткого або тривалого");
  expect(mammon).toContain("матеріальн");
});

it("Fizban wards self with immunity and metallic breath offers incapacitation or a push", async () => {
  const article = await readHydratedGuide("dragonborn");
  const warding = article.contentReferences.find((entry) => entry.engName === "Chromatic Warding")?.description;
  expect(warding).toContain("імунітет");
  expect(warding).not.toContain("союзники");
  const metallic = article.contentReferences.find((entry) => entry.engName === "Metallic Breath Weapon")?.description;
  expect(metallic).toContain("Недієздатн");
  expect(metallic).toContain("20 футів");
  expect(metallic).not.toContain("параліз");
});

it("Fizban Gem Flight follows walking speed and permits hovering", async () => {
  const article = await readHydratedGuide("dragonborn");
  const description = article.contentReferences.find((entry) => entry.engName === "Gem Flight")?.description;
  expect(description).toContain("швидкості ходьби");
  expect(description).toContain("зависати");
});

it("classic Dragonborn breath keeps PHB dice progression, saves and short-rest recharge", async () => {
  const article = await readHydratedGuide("dragonborn");
  const description = article.contentReferences.find((entry) => entry.engName === "Breath Weapon (PHB)")?.description;
  expect(description).toContain("2к6");
  expect(description).toContain("5к6 на 16-му");
  expect(description).toContain("короткого або тривалого");
  expect(description).toContain("Silver — холодова шкода; конус 15 футів; ряткидок Статури");
});

function readRaceTrait(engName: string) {
  const races = JSON.parse(readFileSync("src/lib/generated/races.json", "utf8"));
  return races.filter((race: { ruleset: string }) => race.ruleset === "RULES_2014")
    .flatMap((race: { subraces?: unknown[]; variants?: unknown[] }) => [race, ...(race.subraces ?? []), ...(race.variants ?? [])])
    .flatMap((race: { traits?: { engName: string; description: string }[] }) => race.traits ?? [])
    .find((trait: { engName: string }) => trait.engName === engName)?.description as string | undefined;
}

it("Mark of Shadow expands Darkness at spell level two, rather than Invisibility", () => {
  const description = readRaceTrait("Spells of the Mark (Shadow)");
  expect(description).toContain("Darkness");
  expect(description).not.toMatch(/\[Invisibility\]/);
  expect(description).toContain("5-й рівень");
});

it("Pallid moon spells use Wisdom, require no materials and limit Invisibility to self", () => {
  const description = readRaceTrait("Blessing of the Moon Weaver");
  expect(description).toContain("Мудрість");
  expect(description).toContain("лише на себе");
  expect(description).toContain("матеріальних компонентів");
  expect(readRaceTrait("Incisive Sense")).toContain("Інтелекту (Розслідування)");
});
