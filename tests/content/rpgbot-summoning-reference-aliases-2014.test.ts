import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { collectSummoningReferenceAliases } from "@/lib/optimization/summoning-reference-aliases";
import { collectCreatureReferences } from "@/lib/optimization/creature-hydration";
import { collectSectionTargets, hydrateArticleRevision } from "@/lib/optimization/content-hydration";
import { parseArticleDocument } from "@/lib/optimization/document";
import { getCreatureByIdOrSlug } from "@/lib/bestiaryData";

const article = parseArticleDocument(JSON.parse(readFileSync("data/rpgbot/uk/rpgbot-summoning-2014.json", "utf8")));
const parents = collectCreatureReferences("RULES_2014");
const aliases = collectSummoningReferenceAliases(article.article, parents);

it.each([
  ["section-summon-aberration", "aberrant-spirit", ["Beholderkin", "Slaad", "Star Spawn"]],
  ["section-summon-elemental", "elemental-spirit", ["Air", "Earth", "Fire", "Water"]],
  ["section-summon-fiend", "fiendish-spirit", ["Demon", "Devil", "Yugoloth"]],
] as const)("links actual marked forms in %s to their complete parent spirit", (sectionId, slug, forms) => {
  const revision = hydrateArticleRevision(article.translations[0], aliases);
  const section = revision.sections.find((entry) => entry.sectionId === sectionId)!;
  const formList = section.blocks.find((block) => block.type === "list")!;
  expect(formList.type).toBe("list");
  if (formList.type !== "list") throw new Error("Expected source form list");
  for (const form of forms) {
    expect(formList.items.flat()).toContainEqual(expect.objectContaining({ type: "link", text: form, href: `/bestiary?creature=${slug}` }));
    const parent = parents.find((entry) => entry.href === `/bestiary?creature=${slug}`)!;
    expect(parent.description).toContain("{{Multiattack}}");
    const native = getCreatureByIdOrSlug(slug, "RULES_2014")!;
    expect(parent.description).toContain(native.actions);
    expect(parent.description).toContain(native.specialAbilities);
  }
});

it("keeps all four elemental movement and resistance choices plus both scaling formulas", () => {
  const native = getCreatureByIdOrSlug("elemental-spirit", "RULES_2014")!;
  expect(native.ac).toContain("11 + рівень заклинання");
  expect(native.hp).toContain("50 + 10 за кожен рівень заклинання, вищий за 4");
  for (const choice of ["Земляний", "Повітряний", "Водний"]) expect(native.speed).toContain(choice);
  for (const choice of ["Водний", "Повітряний", "Земляний"]) expect(native.damageResistance).toContain(choice);
  expect(native.damageImmunity).toContain("Вогняний");
  expect(native.actions).toContain("половині рівня цього заклинання з округленням униз");
  expect(native.actions).toContain("1к10 + 4 + рівень заклинання");
  expect(native.specialAbilities).toContain("1 дюйм");
});

it("never adds generic creature types or elemental names to other articles, sections or 2024", () => {
  expect(collectSummoningReferenceAliases({ slug: "artificer-2014", ruleset: "RULES_2014" }, parents)).toEqual([]);
  expect(collectSummoningReferenceAliases({ slug: "summoning-2014", ruleset: "RULES_2024" }, parents)).toEqual([]);
  expect(collectSectionTargets(aliases, "section-artificer-races")).toEqual([]);
  expect(collectSectionTargets(aliases, "section-summon-fiend").map((entry) => entry.engName)).toEqual(["Demon", "Devil", "Yugoloth"]);
  expect(aliases.every((entry) => entry.markerOnly && !entry.linkPlainText)).toBe(true);
});

it("does not fabricate forms when their complete native parent is absent or belongs to 2024", () => {
  expect(collectSummoningReferenceAliases(article.article, [])).toEqual([]);
  expect(collectSummoningReferenceAliases(article.article, parents.map((parent) => ({ ...parent, href: `/2024${parent.href}` })))).toEqual([]);
  expect(collectSummoningReferenceAliases(article.article, [{ name: "Fire", engName: "Elemental Spirit", kind: "term", href: "/rules/fire" }])).toEqual([]);
});
