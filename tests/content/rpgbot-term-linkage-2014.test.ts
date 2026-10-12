import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectContextualReferenceAliases } from "@/lib/optimization/contextual-reference-aliases";
import { collectRareReferenceAliases } from "@/lib/optimization/rare-reference-aliases";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";
import { parseArticleDocument } from "@/lib/optimization/document";
import ruleTermCards from "@/lib/generated/rule-term-cards.json";

const sorcererAncestry = { name: "Дракон-предок", engName: "Draconic Ancestry", href: "/classes?class=sorcerer&subclass=draconic-bloodline&feature=draconic-ancestry-1" };
const dragonbornAncestry = { name: "Драконічний предок", engName: "Draconic Ancestry", href: "/races?race=dragonborn&feature=draconic-ancestry" };
const auraImprovements = { name: "Покращення Аур", engName: "Aura Improvements", href: "/classes?class=paladin&feature=aura-improvements-18" };
const kenderAptitude = { name: "Кендерська майстерність", engName: "Kender Aptitude", href: "/races?race=kender&feature=kender-aptitude" };
const firearmsMastery = { name: "Майстерність вогнепальної зброї", engName: "Firearms Mastery", href: "/races?race=giff&feature=firearms-mastery" };

function readHydratedText(slug: string) {
  const document = parseArticleDocument(JSON.parse(readFileSync(`data/rpgbot/uk/rpgbot-${slug}.json`, "utf8")));
  return hydrateArticleDocument(document).then((hydrated) => JSON.stringify(hydrated.translations));
}

describe("scoped aliases for names the authors wrote differently", () => {
  it("routes Dragon Ancestor only to the Sorcerer Draconic Bloodline feature", () => {
    expect(collectRareReferenceAliases([sorcererAncestry]).map((entry) => entry.engName)).toContain("Dragon Ancestor");
    expect(collectRareReferenceAliases([dragonbornAncestry]).map((entry) => entry.engName)).not.toContain("Dragon Ancestor");
  });

  it("routes Aura Improvement to the Paladin level 18 feature", () => {
    const alias = collectRareReferenceAliases([auraImprovements]).find((entry) => entry.engName === "Aura Improvement");
    expect(alias?.href).toBe(auraImprovements.href);
  });

  it.each([
    ["races-2014", kenderAptitude, "Kender Curiosity"],
    ["monk-astral-self-2014", firearmsMastery, "Firearm Proficiency"],
  ])("keeps the %s alias inside its own article", (slug, parent, original) => {
    const article = { slug, ruleset: "RULES_2014" as const };
    expect(collectContextualReferenceAliases(article, [{ ...parent, kind: "feature" }])).toEqual([expect.objectContaining({ engName: original, href: parent.href, markerOnly: true })]);
    expect(collectContextualReferenceAliases({ ...article, slug: "fighter-2014" }, [parent])).toEqual([]);
    expect(collectContextualReferenceAliases({ ...article, ruleset: "RULES_2024" }, [parent])).toEqual([]);
  });
});

describe("PHB rules that already have a Ukrainian card", () => {
  it.each([
    ["Hit Points", "Хіти", "Хіти передають поєднання фізичної та душевної витривалості"],
    ["Rolling 1 or 20", "Викинуті 1 і 20", "випала 1, атака промахується"],
    ["Downtime Activities", "Діяльність у міжчасі", "в міжчассі"],
    ["Artisan's Tools", "Інструменти ремісника", "потребує окремого володіння"],
    ["Material (M)", "Матеріальний (М)", "чаротворчим фокусом"],
  ])("opens %s on the matching rule section", (original, title, fact) => {
    const card = ruleTermCards.RULES_2014[original as keyof typeof ruleTermCards.RULES_2014] as { article: { subsection: { title: string; content: string } } };
    expect(card.article.subsection.title).toBe(title);
    expect(card.article.subsection.content).toContain(fact);
  });

  it("no longer sends the Hit Points label of a class to a magic item", async () => {
    expect(await readHydratedText("barbarian-2014")).not.toContain("/magic-items/1004");
  }, 60_000);

  it("keeps the Ranger Spellcasting Focus feature apart from the Material (M) rule", async () => {
    const text = await readHydratedText("ranger-2014");
    expect(text).not.toContain("|Spellcasting Focus}}");
    expect(text).not.toContain("|Spellcasting Focus (Addition)}}");
  }, 60_000);

  it("keeps Natural 1 and Elemental Disciplines scoped to their own articles", () => {
    const rolling = { name: "Викинуті 1 і 20", engName: "Rolling 1 or 20", href: "/rules/combat#making-an-attack--attack-rolls--rolling-1-or-20" };
    const disciple = { name: "Учень стихій", engName: "Disciple of the Elements", href: "/classes?class=monk&subclass=way-of-the-four-elements&feature=disciple-of-the-elements" };
    expect(collectContextualReferenceAliases({ slug: "warlock-celestial-2014", ruleset: "RULES_2014" }, [rolling]).map((entry) => entry.engName)).toEqual(["Natural 1"]);
    expect(collectContextualReferenceAliases({ slug: "monk-2014", ruleset: "RULES_2014" }, [rolling])).toEqual([]);
    expect(collectContextualReferenceAliases({ slug: "monk-four-elements-2014", ruleset: "RULES_2014" }, [disciple]).map((entry) => entry.engName)).toEqual(["Elemental Disciplines"]);
    expect(collectContextualReferenceAliases({ slug: "monk-2014", ruleset: "RULES_2014" }, [disciple])).toEqual([]);
  });
});

describe("article mentions of the five equipment entries and renamed features", () => {
  it.each([
    ["druid-2014", ["reference=explorers-pack", "reference=druidic-focus"]],
    ["barbarian-path-of-wild-magic-2014", ["reference=monster-hunters-pack"]],
    ["rogue-arcane-trickster-2014", ["reference=monster-hunters-pack"]],
    ["warlock-fathomless-2014", ["reference=component-pouch"]],
    ["wizard-necromancy-2014", ["reference=component-pouch"]],
    ["ranger-2014", ["reference=component-pouch"]],
    ["ranger-hunter-2014", ["reference=explorers-pack"]],
    ["rogue-assassin-2014", ["reference=flute"]],
    ["cleric-nature-2014", ["reference=flute"]],
    ["races-2014", ["feature=kender-aptitude"]],
    ["monk-astral-self-2014", ["feature=firearms-mastery"]],
    ["sorcerer-2014", ["reference=component-pouch", "feature=draconic-ancestry-1"]],
    ["paladin-oath-of-the-ancients-2014", ["feature=aura-improvements-18"]],
  ])("links the mentions in %s", async (slug, hrefParts) => {
    const text = await readHydratedText(slug);
    for (const part of hrefParts) expect(text, part).toContain(part);
  }, 60_000);

  it.each([
    ["artificer-races-2014", ["|Deep}}"]],
    ["monk-2014", ["|Unarmed}}"]],
    ["warlock-subclasses-2014", ["|GooLock}}", "|Fey Warlock}}", "|GOOLock}}"]],
    ["warlock-great-old-one-2014", ["|GooLock}}", "|Fey Warlock}}"]],
    ["sorcerer-subclasses-2014", ["|GOOLock}}"]],
  ])("leaves no unresolved scoped alias marker in %s", async (slug, markers) => {
    const text = await readHydratedText(slug);
    for (const marker of markers) expect(text, marker).not.toContain(marker);
  }, 60_000);

  it.each([
    ["monk-2014", ["making-an-attack--damage-and-healing--hit-points"]],
    ["barbarian-2014", ["making-an-attack--damage-and-healing--hit-points"]],
    ["cleric-2014", ["reference=holy-symbol"]],
    ["cleric-arcana-domain-2014", ["reference=holy-symbol"]],
    ["cleric-light-domain-2014", ["reference=holy-symbol"]],
    ["artificer-2014", ["between-adventures--downtime-activities", "tools--tools--artisans-tools"]],
    ["sorcerer-wild-magic-2014", ["making-an-attack--attack-rolls--rolling-1-or-20"]],
    ["warlock-celestial-2014", ["making-an-attack--attack-rolls--rolling-1-or-20"]],
    ["ranger-spells-2014", ["casting-a-spell--components--material"]],
    ["monk-four-elements-2014", ["feature=disciple-of-the-elements"]],
  ])("links the existing rule and feature cards in %s", async (slug, hrefParts) => {
    const text = await readHydratedText(slug);
    for (const part of hrefParts) expect(text, part).toContain(part);
  }, 60_000);

  it("keeps the Pan flute away from the plain Flute entry", async () => {
    expect(await readHydratedText("hexbuckler-2014")).not.toContain("reference=flute");
  }, 60_000);
});

describe("level table feature names carry their English original", () => {
  it.each([
    ["rogue-assassin-2014", "Хитра дія{{Cunning Action}}"],
    ["monk-shadow-2014", "Плащ тіней{{Cloak of Shadows}}"],
    ["fighter-2014", "Додаткова атака{{Extra Attack}}"],
    ["sorcerer-storm-sorcery-2014", "Лють бурі{{Storm's Fury}}"],
    ["barbarian-storm-herald-2014", "Лють бурі{{Raging Storm}}"],
  ])("marks the table cell in %s", (slug, snippet) => {
    expect(readFileSync(`data/rpgbot/uk/rpgbot-${slug}.json`, "utf8")).toContain(snippet);
  });

  it("does not turn the Dragon's Breath spell row into the monk feature", () => {
    expect(readFileSync("data/rpgbot/uk/rpgbot-wizard-scribes-2014.json", "utf8")).not.toContain("{{Breath of the Dragon}}");
  });
});
