import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { findProseProblems } from "./catalog-prose-checks";

type ClassSource = { engName: string; flavorText?: string };
type SpeciesSource = { engName: string; description: string; traits: { engName: string; name: string }[] };
type SubclassSource = { engName: string; name: string; flavorText: string; features: { name: string; description?: string }[] };

const classes: ClassSource[] = JSON.parse(readFileSync("data/2024/normalized/classes.json", "utf8"));
const species: SpeciesSource[] = JSON.parse(readFileSync("data/2024/normalized/species.json", "utf8"));
const subclasses: SubclassSource[] = JSON.parse(readFileSync("data/2024/normalized/subclasses.json", "utf8"));

/// KR33.7: «Коледж» розходився з назвою «Колегія», а «Феєрія» — зі словниковим «Фейвайлд» і
/// рисою 2014 «Фейське підкріплення» (рішення власника 2026-09-13). «Тіньовий Діл» і «Дальній
/// Простір» розходилися зі словниковими «Царство тіней» і «Далеке Царство».
const RETIRED_SUBCLASS_FORMS = /Коледж|Феєрі|Тін(?:ьов|яв)[а-яі]* Дол|Дальн[а-яі]* Простор/iu;

function stripMarkers(text: string): string {
  return text.replace(/\{\{[^{}]*\}\}/g, "");
}

function findLatinWords(text: string): string[] {
  return stripMarkers(text).match(/[A-Za-z]{3,}/g) ?? [];
}

describe("KR33.4 — проза каталогу 2024", () => {
  it("кожен із 13 класів має українську прозу без знятих форм", () => {
    expect(classes).toHaveLength(13);
    expect(findProseProblems(classes.map((entry) => ({ name: entry.engName, prose: entry.flavorText })))).toEqual([]);
  });

  it("кожен із 10 видів має опис без знятих форм", () => {
    expect(species).toHaveLength(10);
    expect(findProseProblems(species.map((entry) => ({ name: entry.engName, prose: entry.description })))).toEqual([]);
  });

  it("кожен із 76 підкласів має опис без знятих форм і без англійських назв поза маркером", () => {
    expect(subclasses).toHaveLength(76);
    expect(findProseProblems(subclasses.map((entry) => ({ name: entry.engName, prose: entry.flavorText })))).toEqual([]);
    expect(subclasses.filter((entry) => findLatinWords(entry.flavorText).length > 0).map((entry) => entry.engName)).toEqual([]);
  });

  it("підкласи й їхні риси не повертають «Коледж», «Феєрію», «Тіньовий Діл» і «Дальній Простір»", () => {
    const texts = subclasses.flatMap((entry) => [
      { name: entry.engName, text: `${entry.name} ${entry.flavorText}` },
      ...entry.features.map((feature) => ({ name: `${entry.engName}: ${feature.name}`, text: `${feature.name} ${feature.description ?? ""}` })),
    ]);

    expect(texts.filter(({ text }) => RETIRED_SUBCLASS_FORMS.test(stripMarkers(text))).map(({ name }) => name)).toEqual([]);
  });

  it("Fiend тифлінга — Почвара, а не Демон", () => {
    const tiefling = species.find((entry) => entry.engName === "Tiefling")!;

    expect(tiefling.description).not.toMatch(/Демоном|демонічн/u);
    expect(tiefling.traits.find((trait) => trait.engName === "Fiendish Legacy")?.name).toBe("Почварна спадщина");
  });
});
