import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { getAllClasses } from "@/lib/classesData";
import { parseArticleDocument } from "@/lib/optimization/document";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";
import { collectEntityReferences } from "@/lib/optimization/entity-hydration";
import nativeSupplements from "@/lib/generated/optimization-feature-descriptions-2014.json";
import { getAllBackgrounds } from "@/lib/backgroundsData";

async function readGuide(slug: string) {
  return hydrateArticleDocument(parseArticleDocument(JSON.parse(readFileSync(`data/rpgbot/uk/rpgbot-${slug}-2014.json`, "utf8"))));
}

function findNativeFeature(original: string) {
  return getAllClasses("RULES_2014").flatMap((characterClass) => characterClass.subclasses.flatMap((subclass) => subclass.features))
    .find((feature) => feature.engName === original) ?? nativeSupplements.find((feature) => feature.engName === original)!;
}

it("Researcher retains its complete native Sage feature including the adventure and campaign limitation", () => {
  const sage = getAllBackgrounds("RULES_2014").find((entry) => entry.engName === "Sage")!;
  const source = readFileSync("prisma/seed/backgroundSeed.ts", "utf8");
  expect(sage.description).toContain("де й від кого можна її отримати");
  expect(sage.description).toContain("їх узагалі неможливо знайти");
  expect(sage.description).toContain("пригоди або навіть цілої кампанії");
  expect(sage.description).toContain("мультивсесвіту");
  expect(source).toContain(sage.description!);
  expect(sage.description).not.toMatch(/\bDM\b/);
});

it("all four Master Transmuter effects open the full native feature with its shared cost", async () => {
  const article = await readGuide("wizard-transmutation");
  const reference = article.contentReferences.find((entry) => entry.engName === "Master Transmuter");
  expect(reference?.description).toBe(findNativeFeature("Master Transmuter").description);
  expect(reference?.description).toContain("Ваш камінь трансмутатора знищується");
  expect(reference?.description).toContain("доки ви не завершите тривалий відпочинок");
  expect(reference?.description).toContain("3к10");
  for (const original of ["Велика трансформація", "Панацея", "Повернення до життя", "Повернення молодості"]) {
    const effectLinks = article.translations.at(-1)!.sections.flatMap((section) => section.blocks)
      .filter((block) => block.type === "list").flatMap((block) => block.items.flat())
      .filter((node) => node.type === "link" && node.text.includes(original));
    expect(effectLinks.length, original).toBeGreaterThan(0);
    expect(effectLinks.every((node) => node.type === "link" && node.href === reference?.href), original).toBe(true);
  }
});

it("a singular Eldritch Invocation opens the native acquisition and replacement rules", async () => {
  const article = await readGuide("warlock-archfey");
  const reference = article.contentReferences.find((entry) => entry.engName === "Eldritch Invocations");
  const native = getAllClasses("RULES_2014").flatMap((characterClass) => characterClass.features)
    .find((feature) => feature.engName === "Eldritch Invocations")!;
  expect(reference?.description).toBe(native.description);
  expect(reference?.description).toContain("два потойбічні виклики");
  expect(reference?.description).toContain("замінити його іншим викликом");
  expect(JSON.stringify(article.translations)).not.toContain("|Eldritch Invocation}}");
});

it.each([
  ["artificer-infusions", "Thunder Gauntlets", "1к8"],
  ["bugbear-y-me-in-damage", "Lightning Launcher", "300 футів"],
])("%s weapon component opens Armor Model with attack and rest rules", async (slug, original, mechanics) => {
  const article = await readGuide(slug);
  const reference = article.contentReferences.find((entry) => entry.engName === "Armor Model");
  expect(reference?.description).toBe(findNativeFeature("Armor Model").description);
  expect(reference?.description).toContain(mechanics);
  expect(reference?.description).toContain("модифікатор Інтелекту");
  expect(reference?.description).toContain("короткий або довгий відпочинок");
  expect(JSON.stringify(article.translations)).not.toContain(`|${original}}}`);
});

it("the Soulknife Psychic Energy Dice spelling opens its d6 pool rather than Psi Warrior d6 rules", async () => {
  const article = await readGuide("rogue-soulknife");
  const reference = article.contentReferences.find((entry) => entry.engName === "Psionic Power (Soulknife)");
  expect(reference?.description).toBe(findNativeFeature("Psionic Power (Soulknife)").description);
  expect(reference?.description).toContain("подвоєному вашому бонусу майстерності");
  expect(reference?.description).toContain("короткий або довгий відпочинок");
  expect(reference?.description).toContain("на 17-му — до к12");
  expect(JSON.stringify(article.translations)).not.toContain("|Psychic Energy Dice}}");
  expect(reference?.href).toContain("soulknife");
});

it("Hit Die and Hit Dice open full resting rules including spending and recovery", async () => {
  const article = await readGuide("artificer-subclasses");
  const reference = article.contentReferences.find((entry) => entry.href === "/rules/adventuring#resting");
  const native = collectEntityReferences("RULES_2014").find((entry) => entry.href === "/rules/adventuring#resting")!;
  expect(reference?.description).toBe(native.description);
  expect(reference?.description).toContain("додає модифікатор Статури");
  expect(reference?.description).toContain("до половини їх загальної кількості");
  expect(reference?.description).toContain("щонайменше один кубик");
  expect(JSON.stringify(article.translations)).not.toMatch(/\|Hit Dice?}}/);
});

it("Poisoner Feat Poison opens the complete native feat and its preparation rules", async () => {
  const article = await readGuide("poisoner-poison-and-poisoning");
  const native = collectEntityReferences("RULES_2014").find((entry) => entry.engName === "Poisoner")!;
  const reference = article.contentReferences.find((entry) => entry.href === native.href);
  expect(reference?.description).toBe(native.description);
  expect(reference?.description).toContain("2к8");
  expect(reference?.description).toContain("50");
  expect(JSON.stringify(article.translations)).not.toContain("|Poisoner Feat Poison}}");
});

it.each([
  ["oversized-weapons", "Genie’s Vessel", ["Bottled Respite", "Genie's Wrath"]],
  ["monk-kensei", "Path of the Kensei", ["Kensei’s Shot"]],
  ["rogue-subclasses", "Tokens of the Departed", ["Soul Trinkets"]],
  ["rogue-phantom", "Wails from the Grave", ["Wail of Souls"]],
  ["warlock-great-old-one", "Awakened Mind", ["Telepathic Link"]],
  ["wizard-enchantment", "Instinctive Charm", ["Instinctive Enchantment"]],
  ["ranger", "Colossus Slayer (Hunter)", ["Hunter’s Prey: Colossus Slayer"]],
  ["paladin-oath-of-the-crown", "Channel Divinity: Champion Challenge", ["Champion's Challenge"]],
  ["druid-circle-of-stars", "Cosmic Omen", ["Weal", "Woe"]],
  ["barbarian-storm-herald", "Storm Aura", ["Environment Choices"]],
  ["wizard-conjuration", "Minor Conjuration", ["Conjuration Creation"]],
  ["fighter-samurai", "Kobold Legacy", ["Defiance", "Draconic Sorcery"]],
  ["bard-spirits", "Tales from Beyond", ["Tale of the Brute"]],
  ["warlock-celestial", "Radiant Soul (Celestial)", ["Celestial Radiance"]],
])("%s named components retain their complete native parent rules", async (slug, parent, originals) => {
  const article = await readGuide(slug);
  const reference = article.contentReferences.flatMap((entry) => entry.options ?? [entry]).find((entry) => entry.engName === parent);
  expect(reference?.description, parent).toBe(findNativeFeature(parent).description);
  for (const original of originals) expect(JSON.stringify(article.translations), original).not.toContain(`|${original}}}`);
});

it("Researcher opens the native Sage background feature", async () => {
  const article = await readGuide("cleric-knowledge-domain");
  const native = collectEntityReferences("RULES_2014").find((entry) => entry.engName === "Sage")!;
  const reference = article.contentReferences.find((entry) => entry.href === native.href);
  expect(reference?.description).toBe(native.description);
  expect(reference?.description).toContain("в бібліотеці");
  expect(JSON.stringify(article.translations)).not.toContain("|Researcher}}");
});

it("documents the inferred Minor Image correction and opens Silent Image rather than the cantrip", async () => {
  const article = await readGuide("wizard-illusion");
  const block = article.translations[0].sections.flatMap((section) => section.blocks)
    .flatMap((entry) => entry.type === "list" ? entry.items : [entry])
    .find((entry) => JSON.stringify(entry).includes("Редакторська примітка: автор двічі пише Minor Image"));
  expect(block).toBeDefined();
  const text = JSON.stringify(block);
  expect(text).toContain("редакторський висновок");
  expect(text).toContain("/spells/silent-image");
  expect(text).not.toContain("/spells/minor-illusion");
  const worksheet = readFileSync("data/rpgbot/authoring/wizard-illusion-2014.md", "utf8");
  expect(worksheet).toContain("Most illusion spells which create an ongoing illusory effect (Minor Image,");
  expect(worksheet).toContain("Редакторська примітка: автор двічі пише Minor Image");
});
