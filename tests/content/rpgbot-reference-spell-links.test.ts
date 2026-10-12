import { expect, it } from "vitest";
import { hydrateReferenceSpellLinks } from "@/lib/optimization/reference-spell-links";
import type { ContentReference } from "@/lib/optimization/types";

const spells = [{ name: "Пошук предмета [Locate Object]", engName: "Locate Object" }];
const reference: ContentReference = { kind: "feature", name: "Магія", engName: "Magic", href: "/classes?feature=magic", details: [],
  description: 'Ви можете накласти Пошук предмета [Locate Object]. <a href="/spells/locate-object">Пошук предмета [Locate Object]</a>. [Пошук предмета [Locate Object]](/spells/locate-object).' };

it("links exact canonical spell names inside native descriptions, preserving existing links", () => {
  const result = hydrateReferenceSpellLinks([reference], spells, "RULES_2014")[0];
  expect(result.description).toBe('Ви можете накласти <a href="/spells/locate-object">Пошук предмета</a>. <a href="/spells/locate-object">Пошук предмета [Locate Object]</a>. [Пошук предмета [Locate Object]](/spells/locate-object).');
  expect(hydrateReferenceSpellLinks([result], spells, "RULES_2014")[0]).toEqual(result);
});

it("does not guess a spell from an English name or a different Ukrainian wording", () => {
  const value = { ...reference, description: "Locate Object, Пошук [Locate Object]." };
  expect(hydrateReferenceSpellLinks([value], spells, "RULES_2014")[0]).toEqual(value);
});

it("takes the spell edition from the reference catalog", () => {
  expect(hydrateReferenceSpellLinks([reference], spells, "RULES_2024")[0].description).toContain('href="/2024/spells/locate-object"');
});

it("hydrates spell links in each alternative without altering its owning feature", () => {
  const alternatives = { ...reference, options: [reference, { ...reference, href: "/classes?feature=other" }] };
  const hydrated = hydrateReferenceSpellLinks([alternatives], spells, "RULES_2014")[0];
  expect(hydrated.options?.map((option) => option.href)).toEqual([reference.href, "/classes?feature=other"]);
  expect(hydrated.options?.every((option) => option.description?.includes('href="/spells/locate-object"'))).toBe(true);
  expect(alternatives.options[0].description).toBe(reference.description);
});
