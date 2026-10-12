import { expect, it, vi } from "vitest";
import { hydrateArticleDocument } from "./hydration-catalog";
import { readSliceArticle } from "./slice-reader";
import { documentSchema } from "./schema";
import { fixtureCorpus } from "./fixtures.test-helper";
import { collectBlockText } from "./block-text";
import { findGlossaryMarkers } from "@/lib/refs/glossary-marker";
import { stripRuleTermAnchors } from "@/lib/term-link";
import ruleTermCards from "@/lib/generated/rule-term-cards.json";
import { collectRareReferenceAliases } from "./rare-reference-aliases";

// Each test links a whole RPGbot article (several seconds); under a full parallel run that crosses the default 15 s.
vi.setConfig({ testTimeout: 60_000 });

it("opens Cohort of Chaos and its complete Chaotic Flares table from the Planescape article", async () => {
  const hydrated = await hydrateArticleDocument((await readSliceArticle("planescape-backgrounds-feats-2014", "RULES_2014"))!);
  const markers = hydrated.translations.flatMap((revision) => revision.sections.flatMap((section) =>
    section.blocks.flatMap(collectBlockText).flatMap(findGlossaryMarkers)));
  expect(markers.map((marker) => marker.original)).not.toContain("Chaotic Flares");
  const feat = hydrated.contentReferences.find((reference) => reference.engName === "Cohort of Chaos");
  expect(feat?.name).toBe("Спільник хаосу");
  const description = stripRuleTermAnchors(feat!.description!);
  expect(description).toContain("1 чи 20");
  expect(description).toContain("до кінця вашого наступного ходу");
  expect(description).toContain("доки попередній не завершиться");
  for (const effect of ["Battle Fury", "Disruption Field", "Unbound", "Wailing Winds"]) expect(description).toContain(effect);
  expect(description).toContain("вперше за хід");
  expect(description).toContain("1к8 силової шкоди");
  expect(description).toContain("швидкість ходьби");
  expect(description).toContain("15 футів");
  expect(feat?.details).toContainEqual({ label: "Джерело", value: "Сиґіл і Зовнішні землі, с. 10" });
});

it("keeps the owner-excluded Nyxborn Lynx as plain article text", async () => {
  const document = (await readSliceArticle("polymorph-2014", "RULES_2014"))!;
  const hydrated = await hydrateArticleDocument(document);
  const text = hydrated.translations.flatMap((revision) => revision.sections.flatMap((section) => section.blocks.flatMap(collectBlockText))).join("\n");
  expect(text).toContain("Nyxborn Lynx");
  expect(findGlossaryMarkers(text).some((marker) => marker.original === "Nyxborn Lynx")).toBe(false);
  expect(hydrated.contentReferences.some((reference) => reference.engName === "Nyxborn Lynx")).toBe(false);
});

it.each(["monk-ascendant-dragon-2014", "monk-subclasses-2014"])("opens %s's Resistance as the dragon aura", async (slug) => {
  const hydrated = await hydrateArticleDocument((await readSliceArticle(slug, "RULES_2014"))!);
  const sections = hydrated.translations.flatMap((revision) => revision.sections);
  const markers = sections.flatMap((section) => section.blocks.flatMap(collectBlockText).flatMap(findGlossaryMarkers));
  expect(markers.map((marker) => marker.original)).not.toContain("Resistance");
  const references = hydrated.contentReferences.flatMap((reference) => reference.options ?? [reference]);
  const aura = references.find((reference) => reference.engName === "Aspect of the Wyrm");
  expect(aura?.description).toContain("10 футів");
  expect(stripRuleTermAnchors(aura!.description!)).toContain("опір");
});

it("keeps the dragon aura alias inside its 2014 feature section", () => {
  const target = { name: "Аспект дракона", engName: "Aspect of the Wyrm", href: "/classes?class=MONK_2014&feature=aspect-of-the-wyrm" };
  expect(collectRareReferenceAliases([target])).toEqual([]);
  expect(collectRareReferenceAliases([{ ...target, sectionId: "features" }])).toMatchObject([{ engName: "Resistance", sectionId: "features" }]);
  expect(collectRareReferenceAliases([{ ...target, href: "/2024/classes?feature=aspect-of-the-wyrm", sectionId: "features" }])).toEqual([]);
});

it.each([
  ["warlock-undead-2014", "T-Rex", "Tyrannosaurus Rex"],
  ["druid-circle-of-dreams-2014", "T-rex", "Tyrannosaurus Rex"],
  ["druid-circle-of-wildfire-2014", "Flame Spirit", "Wildfire Spirit"],
  ["druid-moon-2014", "Unarmed Attacks", "Unarmed Strike"],
  ["bard-glamour-2014", "Inspiration Dice", "Bardic Inspiration"],
  ["paladin-oath-of-conquest-2014", "Hexblade Warlocks", "Hexblade"],
])("opens the native rules for %s's %s alias", async (slug, original, canonicalName) => {
  const document = (await readSliceArticle(slug, "RULES_2014"))!;
  const hydrated = await hydrateArticleDocument(document);
  const markers = hydrated.translations.flatMap((revision) => revision.sections.flatMap((section) =>
    section.blocks.flatMap(collectBlockText).flatMap(findGlossaryMarkers)));
  expect(markers.map((marker) => marker.original)).not.toContain(original);
  const references = hydrated.contentReferences.flatMap((reference) => reference.options ?? [reference]);
  if (canonicalName === "Unarmed Strike") {
    const card = ruleTermCards.RULES_2014["Unarmed Strike"];
    const links = hydrated.translations.flatMap((revision) => revision.sections.flatMap((section) =>
      section.blocks.flatMap((block) => block.type === "list" ? block.items.flat() :
        block.type === "table" ? [...block.headers.flat(), ...block.rows.flat(2)] :
          block.type === "rating" ? [] : block.content)));
    expect(links.some((node) => node.type === "link" && node.href === card.article?.href)).toBe(true);
    expect(card.article?.subsection?.content).toContain("1 +");
  } else {
    expect(references.find((reference) => reference.engName === canonicalName)?.description).toBeTruthy();
  }
});

it("opens Drakewarden's resistance and infused strikes as subclass rules", async () => {
  const hydrated = await hydrateArticleDocument((await readSliceArticle("ranger-drakewarden-2014", "RULES_2014"))!);
  const section = hydrated.translations[0].sections.find((section) => section.sectionId === "section-features")!;
  const list = section.blocks[0];
  if (list.type !== "list") throw new Error("Expected feature list");
  const resistance = list.items[7][0];
  if (resistance.type !== "link") throw new Error("Expected linked resistance");
  expect(hydrated.contentReferences.find((reference) => reference.href === resistance.href)).toMatchObject({
    kind: "feature", engName: "Bond of Fang and Scale", description: expect.stringContaining("**Опір."),
  });
  const strikes = list.items[3].find((node) => node.type === "link" && node.text === "Насичені удари");
  if (strikes?.type !== "link") throw new Error("Expected linked Infused Strikes");
  expect(hydrated.contentReferences.find((reference) => reference.href === strikes.href)).toMatchObject({
    kind: "feature", engName: "Drake Companion", description: expect.stringContaining("**Реакції — Насичені удари."),
  });
});

it("opens Alchemist elixirs and Tasha's tool proficiency with their own rules", async () => {
  const hydrated = await hydrateArticleDocument((await readSliceArticle("artificer-alchemist-2014", "RULES_2014"))!);
  const section = hydrated.translations[0].sections.find((section) => section.sectionId === "section-features")!;
  const list = section.blocks[0];
  if (list.type !== "list") throw new Error("Expected feature list");
  const referenceFor = (index: number) => {
    const label = list.items[index][0];
    if (label.type !== "link") throw new Error("Expected linked ability label");
    return hydrated.contentReferences.find((reference) => reference.href === label.href)!;
  };
  expect(referenceFor(0)).toMatchObject({ kind: "feature", engName: "Tool Proficiency (Alchemist)" });
  expect(referenceFor(0).description).toContain("володіння приладдям алхіміка");
  expect(referenceFor(0).description).toContain("іншим типом інструментів ремісника");
  for (const index of [8, 9, 10, 11, 12, 13]) {
    expect(referenceFor(index).engName).toBe("Experimental Elixir");
    expect(referenceFor(index).description).toContain("**Сміливість.");
  }
});

it.each([
  ["bard-2014", "Magical Inspiration"],
  ["bard-2014", "Bardic Versatility"],
  ["fighter-2014", "Martial Versatility"],
  ["ranger-2014", "Martial Versatility"],
  ["warlock-2014", "Eldritch Versatility"],
  ...["bard", "cleric", "druid", "ranger", "sorcerer", "warlock", "wizard"].map((owner) =>
    [`${owner}-2014`, `Additional ${owner[0].toUpperCase()}${owner.slice(1)} Spells`]),
  ["fighter-2014", "Fighting Style Options"],
  ["ranger-2014", "Fighting Style Options"],
  ["sorcerer-2014", "Metamagic Options"],
])("opens approved optional rules in %s: %s", async (slug, original) => {
  const hydrated = await hydrateArticleDocument((await readSliceArticle(slug, "RULES_2014"))!);
  const markers = hydrated.translations.flatMap((revision) => revision.sections.flatMap((section) => section.blocks.flatMap(collectBlockText).flatMap(findGlossaryMarkers)));
  expect(markers.some((marker) => marker.original.replace(/\s*\([^)]*\)$/, "") === original)).toBe(false);
  const references = hydrated.contentReferences.flatMap((reference) => reference.options ?? [reference])
    .filter((reference) => reference.engName.startsWith(original));
  expect(references.length).toBeGreaterThan(0);
  expect(references.every((reference) => /[А-Яа-яІіЇїЄє]/.test(reference.description ?? ""))).toBe(true);
  if (original.startsWith("Additional")) expect(references.every((reference) => reference.description?.includes('href="/spells/'))).toBe(true);
  if (original === "Martial Versatility") {
    expect(references.find((reference) => reference.engName === "Martial Versatility (Fighter)")?.description).toContain("замінити один відомий маневр іншим");
    expect(references.find((reference) => reference.engName === "Martial Versatility (Ranger)")?.description).not.toContain("маневр");
  }
  if (original === "Eldritch Versatility") expect(references[0].description).toContain("12-й рівень або вище");
  if (original === "Metamagic Options") expect(references[0].description).toContain("витратити 2 очки чародійства");
});

it.each(["Card Tricks", "Hidden Ace"])("opens Cartomancer's original rules for %s", async (original) => {
  const corpus = structuredClone(fixtureCorpus());
  corpus.translations[0].sections[0].blocks = [{ type: "paragraph", blockId: "card-component", content: [{ type: "text", text: `{{Картомант|${original}}}` }] }];
  const hydrated = await hydrateArticleDocument({ article: { ...corpus.articles[0], ruleset: "RULES_2014" }, translations: corpus.translations });
  expect(hydrated.contentReferences[0]).toMatchObject({ engName: "Cartomancer", kind: "feat" });
  expect(hydrated.contentReferences[0].description).toContain("Карткові трюки{{Card Tricks}}");
  expect(hydrated.contentReferences[0].description).toContain("Прихований туз{{Hidden Ace}}");
});

it("opens the published 2014 Cartomancer feat with its full restrictions", async () => {
  const corpus = fixtureCorpus();
  const revision = corpus.translations[0];
  revision.sections[0].blocks = [{ type: "paragraph", blockId: "cartomancer", content: [{ type: "text", text: "{{Картомант|Cartomancer}}" }] }];
  const hydrated = await hydrateArticleDocument({ article: { ...corpus.articles[0], ruleset: "RULES_2014" as const }, translations: [revision] });
  expect(hydrated.contentReferences).toHaveLength(1);
  expect(hydrated.contentReferences[0]).toMatchObject({ kind: "feat", name: "Картомант" });
  expect(hydrated.contentReferences[0].description).toContain("для якого ви маєте слоти заклинань");
  expect(hydrated.contentReferences[0].description).toContain("протягом 8 годин");
  expect(hydrated.contentReferences[0].details).toContainEqual({ label: "Джерело", value: "Книга Багатьох Речей, с. 49" });
});

it("opens reviewed optional 2014 rules in the actual Cleric and Druid articles", async () => {
  for (const slug of ["cleric-2014", "druid-2014"]) {
    const hydrated = await hydrateArticleDocument((await readSliceArticle(slug, "RULES_2014"))!);
    const markers = hydrated.translations.flatMap((revision) => revision.sections.flatMap((section) => section.blocks.flatMap(collectBlockText).flatMap(findGlossaryMarkers)));
    expect(markers.map((marker) => marker.original)).not.toContain("Cantrip Versatility (Addition)");
    const cantrips = [...new Map(hydrated.contentReferences.flatMap((reference) => reference.options ?? [reference])
      .filter((reference) => reference.engName.startsWith("Cantrip Versatility")).map((reference) => [reference.engName, reference])).values()];
    expect(cantrips).toHaveLength(2);
    expect(cantrips.map((reference) => reference.description)).toEqual(expect.arrayContaining([
      expect.stringContaining("зі списку заклинань Клірика"), expect.stringContaining("зі списку заклинань Друїда"),
    ]));
    const original = slug === "cleric-2014" ? "Blessed Strikes" : "Wild Companion";
    const description = hydrated.contentReferences.find((reference) => reference.engName === original)?.description;
    expect(description).toContain(slug === "cleric-2014" ? "до початку вашого наступного ходу" : "половині вашого рівня Друїда");
    if (slug === "druid-2014") expect(description).toContain('href="/spells/find-familiar"');
  }
});

it("opens optional features and fighting styles from existing Ukrainian seed descriptions", async () => {
  const corpus = fixtureCorpus();
  const article = { ...corpus.articles[0], ruleset: "RULES_2014" as const, topics: ["Монах"] };
  const revision = corpus.translations[0];
  revision.sections[0].blocks = [{ type: "paragraph", blockId: "optional", content: [{ type: "text", text: "{{Зосереджене прицілювання|Focused Aim}} та {{Бій наосліп|Blind Fighting}}" }] }];
  const hydrated = await hydrateArticleDocument({ article, translations: [revision] });
  expect(hydrated.translations[0].sections[0].blocks[0]).toMatchObject({ content: [{ type: "link" }, { type: "text" }, { type: "link" }] });
  expect(hydrated.contentReferences.find((reference) => reference.engName === "Focused Aim")?.description).toContain("від 1 до 3 очок кі");
  expect(hydrated.contentReferences.find((reference) => reference.engName === "Blind Fighting")?.description).toContain("сліповид");
});

it("opens annotated optional labels and feat components without replacing their original rules", async () => {
  const corpus = fixtureCorpus();
  const article = { ...corpus.articles[0], ruleset: "RULES_2014" as const, topics: ["Монах"] };
  const revision = corpus.translations[0];
  revision.sections[0].blocks = [{ type: "paragraph", blockId: "components", content: [{ type: "text", text: "{{Зосереджене прицілювання|Focused Aim (Addition)}}. {{Захисні крила|Protective Wings}}. {{Реактивний опір|Reactive Resistance}}." }] }];
  const hydrated = await hydrateArticleDocument({ article, translations: [revision] });
  const block = hydrated.translations[0].sections[0].blocks[0];
  if (block.type !== "paragraph") throw new Error("Expected paragraph");
  const links = block.content.filter((node) => node.type === "link");
  expect(links.map((node) => node.text)).toEqual(["Зосереджене прицілювання", "Захисні крила", "Реактивний опір"]);
  expect(hydrated.contentReferences.find((reference) => reference.engName === "Gift of the Metallic Dragon")?.description).toContain("спектральні крила");
  expect(stripRuleTermAnchors(hydrated.contentReferences.find((reference) => reference.engName === "Gift of the Chromatic Dragon")!.description!)).toContain("опір до цієї шкоди");
});

it("keeps 2014-only seed features out of a 2024 article", async () => {
  const corpus = fixtureCorpus();
  const revision = corpus.translations[0];
  revision.sections[0].blocks = [{ type: "paragraph", blockId: "old", content: [{ type: "text", text: "{{Зосереджене прицілювання|Focused Aim}}" }] }];
  const hydrated = await hydrateArticleDocument({ article: { ...corpus.articles[0], ruleset: "RULES_2024" as const }, translations: [revision] });
  expect(hydrated.contentReferences.some((reference) => reference.engName === "Focused Aim")).toBe(false);
});

it("keeps a class name from turning into all features that use its owner prefix", async () => {
  const corpus = fixtureCorpus();
  const revision = corpus.translations[0];
  revision.sections[0].blocks = [{ type: "paragraph", blockId: "class", content: [{ type: "text", text: "{{Чародій|Sorcerer}}" }] }];
  const hydrated = await hydrateArticleDocument({ article: { ...corpus.articles[0], ruleset: "RULES_2024" as const }, translations: [revision] });
  expect(hydrated.contentReferences).toHaveLength(1);
  expect(hydrated.contentReferences[0]).toMatchObject({ kind: "class", engName: "Sorcerer" });
  expect(hydrated.contentReferences[0].options).toBeUndefined();
});

it("makes contextual components readable in their actual subclass articles", async () => {
  for (const [slug, original] of [["warlock-genie-2014", "Dao"], ["bard-spirits-2014", "Renowned Duelist"], ["barbarian-path-of-the-beast-2014", "Swim Speed"]]) {
    const hydrated = await hydrateArticleDocument((await readSliceArticle(slug, "RULES_2014"))!);
    const markers = hydrated.translations.flatMap((revision) => revision.sections.flatMap((section) => section.blocks.flatMap(collectBlockText).flatMap(findGlossaryMarkers)));
    expect(markers.map((marker) => marker.original)).not.toContain(original);
  }
});

it("hydrates all reviewed Monk feature labels and preserves the raw document", async () => {
  const document = (await readSliceArticle("monk-subclasses-2014", "RULES_2014"))!;
  const original = structuredClone(document);
  const hydrated = await hydrateArticleDocument(document);
  expect(document).toEqual(original);
  expect(documentSchema.safeParse(hydrated).success).toBe(true);
  expect(hydrated.contentReferences.filter((reference) => reference.feature?.entity.parentKey === "MONK_2014")).toHaveLength(42);
  expect(hydrated.contentReferences.every((reference) => !reference.href.startsWith("/2024"))).toBe(true);
  const mercy = hydrated.contentReferences.find((reference) => reference.engName === "Hand of Healing")!;
  expect(mercy.description).toBeTruthy();
  expect(mercy.feature?.entity.parentKey).toBe("MONK_2014");
});

it.each(["RULES_2014", "RULES_2024"] as const)("keeps hydrated links in their own edition: %s", async (ruleset) => {
  const slug = ruleset === "RULES_2014" ? "monk-2014" : "monk-2024";
  const hydrated = await hydrateArticleDocument((await readSliceArticle(slug, ruleset))!);
  const texts = hydrated.translations.flatMap((revision) => revision.sections.flatMap((section) => section.blocks.flatMap((block) => block.type === "rating" ? [] : block.type === "list" ? block.items.flat() : block.type === "table" ? block.rows.flat(2) : block.content)));
  const spellLinks = texts.filter((node) => node.type === "link" && /\/spells\//.test(node.href));
  expect(spellLinks.length).toBeGreaterThan(0);
  for (const node of spellLinks) {
    if (node.type !== "link") continue;
    expect(node.href.startsWith("/2024/")).toBe(ruleset === "RULES_2024");
  }
});

it("opens every Hunter Evasion mention as subclass rules rather than the Dodge action", async () => {
  const hydrated = await hydrateArticleDocument((await readSliceArticle("ranger-hunter-2014", "RULES_2014"))!);
  const nodes = hydrated.translations.flatMap((revision) => revision.sections.flatMap((section) =>
    section.blocks.flatMap((block) => block.type === "rating" ? [] : block.type === "list" ? block.items.flat() :
      block.type === "table" ? [...block.headers.flat(), ...block.rows.flat(2)] : block.content)));
  const mentions = nodes.filter((node) => node.type === "link" && node.text === "Ухиляння");
  expect(mentions.length).toBeGreaterThan(1);
  for (const mention of mentions) {
    if (mention.type !== "link") continue;
    expect(hydrated.contentReferences.find((reference) => reference.href === mention.href)).toMatchObject({
      kind: "feature", engName: "Evasion (Hunter)",
      description: expect.stringContaining("ряткидок Спритності"),
    });
  }
});

it("opens the guns in Gunner's comparison table locally without changing source links", async () => {
  const document = (await readSliceArticle("gunner-2014", "RULES_2014"))!;
  const original = structuredClone(document);
  const hydrated = await hydrateArticleDocument(document);
  const section = hydrated.translations[0].sections.find((section) => section.sectionId === "section-firearms-vs-the-world")!;
  const table = section.blocks.find((block) => block.type === "table");
  if (table?.type !== "table") throw new Error("Expected weapon table");
  for (const row of table.rows.slice(0, 2)) {
    const label = row[0][0];
    if (label.type !== "link") throw new Error("Expected weapon link");
    expect(label.href).toMatch(/^\/weapons\//);
    expect(hydrated.contentReferences.find((reference) => reference.href === label.href)).toMatchObject({ kind: "weapon" });
  }
  expect(document).toEqual(original);
});

it.each(["artificer", "barbarian", "cleric", "druid", "fighter", "monk", "ranger", "rogue", "sorcerer", "warlock", "wizard"])("opens the %s card from the guide's «Ряткидки» and «Володіння» headers", async (classKey) => {
  const hydrated = await hydrateArticleDocument((await readSliceArticle(`${classKey}-2014`, "RULES_2014"))!);
  const links = hydrated.translations.flatMap((revision) => revision.sections.flatMap((section) => section.blocks.flatMap((block) =>
    block.type === "list" ? block.items.flat() : block.type === "rating" || block.type === "table" ? [] : block.content)));
  for (const header of ["Ряткидки", "Володіння"]) {
    const link = links.find((node) => node.type === "link" && node.text === header);
    if (link?.type !== "link") throw new Error(`Expected linked ${header}`);
    expect(hydrated.contentReferences.find((reference) => reference.href === link.href)).toMatchObject({ kind: "class" });
  }
  expect(hydrated.contentReferences.flatMap((reference) => reference.options ?? []).map((option) => option.engName)).not.toContain("Drakewarden");
});
