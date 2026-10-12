import { expect, it } from "vitest";
import { fixtureCorpus } from "@/lib/optimization/fixtures.test-helper";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";
import { getAllSpells } from "@/lib/spellsData";
import { collectMechanicalReferenceAliases } from "@/lib/optimization/mechanical-reference-aliases";
import { collectSupplementalReferences } from "@/lib/optimization/supplemental-hydration";
import { getAllMagicItems } from "@/lib/magicItemsData";
import { readFileSync } from "node:fs";

it("routes abbreviated spells and magic item variants to complete native 2014 rules", async () => {
  const corpus = fixtureCorpus();
  const aliases = ["Arcane Hand", "Earthen Grasp", "Primal Beast", "Great Tree", "Wedding", "Luck Points",
    "Goat of Terror", "Fate Dealer’s Deck +2", "Wraps of Unarmed Prowess, +3", "Prehistoric Figure of Wondrous Power (Pyrite Plesiosaurus)",
    "Short Sword", "Half-plate", "Walloping Arrow", "Armblade", "Wand Sheath", "Battering Shield", "Doss Lute"];
  const revision = corpus.translations[0];
  revision.sections[0].blocks = [{ type: "paragraph", blockId: "mechanical-aliases", content: [
    { type: "text", text: aliases.map((original) => `{{${original}|${original}}}`).join("; ") },
  ] }];
  const hydrated = await hydrateArticleDocument({ article: corpus.articles[0], translations: [revision] });
  const paragraph = hydrated.translations[0].sections[0].blocks[0];
  expect(paragraph.type).toBe("paragraph");
  if (paragraph.type !== "paragraph") throw new Error("Expected hydrated paragraph");
  const links = paragraph.content.filter((node) => node.type === "link");
  expect(links.map((node) => node.text)).toEqual(aliases);
  const hrefFor = (alias: string) => links.find((node) => node.text === alias)!.href;
  expect(hrefFor("Arcane Hand")).toBe("/spells/bigbys-hand");
  expect(hrefFor("Earthen Grasp")).toBe("/spells/maximilians-earthen-grasp");
  expect(hrefFor("Primal Beast")).toBe("/spells/guardian-of-nature");
  expect(hrefFor("Great Tree")).toBe(hrefFor("Primal Beast"));
  expect(hrefFor("Wedding")).toBe("/spells/ceremony");
  for (const [alias, required] of [
    ["Luck Points", "3 очки удачі"], ["Goat of Terror", "15 днів"],
    ["Fate Dealer’s Deck +2", "Бонус"], ["Wraps of Unarmed Prowess, +3", "+3"],
    ["Prehistoric Figure of Wondrous Power (Pyrite Plesiosaurus)", "12 годин"],
    ["Walloping Arrow", "СК 10"],
    ["Armblade", "протягом усього часу налаштування"], ["Wand Sheath", "вважаються одним магічним предметом"],
    ["Battering Shield", "ще на 10 футів"], ["Doss Lute", "соматичний або матеріальний компонент"],
  ]) {
    const reference = hydrated.contentReferences.find((entry) => entry.href === hrefFor(alias))!;
    expect(reference.description, alias).toContain(required);
    expect(reference.href).not.toContain("/2024/");
  }
  const figurine = hydrated.contentReferences.find((entry) => entry.href === hrefFor("Goat of Terror"))!;
  expect(figurine.engName).toBe("Figurine of Wondrous Power");
  expect(figurine.description).toContain("Довгим списом +1");
  expect(figurine.description).toContain("Довгим мечем +2");
  expect(hrefFor("Short Sword")).toBe("/weapons/shortsword");
  expect(hrefFor("Half-plate")).toBe("/armor/half-plate");
  expect(getAllSpells("RULES_2014").find((spell) => spell.engName === "Bigby's Hand")!.description).toContain("4к8");
});

it("does not invent targets when the corresponding native rules are absent", () => {
  expect(collectMechanicalReferenceAliases([])).toEqual([]);
});

it("links ritual rules, Kenku forgery and named tattoo and storm effects to complete 2014 descriptions", async () => {
  const corpus = fixtureCorpus();
  const revision = corpus.translations[0];
  const originals = ["Ritual Casting", "Expert Forgery", "Eldritch Maul", "Storm Cloud", "Tremorsense", "Adrenaline Surge", "Aggressive Attraction", "Greater Comprehension"];
  revision.sections[0].blocks = [{ type: "paragraph", blockId: "remaining-mechanics", content: [
    { type: "text", text: originals.map((name) => `{{${name}|${name}}}`).join("; ") },
  ] }];
  const hydrated = await hydrateArticleDocument({ article: corpus.articles[0], translations: [revision] });
  const paragraph = hydrated.translations[0].sections[0].blocks[0];
  if (paragraph.type !== "paragraph") throw new Error("Expected paragraph");
  const links = paragraph.content.filter((node) => node.type === "link");
  expect(links.map((node) => node.text)).toEqual(originals);
  const referenceFor = (original: string) => hydrated.contentReferences.flatMap((entry) => entry.options ?? [entry]).find((entry) => entry.href === links.find((node) => node.text === original)!.href)!;
  expect(referenceFor("Ritual Casting").description).toContain("на 10 хвилин довше");
  expect(referenceFor("Expert Forgery").description).toContain("почерк і вироби інших істот");
  expect(referenceFor("Eldritch Maul").description).toContain("до наступного світанку");
  expect(links.find((node) => node.text === "Storm Cloud")?.href).toBe("/spells/storm-sphere");
  expect(referenceFor("Tremorsense").description).toContain("летять або є безтілесними");
  expect(referenceFor("Adrenaline Surge").description).toContain("тимчасових");
  expect(referenceFor("Aggressive Attraction").description).toContain("2к10");
  expect(referenceFor("Greater Comprehension").description).toContain("читати будь-якою мовою");
});

it("opens both complete native descriptions for the combined good and evil talisman label", async () => {
  const corpus = fixtureCorpus();
  const revision = corpus.translations[0];
  revision.sections[0].blocks = [{ type: "paragraph", blockId: "talismans", content: [{ type: "text",
    text: "{{Талісмани|Talisman of Pure Good / Talisman of Ultimate Evil}}" }] }];
  const hydrated = await hydrateArticleDocument({ article: corpus.articles[0], translations: [revision] });
  const reference = hydrated.contentReferences.find((entry) => entry.options?.some((option) => option.engName === "Talisman of Pure Good"))!;
  expect(reference.options?.map((option) => option.engName).sort()).toEqual(["Talisman of Pure Good", "Talisman of Ultimate Evil"]);
  for (const option of reference.options!) {
    expect(option.description).toContain("8к6");
    expect(option.description).toContain("+2 до кидків атаки");
    expect(option.href).not.toContain("/2024/");
  }
});

it("preserves original item limits and isolates reading supplements from 2024 and saved item IDs", () => {
  const references = collectSupplementalReferences("RULES_2014", []);
  const armblade = references.find((entry) => entry.engName === "Armblade")!;
  expect(armblade.description).toContain("не можете використовувати цю руку для інших цілей");
  expect(armblade.details).toContainEqual({ label: "Налаштування", value: "Потрібне; лише для Воєнокованого" });
  const sheath = references.find((entry) => entry.engName === "Wand Sheath")!;
  expect(sheath.description).toContain("лише одна паличка водночас");
  expect(sheath.description).toContain("ваше налаштування на неї припиниться");
  const shield = references.find((entry) => entry.engName === "Battering Shield")!;
  expect(shield.description).toContain("3 заряди");
  expect(shield.description).toContain("1к3");
  expect(shield.description).toContain("щонайменше на 5 футів");
  expect(collectSupplementalReferences("RULES_2024", [])).toEqual([]);
  expect(getAllMagicItems("RULES_2014").filter((entry) => ["Armblade", "Wand Sheath", "Battering Shield"].includes(entry.engName))).toEqual([]);
});

it("keeps the complete Doss Lute rules in seed and delivered catalog with all seven original spells", () => {
  const seed = JSON.parse(readFileSync("prisma/seed/magic-items/baseline.json", "utf8")).items;
  const original = seed.find((entry: { engName: string }) => entry.engName === "Instrument of the Bards (Doss Lute)");
  const delivered = getAllMagicItems("RULES_2014").find((entry) => entry.engName === original.engName)!;
  expect(delivered.description).toBe(original.description);
  expect(delivered.description).toContain("СК 15");
  expect(delivered.description).toContain("2к4 психічної шкоди");
  expect(delivered.description).toContain("до наступного світанку");
  expect(delivered.description).toContain("лише вогонь");
  expect(delivered.description?.match(/href="\/spells\//g)).toHaveLength(7);
});

it("opens the explicit D&D Beyond Boomerang +1 rules without borrowing Storm Boomerang magic", async () => {
  const corpus = fixtureCorpus();
  const revision = corpus.translations[0];
  revision.sections[0].blocks = [{ type: "paragraph", blockId: "boomerang", content: [{ type: "text", text: "{{Бумеранг +1|Boomerang, +1}}" }] }];
  const hydrated = await hydrateArticleDocument({ article: corpus.articles[0], translations: [revision] });
  const reference = hydrated.contentReferences.find((entry) => entry.engName === "Boomerang, +1")!;
  expect(reference.href).toBe("/magic-items?reference=boomerang-1");
  expect(reference.description).toContain("бонус +1 до кидків атаки й шкоди");
  expect(reference.description).toContain("володіє метальним списом");
  expect(reference.description).toContain("У разі промаху");
  expect(reference.description).not.toContain("3к4");
  expect(reference.description).not.toContain("Приголомшений");
  const evidence = JSON.parse(readFileSync("data/2014/source-extracts/boomerang-plus-one-ddb.json", "utf8"));
  expect(evidence.sourceUrl).toBe("https://www.dndbeyond.com/magic-items/535335-boomerang-1");
  expect(evidence.templateSource).toBe("DMG");
  expect(collectSupplementalReferences("RULES_2024", [])).toEqual([]);
});
