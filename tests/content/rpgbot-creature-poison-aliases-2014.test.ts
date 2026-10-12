import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { getAllCreatures } from "@/lib/bestiaryData";
import { collectCreatureAbilityReferences, collectCreatureAbilityAliases, collectCreatureReferences, collectCreatureNameAliases } from "@/lib/optimization/creature-hydration";
import { hydrateArticleRevision } from "@/lib/optimization/content-hydration";
import { parseArticleDocument } from "@/lib/optimization/document";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";

const abilities = collectCreatureAbilityReferences("RULES_2014");
const aliases = collectCreatureAbilityAliases("RULES_2014", abilities);

it.each([
  ["Basilisk's Bite", "Basilisk", "Bite", "7 (2к6)"],
  ["Flying Snake Venom", "Flying Snake", "Bite", "7 (3к4)"],
  ["Giant Spider Poison", "Giant Spider", "Bite", "СК 11"],
  ["Pseudodragon's Sting", "Pseudodragon", "Sting", "1 годину"],
  ["Dretch's Fetid Cloud", "Dretch", "Fetid Cloud", "1 раз на день"],
  ["Ghast Stench", "Ghast", "Stench", "24 години"],
  ["Sea Spawn's Poison Quills", "Sea Spawn", "Piscine Anatomy", "СК 12"],
  ["Homunculus' Bite", "Homunculus", "Bite", "СК 10"],
  ["Quasit's Claw", "Quasit", "Claws", "1 хвилину"],
  ["Shoosiva's Sting", "Shoosuva", "Tail Stinger", "СК 14"],
  ["Kraken's Ink", "Kraken", "Ink Cloud", "коштує 3 дії"],
  ["Wrastilith's Foul Water", "Wastrilith", "Corrupt Water", "тривалий відпочинок"],
])("%s reuses the complete exact native action with its original limits", (original, creatureName, action, mechanics) => {
  const target = aliases.find((entry) => entry.engName === original)!;
  const native = abilities.find((entry) => entry.href === target.href)!;
  const creature = getAllCreatures("RULES_2014").find((entry) => entry.nameEng === creatureName)!;
  const nativeParagraph = [creature.actions, creature.specialAbilities, creature.legendaryActions].flatMap((content) => content.match(/<p>[\s\S]*?(?=<p>|$)/g) ?? [])
    .find((paragraph) => paragraph.match(/^<p><b>(.*?)<\/b>/)?.[1].includes(`{{${action}}}`));
  expect(native.description).toBe(nativeParagraph);
  expect(native.description).toContain(mechanics);
  expect(native.details).toContainEqual({ label: "Істота", value: creature.name });
  expect(target.priority).toBe(0);
  expect(target.name).not.toBe(native.name);
});

it("qualified poison markers hydrate while the bare creature action retains lower priority", () => {
  const revision = parseArticleDocument(JSON.parse(readFileSync("data/rpgbot/uk/rpgbot-elf-2014.json", "utf8"))).translations.at(-1)!;
  const raceFeature = { name: "Укус", engName: "Bite", href: "/races?race=example", priority: 0 };
  const hydrated = hydrateArticleRevision({ ...revision, sections: [{ ...revision.sections[0], blocks: [{
    type: "paragraph", blockId: "poison-reference", content: [{ type: "text", text: "{{Укус|Bite}} і {{отрута павука|Giant Spider Poison}}" }],
  }] }] }, [raceFeature, ...abilities.map((reference) => ({ ...reference, priority: -1 })), ...aliases]);
  const block = hydrated.sections[0].blocks[0];
  expect(block.type === "paragraph" && block.content.filter((node) => node.type === "link").map((node) => node.href))
    .toEqual([raceFeature.href, aliases.find((entry) => entry.engName === "Giant Spider Poison")!.href]);
});

it("the native poison guide uses individual action cards without duplicating their hrefs", async () => {
  const article = await hydrateArticleDocument(parseArticleDocument(JSON.parse(readFileSync("data/rpgbot/uk/rpgbot-poisoner-poison-and-poisoning-2014.json", "utf8"))));
  for (const original of ["Basilisk's Bite", "Flying Snake Venom", "Giant Spider Poison", "Pseudodragon's Sting", "Dretch's Fetid Cloud", "Ghast Stench"]) {
    const target = aliases.find((entry) => entry.engName === original)!;
    const references = article.contentReferences.filter((entry) => entry.href === target.href);
    expect(references).toHaveLength(1);
    expect(references[0].description).toBe(abilities.find((entry) => entry.href === target.href)!.description);
  }
});

it("accentless Rothé spellings and Giant Constrictor open their complete native creature cards", () => {
  const references = collectCreatureReferences("RULES_2014");
  for (const original of ["Rothe", "Deep Rothe", "Giant Constrictor"]) {
    const target = collectCreatureNameAliases(references).find((entry) => entry.engName === original)!;
    expect(references.find((entry) => entry.href === target.href)?.description).toBeTruthy();
  }
  expect(collectCreatureNameAliases(references).find((entry) => entry.engName === "Boreworm")?.href).toBe("/bestiary?creature=bore-worm");
});

it("same creature/action href preserves all native normal, legendary and form variants", () => {
  const references = collectCreatureAbilityReferences("RULES_2014");
  for (const [creatureName, action] of [["Star Spawn Larva Mage", "Slam"], ["Yuan-ti Malison", "Bite"]]) {
    const creature = getAllCreatures("RULES_2014").find((entry) => entry.nameEng === creatureName)!;
    const paragraphs = [creature.actions, creature.legendaryActions].flatMap((content) => content.match(/<p>[\s\S]*?(?=<p>|$)/g) ?? [])
      .filter((paragraph) => paragraph.match(/^<p><b>(.*?)<\/b>/)?.[1].includes(`{{${action}}}`));
    const reference = references.find((entry) => entry.engName === action && entry.details.some((detail) => detail.label === "Істота" && detail.value === creature.name))!;
    expect(paragraphs.length).toBeGreaterThan(1);
    for (const paragraph of paragraphs) expect(reference.description).toContain(paragraph);
    expect(references.filter((entry) => entry.href === reference.href)).toHaveLength(1);
    if (action === "Slam") expect(reference.details).toContainEqual({ label: "Розділ", value: "Дії, Легендарні дії" });
  }
});

it("2024 qualified actions remain in the 2024 catalog", () => {
  const targets = collectCreatureAbilityAliases("RULES_2024", collectCreatureAbilityReferences("RULES_2024"));
  expect(targets.length).toBeGreaterThan(0);
  expect(targets.every((entry) => entry.href.startsWith("/2024/bestiary?"))).toBe(true);
});

it("ambiguous creature action variants retain complete statblocks instead of a last matching attack", () => {
  const references = collectCreatureReferences("RULES_2014");
  const targets = collectCreatureNameAliases(references);
  for (const original of ["Star Spawn Larva Mage's Poison", "Yuan-ti Malison's Poison"]) {
    const target = targets.find((entry) => entry.engName === original)!;
    const native = references.find((entry) => entry.href === target.href)!;
    expect(native.description).toContain("Мультиатака");
    if (original.startsWith("Star")) {
      expect(native.description).toContain("Статури СК 19");
      expect(native.description).toContain("коштує 3 дії");
    } else {
      for (const variant of ["Тип 1", "Тип 2", "Тип 3"]) expect(native.description).toContain(variant);
    }
  }
  const dragonTargets = targets.filter((entry) => entry.engName === "Green Dragon Breath");
  expect(dragonTargets).toHaveLength(4);
  expect(new Set(dragonTargets.map((entry) => entry.href)).size).toBe(4);
  expect(dragonTargets.every((entry) => references.find((reference) => reference.href === entry.href)?.description?.includes("Poison Breath"))).toBe(true);
});

it("all six Grung colors open the complete native variant rules", () => {
  const references = collectCreatureReferences("RULES_2014");
  const grung = references.find((entry) => entry.engName === "Grung")!;
  const targets = collectCreatureNameAliases(references);
  for (const original of ["Blue Grung", "Gold Grung", "Green Grung", "Orange Grung", "Purple Grung", "Red Grung"]) {
    expect(targets.find((entry) => entry.engName === original)?.href).toBe(grung.href);
  }
  for (const heading of ["Зелена шкіра", "Синя шкіра", "Фіолетова шкіра", "Червона шкіра", "Помаранчева шкіра", "Золота шкіра"]) {
    expect(grung.description).toContain(heading);
  }
});

it("Euphoria Spores keeps both native OotA variants and their different save DCs", () => {
  const references = collectCreatureReferences("RULES_2014");
  const targets = collectCreatureNameAliases(references).filter((entry) => entry.engName === "Myconid's Euphoria Spores");
  expect(targets).toHaveLength(2);
  for (const [original, dc] of [["Myconid Adult", "СК 11"], ["Myconid Sovereign", "СК 12"]]) {
    const native = references.find((entry) => entry.engName === original)!;
    expect(targets.some((entry) => entry.href === native.href)).toBe(true);
    expect(native.description).toContain("OotA, с. 228");
    expect(native.description).toContain(dc);
    expect(native.description).toContain("1 рівень");
    expect(native.description).toContain("Виснаження");
  }
});
