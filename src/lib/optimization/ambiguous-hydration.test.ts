import { expect, it } from "vitest";
import { collectAmbiguousHydration } from "./ambiguous-hydration";
import { hydrateArticleRevision } from "./content-hydration";
import { fixtureCorpus } from "./fixtures.test-helper";
import type { ContentReference } from "./types";

it("makes a shared feature readable without guessing its owner or merging its rules", () => {
  const revision = fixtureCorpus().translations[0];
  revision.sections[0].blocks = [{ type: "paragraph", blockId: "shared", content: [{ type: "strong", text: "Додаткова атака" }, { type: "text", text: "{{Extra Attack}}: аналіз." }] }];
  const references: ContentReference[] = ["Бард", "Боєць"].map((name) => ({ kind: "feature", name: "Додаткова атака", engName: "Extra Attack", href: `/classes?class=${name}`, description: `Правила: ${name}`, details: [{ label: "Клас", value: name }] }));
  const alternatives = collectAmbiguousHydration([revision], references, references);
  const hydrated = hydrateArticleRevision(revision, [...references, ...alternatives.targets]);
  expect(hydrated.sections[0].blocks[0]).toMatchObject({ content: [{ type: "link", text: "Додаткова атака", format: "strong", href: expect.stringContaining("reference=") }, { type: "text", text: ": аналіз." }] });
  expect(alternatives.references.find((reference) => reference.engName === "Extra Attack")?.options?.map((option) => option.description)).toEqual(["Правила: Бард", "Правила: Боєць"]);
});

it("keeps contextual class selection ahead of global alternatives", () => {
  const revision = fixtureCorpus().translations[0];
  const reference: ContentReference = { kind: "feature", name: "Здібність", engName: "Feature", href: "/classes?class=monk", description: "Правила", details: [] };
  const targets = [{ ...reference, priority: 1 }, { ...reference, href: "/classes?class=fighter" }];
  expect(collectAmbiguousHydration([revision], targets, [reference, { ...reference, href: "/classes?class=fighter" }]).references).toEqual([]);
});

it("only creates alternatives for names present in the matching section", () => {
  const revision = fixtureCorpus().translations[0];
  revision.sections[0].blocks = [{ type: "paragraph", blockId: "used", content: [{ type: "text", text: "Ухилення{{Evasion}}" }] }];
  const references: ContentReference[] = ["Evasion", "Flyby"].flatMap((engName) => ["one", "two"].map((owner) => ({
    kind: "feature" as const, name: engName === "Evasion" ? "Ухилення" : "Проліт", engName,
    href: `/bestiary?creature=${owner}&feature=${engName}`, description: `Правило ${owner}`, details: [],
  })));
  const alternatives = collectAmbiguousHydration([revision], references, references);
  expect(alternatives.references.length).toBeGreaterThan(0);
  expect(alternatives.references.every((reference) => reference.engName === "Evasion")).toBe(true);
  expect(alternatives.references.every((reference) => reference.options?.length === 2)).toBe(true);
});
