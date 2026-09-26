import { describe, expect, it } from "vitest";

import { getAllClasses } from "@/lib/classesData";
import { findClassTables } from "@/lib/catalogs/class-tables";
import { findFeatureKey } from "@/lib/catalogs/reading-target";

const RULESETS = ["RULES_2014", "RULES_2024"] as const;

describe("O44 — назва здібності в таблиці класу веде до її опису в каталозі", () => {
  for (const ruleset of RULESETS) {
    it(`${ruleset}: кожне посилання таблиці знаходить здібність каталогу`, () => {
      const tables = findClassTables(ruleset);
      const misses: string[] = [];

      for (const characterClass of getAllClasses(ruleset)) {
        const catalogKeys = new Set(characterClass.features.map(findFeatureKey));
        for (const row of tables[characterClass.key]?.rows ?? []) {
          for (const feature of row.features) {
            if (feature.kind === "class" && !catalogKeys.has(findFeatureKey(feature))) {
              misses.push(`${characterClass.key} ${row.level}: ${feature.name} [${feature.engName}]`);
            }
          }
        }
      }

      expect(misses).toEqual([]);
    });

    it(`${ruleset}: таблиця є в кожного класу каталогу`, () => {
      const tables = findClassTables(ruleset);

      expect(getAllClasses(ruleset).filter((characterClass) => !tables[characterClass.key]).map((c) => c.key)).toEqual([]);
    });
  }
});
