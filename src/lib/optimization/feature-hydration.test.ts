import { expect, it } from "vitest";
import { getAllClasses } from "@/lib/classesData";
import { findFeatureKey, findPlainEnglishName } from "@/lib/catalogs/reading-target";
import { collectArticleFeatureHydration } from "./feature-hydration";
import { hydrateArticleRevision } from "./content-hydration";
import { fixtureCorpus } from "./fixtures.test-helper";
import type { EntityBinding } from "./types";

it("resolves shared feature names to the article's class instead of another class", () => {
  const corpus = fixtureCorpus();
  const article = { ...corpus.articles[0], ruleset: "RULES_2014" as const, topics: ["Монах"] };
  const revision = corpus.translations[0];
  revision.sections[0].blocks = [{ type: "paragraph", blockId: "feature", content: [{ type: "text", text: "Додаткова атака{{Extra Attack}}" }] }];
  const targets = collectArticleFeatureHydration(article, [revision], []).targets;
  expect(hydrateArticleRevision(revision, targets).sections[0].blocks[0]).toMatchObject({ content: [{ type: "link", href: "/classes?class=monk&feature=extra-attack-monk-5" }] });
});

it.each(["RULES_2014", "RULES_2024"] as const)("opens the correct official subclass feature in %s", (ruleset) => {
  const characterClass = getAllClasses(ruleset).find((entry) => entry.engName === "Monk")!;
  const subclass = characterClass.subclasses[0];
  const feature = subclass.features[0];
  const corpus = fixtureCorpus();
  const article = { ...corpus.articles[0], ruleset, topics: [characterClass.name] };
  const revision = corpus.translations[0];
  revision.sections[0].blocks = [{ type: "paragraph", blockId: "feature", content: [{ type: "text", text: `{{Назва|${findPlainEnglishName(feature.engName)}}}` }] }];
  const hydration = collectArticleFeatureHydration(article, [revision], [], subclass.key);
  const block = hydrateArticleRevision(revision, hydration.targets).sections[0].blocks[0];
  if (block.type !== "paragraph" || block.content[0].type !== "link") throw new Error("Expected official feature link");
  const href = block.content[0].href;
  const reference = hydration.references.find((reference) => reference.href === href)!;
  expect(reference.description).toBe(feature.description);
  expect(reference.description).toMatch(/[А-Яа-яІіЇїЄє]/);
  expect(reference.href.startsWith("/2024/")).toBe(ruleset === "RULES_2024");
  expect(reference.href).toContain(`feature=${findFeatureKey(feature)}`);
});

it("attaches reverse analysis only for an unambiguous primary native feature key", () => {
  const corpus = fixtureCorpus();
  const characterClass = getAllClasses("RULES_2014").find((entry) => entry.engName === "Monk")!;
  const subclass = characterClass.subclasses[0];
  const nativeFeature = subclass.features[0];
  const article = { ...corpus.articles[0], ruleset: "RULES_2014" as const, topics: [characterClass.name] };
  const binding: EntityBinding = { ...corpus.bindings[0], entity: { ruleset: article.ruleset, kind: "feature",
    parentKey: subclass.key, entityKey: findFeatureKey(nativeFeature) }, primary: true };
  const findAnalysis = (bindings: EntityBinding[]) => collectArticleFeatureHydration(article, corpus.translations, bindings)
    .references.find((reference) => reference.href.includes(`subclass=${subclass.slug}&feature=${findFeatureKey(nativeFeature)}`))!.feature;
  expect(findAnalysis([binding])?.featureKey).toBe(findFeatureKey(nativeFeature));
  expect(findAnalysis([])).toBeUndefined();
  expect(findAnalysis([{ ...binding, primary: false }])).toBeUndefined();
  expect(findAnalysis([binding, { ...binding, bindingId: "conflicting-primary" }])).toBeUndefined();
  expect(findAnalysis([{ ...binding, entity: { ...binding.entity, ruleset: "RULES_2024" } }])).toBeUndefined();
  expect(findAnalysis([binding, { ...binding, bindingId: "secondary", primary: false }])?.featureKey).toBe(findFeatureKey(nativeFeature));
});
