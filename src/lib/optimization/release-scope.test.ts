import { expect, it } from "vitest";
import { generateIndices } from "./indices";
import { fixtureCorpus } from "./fixtures.test-helper";

it("keeps published 2024 articles, bindings and search out of the 2014 MVP", () => {
  const corpus = structuredClone(fixtureCorpus());
  corpus.sources[0].rulesets = ["RULES_2024"];
  for (const article of corpus.articles) article.ruleset = "RULES_2024";
  for (const binding of corpus.bindings) binding.entity.ruleset = "RULES_2024";
  expect(corpus.articles[0].status).toBe("published");
  expect(generateIndices(corpus, corpus.bindings.map((binding) => binding.entity))).toEqual({ articles: [], bindings: [], search: [] });
});
