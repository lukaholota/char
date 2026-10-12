import { expect, it } from "vitest";
import { hydrateArticleRevision, type HydrationTarget } from "./content-hydration";
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
