import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parseArticleDocument } from "@/lib/optimization/document";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";
import { buildTermCard } from "@/lib/term-card";
import { collectTermSources } from "@/lib/term-sources";
import { findRuleTermHref } from "@/lib/term-link";
import { collectEntityReferences } from "@/lib/optimization/entity-hydration";
import { readSubclassFeatureSeedInputs } from "../../prisma/seed/subclassFeatureSeed";

async function readGuide(slug: string) {
  return hydrateArticleDocument(parseArticleDocument(JSON.parse(readFileSync(`data/rpgbot/uk/rpgbot-${slug}-2014.json`, "utf8"))));
}

it("existing individual maneuver references retain their complete native descriptions", async () => {
  const article = await readGuide("fighter-battle-master");
  const references = article.contentReferences.flatMap((entry) => entry.options ?? [entry]);
  const source = readSubclassFeatureSeedInputs();
  for (const original of ["Trip Attack", "Precision Attack", "Goading Attack", "Commander's Strike"]) {
    const seed = source.find((entry) => entry.engName === original)!;
    const reference = references.find((entry) => entry.engName === original);
    expect(reference?.description, original).toBe(seed.description);
    expect(reference?.description?.length, original).toBeGreaterThan(150);
  }
});

it("generic Maneuvers opens Combat Superiority with resource, learning and save rules", async () => {
  const article = await readGuide("classes");
  const reference = article.contentReferences.flatMap((entry) => entry.options ?? [entry]).find((entry) => entry.engName === "Combat Superiority");
  expect(reference?.description).toContain("три маневри");
  expect(reference?.description).toContain("лише один маневр на атаку");
  expect(reference?.description).toContain("4 кубики переваги");
  expect(reference?.description).toContain("модифікатор Сили або Спритності");
  expect(JSON.stringify(article.translations)).not.toContain("{{Маневрів|Maneuvers}}");
});

it("named DMG poisons open their complete individual 2014 descriptions", async () => {
  const article = await readGuide("poisoner-poison-and-poisoning");
  const sources = collectTermSources();
  for (const [original, damage] of [["Serpent Venom", "10 (3к6)"], ["Wyvern Poison", "24 (7к6)"], ["Purple Worm Poison", "42 (12к6)"]]) {
    const href = findRuleTermHref(original, "RULES_2014");
    expect(href, original).toBeTruthy();
    expect(JSON.stringify(article.translations), original).toContain(href);
    const card = buildTermCard({ original, ruleset: "RULES_2014" }, sources);
    expect(card.article?.subsection?.content, original).toContain(damage);
    expect(card.article?.ruleset).toBe("RULES_2014");
  }
});

it("2014 poison routing does not substitute the 2024 poison chapter", () => {
  const poison = collectEntityReferences("RULES_2014").find((entry) => entry.engName === "Poisons");
  expect(poison?.href).toBe("/rules/gamemaster#poisons");
});
