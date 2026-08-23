/**
 * Валідує вхідний JSON, а не те, що сід застосований до бази.
 * Стан бази перевіряє tests/db/features-2024-seeded.test.ts — до KR13.1 його не було,
 * і саме тому 0 рядків race_trait у робочій базі пройшли повз зелені тести.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Trait = {
  engName: string;
  name: string;
  descriptionEng: string;
  description?: string;
};

type Species = {
  ruleset: string;
  engName: string;
  name: string;
  shortDescription: string;
  description: string;
  creatureType: string;
  size: string[];
  speed: number;
  traits: Trait[];
  source: string;
};

describe("species.json — вхідні дані расових рис 2024 (не стан бази)", () => {
  const raw = readFileSync(
    join(process.cwd(), "data/2024/normalized/species.json"),
    "utf-8"
  );
  const speciesList: Species[] = JSON.parse(raw);

  it("contains exactly 10 PHB 2024 species", () => {
    expect(speciesList.length).toBe(10);
    const expectedSpecies = [
      "Aasimar",
      "Dragonborn",
      "Dwarf",
      "Elf",
      "Gnome",
      "Goliath",
      "Halfling",
      "Human",
      "Orc",
      "Tiefling",
    ];
    const actualSpecies = speciesList.map((s) => s.engName);
    expect(actualSpecies.sort()).toEqual(expectedSpecies.sort());
  });

  it("every species has valid metadata and Ukrainian name & description", () => {
    for (const sp of speciesList) {
      expect(sp.ruleset).toBe("RULES_2024");
      expect(sp.source).toBe("PHB_2024");
      expect(sp.name.trim().length).toBeGreaterThan(0);
      expect(sp.engName.trim().length).toBeGreaterThan(0);
      expect(sp.shortDescription.trim().length).toBeGreaterThan(0);
      expect(sp.description.trim().length).toBeGreaterThan(0);
      expect(sp.speed).toBeGreaterThan(0);
      expect(sp.size.length).toBeGreaterThan(0);
      expect(sp.traits.length).toBeGreaterThan(0);
    }
  });

  it("every trait in every species has complete Ukrainian translation", () => {
    let totalTraits = 0;
    for (const sp of speciesList) {
      for (const trait of sp.traits) {
        totalTraits++;
        expect(trait.name.trim().length, `${sp.engName} trait name missing`).toBeGreaterThan(0);
        expect(trait.engName.trim().length, `${sp.engName} trait engName missing`).toBeGreaterThan(0);
        expect(trait.description, `${sp.engName} trait "${trait.name}" description missing`).toBeDefined();
        expect(trait.description!.trim().length, `${sp.engName} trait "${trait.name}" description is empty`).toBeGreaterThan(10);

        // Ensure description is in Ukrainian (contains Cyrillic characters)
        const hasCyrillic = /[а-яіїєґА-ЯІЇЄҐ]/.test(trait.description!);
        expect(hasCyrillic, `${sp.engName} trait "${trait.name}" should have Ukrainian translation`).toBe(true);

        // Ensure untranslated English templates are not present
        expect(trait.description).not.toMatch(/^You have/i);
        expect(trait.description).not.toMatch(/^When you reach/i);
        expect(trait.description).not.toMatch(/^As a Bonus Action/i);
      }
    }
    // Total traits across 10 species should be at least 40
    expect(totalTraits).toBeGreaterThanOrEqual(40);
  });
});
