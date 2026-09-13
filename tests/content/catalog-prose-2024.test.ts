import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CORPUS_RETIRED_FORMS } from "./ratified-term-forms";

type ClassSource = { engName: string; flavorText?: string };
type SpeciesSource = { engName: string; description: string; traits: { engName: string; name: string }[] };

const classes: ClassSource[] = JSON.parse(readFileSync("data/2024/normalized/classes.json", "utf8"));
const species: SpeciesSource[] = JSON.parse(readFileSync("data/2024/normalized/species.json", "utf8"));

function findProseProblems(entries: { engName: string; prose: string | undefined }[]): string[] {
  return entries.flatMap(({ engName, prose }) => {
    if (!prose?.trim()) return [`${engName}: немає прози`];
    const retired = CORPUS_RETIRED_FORMS.filter(({ pattern }) => pattern.test(prose)).map(
      ({ label }) => `${engName}: знята форма «${label}»`,
    );
    const unclosed = /\{\{[^}]*$|^[^{]*\}\}/m.test(prose) ? [`${engName}: незакритий маркер`] : [];
    return [...retired, ...unclosed];
  });
}

describe("KR33.4 — проза каталогу 2024", () => {
  it("кожен із 13 класів має українську прозу без знятих форм", () => {
    expect(classes).toHaveLength(13);
    expect(findProseProblems(classes.map((entry) => ({ engName: entry.engName, prose: entry.flavorText })))).toEqual([]);
  });

  it("кожен із 10 видів має опис без знятих форм", () => {
    expect(species).toHaveLength(10);
    expect(findProseProblems(species.map((entry) => ({ engName: entry.engName, prose: entry.description })))).toEqual([]);
  });

  it("Fiend тифлінга — Почвара, а не Демон", () => {
    const tiefling = species.find((entry) => entry.engName === "Tiefling")!;

    expect(tiefling.description).not.toMatch(/Демоном|демонічн/u);
    expect(tiefling.traits.find((trait) => trait.engName === "Fiendish Legacy")?.name).toBe("Почварна спадщина");
  });
});
