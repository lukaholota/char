import { expect, it } from "vitest";
import { collectAmbiguousHydration } from "./ambiguous-hydration";
import { collectSectionCreatureAbilities, hydrateArticleRevision, type HydrationTarget } from "./content-hydration";
import { fixtureCorpus } from "./fixtures.test-helper";
import type { InlineNode } from "./types";

const targets: HydrationTarget[] = [
  { name: "Вогняна куля", engName: "Fireball", href: "/spells/fireball" },
  { name: "Отруєний", engName: "Poisoned", href: "/rules/conditions#condition-poisoned", linkPlainText: true },
  { name: "Довгий лук", engName: "Longbow", href: "/weapons/longbow" },
];

function hydrateText(text: string, extraTargets: HydrationTarget[] = []) {
  const revision = fixtureCorpus().translations[0];
  revision.sections[0].blocks = [{ type: "paragraph", blockId: "text", content: [{ type: "text", text }] }];
  const hydrated = hydrateArticleRevision(revision, [...targets, ...extraTargets]);
  const paragraph = hydrated.sections[0].blocks[0];
  if (paragraph.type !== "paragraph") throw new Error("Expected paragraph");
  return paragraph.content;
}

it("converts paired and original markers into explicit links while keeping unknown terms", () => {
  const nodes = hydrateText("{{Куля|Fireball}} і Лук{{Longbow}} та приклад{{Unknown}}.");
  expect(nodes.filter((node) => node.type === "link").map((node) => node.href)).toEqual(["/spells/fireball", "/weapons/longbow"]);
  expect(nodes.map((node) => node.text).join("")).toContain("Unknown");
});

it("preserves sentence text around square labels, including mismatched translations", () => {
  const nodes = hydrateText("Автор радить Вогняна куля [Fireball], а потім старий переклад [Fireball].");
  expect(nodes.map((node) => node.text).join("")).toBe("Автор радить Вогняна куля, а потім старий переклад Fireball.");
  expect(nodes.filter((node) => node.type === "link")).toHaveLength(2);
});

it("links quoted names and plain registered terms only at word boundaries", () => {
  const nodes = hydrateText("«Довгий лук»; Отруєний; НеОтруєний; відОтруєний2.");
  expect(nodes.filter((node) => node.type === "link")).toHaveLength(2);
  expect(nodes.map((node) => node.text).join("")).toContain("НеОтруєний");
});

it("leaves ambiguous names and features outside their bound section unlinked", () => {
  expect(hydrateText("{{Куля|Fireball}}", [{ name: "Інша куля", engName: "Fireball", href: "/spells/other" }]).some((node) => node.type === "link")).toBe(false);
  expect(hydrateText("{{Риса|Feature}}", [{ name: "Риса", engName: "Feature", href: "/classes?feature=x", sectionId: "another" }]).some((node) => node.type === "link")).toBe(false);
});

it("preserves nested lists, tables, formatting, rating markers and the source revision", () => {
  const revision = fixtureCorpus().translations[0];
  const marked: InlineNode = { type: "strong", text: "{{Куля|Fireball}}" };
  revision.sections[0].blocks.push({ blockId: "nested", type: "list", ordered: false, items: [[marked], [{ type: "rating", text: "оцінка", ratingId: "rating-a" }]], depths: [0, 1] },
    { blockId: "cells", type: "table", caption: [marked], headers: [[marked]], rows: [[[marked]]] });
  const original = structuredClone(revision);
  const hydrated = hydrateArticleRevision(revision, targets);
  expect(revision).toEqual(original);
  expect(hydrated.sections[0].blocks[1]).toMatchObject({ depths: [0, 1], items: [[{ type: "link", href: "/spells/fireball", format: "strong" }], [{ type: "rating", ratingId: "rating-a" }]] });
  expect(hydrated.sections[0].blocks[2]).toMatchObject({ caption: [{ type: "link" }], headers: [[{ type: "link" }]], rows: [[[{ type: "link" }]]] });
  expect(hydrateArticleRevision(hydrated, targets)).toEqual(hydrated);
});

it("resolves homonyms by the section's entity category and preserves the Ukrainian source label", () => {
  const revision = fixtureCorpus().translations[0];
  revision.sections[0].sectionId = "section-feats";
  revision.sections[0].blocks = [{ type: "paragraph", blockId: "feat", content: [{ type: "text", text: "Удачливий{{Lucky}}" }] }];
  const hydrated = hydrateArticleRevision(revision, [
    { kind: "feat", name: "Щасливчик", engName: "Lucky", href: "/feats?feat=1" },
    { kind: "feature", name: "Везіння", engName: "Lucky", href: "/races?race=halfling&feature=lucky" },
  ]);
  expect(hydrated.sections[0].blocks[0]).toMatchObject({ content: [{ type: "link", text: "Удачливий", href: "/feats?feat=1" }] });
});

it("links spell names containing a slash and keeps the surrounding sentence", () => {
  const spell = { name: "Сліпота/глухота", engName: "Blindness/Deafness", href: "/spells/blindness-deafness" };
  const nodes = hydrateText("Риса дає Сліпота/глухота [Blindness/Deafness] раз на день.", [spell]);
  expect(nodes).toEqual([
    { type: "text", text: "Риса дає " },
    { type: "link", text: "Сліпота/глухота", href: spell.href },
    { type: "text", text: " раз на день." },
  ]);
  expect(hydrateText("Невідоме [Unknown/Spell].", [spell])).toEqual([{ type: "text", text: "Невідоме [Unknown/Spell]." }]);
});

const brownBear: HydrationTarget = { kind: "creature", name: "Бурий ведмідь", engName: "Brown Bear", href: "/bestiary?creature=brown-bear" };
const hunterMultiattack: HydrationTarget = { kind: "feature", name: "Мультиатака", engName: "Multiattack", href: "/classes?class=ranger&subclass=hunter-conclave&feature=multiattack-hunter-11" };

function buildCreature(slug: string, name: string, engName: string): HydrationTarget {
  return { kind: "creature", name, engName, href: `/bestiary?creature=${slug}` };
}

function buildCreatureAbility(slug: string, name: string, engName: string): HydrationTarget {
  return { kind: "feature", name, engName, href: `/bestiary?creature=${slug}&feature=${engName.toLowerCase()}`, priority: -1 };
}

function hydrateSection(paragraphs: readonly string[], sectionTargets: HydrationTarget[]) {
  const revision = fixtureCorpus().translations[0];
  revision.sections = [{ ...revision.sections[0], blocks: paragraphs.map((text, index) => ({ type: "paragraph" as const, blockId: `p${index}`, content: [{ type: "text" as const, text }] })) }];
  const sectionAbilities = collectSectionCreatureAbilities([revision], sectionTargets);
  const references = sectionTargets.map((target) => ({ kind: target.kind === "creature" ? "creature" as const : "feature" as const, name: target.name, engName: target.engName, href: target.href, description: target.engName, details: [] }));
  const alternatives = collectAmbiguousHydration([revision], [...sectionTargets, ...sectionAbilities], references);
  const hydrated = hydrateArticleRevision(revision, [...sectionTargets, ...sectionAbilities, ...alternatives.targets]);
  const links = hydrated.sections[0].blocks.map((block) => block.type === "paragraph" ? block.content.filter((node) => node.type === "link").map((node) => node.href) : []);
  return { links, alternatives: alternatives.references };
}

it("links a creature ability to the creature named in the same passage instead of a class feature", () => {
  const multiattack = buildCreatureAbility("brown-bear", "Мультиатака", "Multiattack");
  const nodes = hydrateText("Бурий ведмідь{{Brown Bear}} має «Мультиатаку»{{Multiattack}}.", [brownBear, multiattack, hunterMultiattack]);
  expect(nodes.filter((node) => node.type === "link").map((node) => node.href)).toEqual([brownBear.href, multiattack.href]);
});

it("keeps the existing target for an ability name when the passage names no creature", () => {
  const nodes = hydrateText("Мисливець бере «Мультиатаку»{{Multiattack}}.", [buildCreatureAbility("brown-bear", "Мультиатака", "Multiattack"), hunterMultiattack]);
  expect(nodes.filter((node) => node.type === "link").map((node) => node.href)).toEqual([hunterMultiattack.href]);
});

it("keeps the article's own section feature beside a creature with the same ability", () => {
  const ownCharge = { kind: "feature" as const, name: "Наступ", engName: "Charge", href: "/races?race=centaur&feature=charge", priority: 2 };
  const nodes = hydrateText("Як і Козел{{Goat}}, ви маєте «Наступ»{{Charge}}.", [buildCreature("goat", "Козел", "Goat"), buildCreatureAbility("goat", "Наступ", "Charge"), ownCharge]);
  expect(nodes.filter((node) => node.type === "link").map((node) => node.href)).toEqual(["/bestiary?creature=goat", ownCharge.href]);
});

it("offers a chooser of exactly the passage's two owners and drops a link whose owners differ from the section's", () => {
  const elk = buildCreature("giant-elk", "Гігантський лось", "Giant Elk");
  const rhinoceros = buildCreature("rhinoceros", "Носоріг", "Rhinoceros");
  const charges = [buildCreatureAbility("giant-elk", "Наступ", "Charge"), buildCreatureAbility("rhinoceros", "Наступ", "Charge")];
  const twoOwners = hydrateSection(["Носоріг{{Rhinoceros}} б'є «Наступом»{{Charge}} сильніше, ніж Гігантський лось{{Giant Elk}}."], [elk, rhinoceros, ...charges]);
  const chooser = twoOwners.alternatives.find((reference) => reference.href.startsWith("/classes?reference=charge&"));
  expect(chooser?.options?.map((option) => option.href)).toEqual(charges.map((charge) => charge.href));
  expect(twoOwners.links[0]).toEqual([rhinoceros.href, chooser?.href, elk.href]);
  const boar = buildCreature("giant-boar", "Гігантський вепр", "Giant Boar");
  const threeInSection = hydrateSection(["Гігантський вепр{{Giant Boar}}.", "Носоріг{{Rhinoceros}} і Гігантський лось{{Giant Elk}} мають «Наступ»{{Charge}}."],
    [elk, rhinoceros, boar, ...charges, buildCreatureAbility("giant-boar", "Наступ", "Charge")]);
  expect(threeInSection.links[1]).toEqual([rhinoceros.href, elk.href]);
});
