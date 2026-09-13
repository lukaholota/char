/**
 * KR31.5 — переливає «завжди підготовлені» заклинання підкласів 2024 у
 * `data/2024/normalized/subclasses.json`.
 *
 * Правити перелік руками у файлі не можна: джерело — сторінки `data/2024/source/raw/subclass/`,
 * і гейт `tests/content/subclass-prepared-spells-2024.test.ts` червоніє, щойно файл розійдеться з
 * ними ([Р33](../../docs/DECISIONS.md#р33)).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readSubclassSources } from "./parse-subclasses";
import {
  extractSubclassPreparedSpells2024,
  type PreparedSpellsAtLevel,
  type SubclassPreparedSpells2024,
} from "./subclass-prepared-spells";
import { SUBCLASSES_JSON } from "./parse-subclass-feature-uses";
import { withFieldAfterName, withoutField } from "./feature-field-order";

type SubclassFeatureEng2024 = {
  level: number;
  name: string;
  preparedSpells?: PreparedSpellsAtLevel[];
  [key: string]: unknown;
};

type SubclassJson2024 = {
  engName: string;
  featuresEng?: SubclassFeatureEng2024[];
  [key: string]: unknown;
};

export function applyPreparedSpellsToSubclasses(
  subclasses: SubclassJson2024[],
  preparedSpells: readonly SubclassPreparedSpells2024[],
): SubclassJson2024[] {
  const byKey = new Map(preparedSpells.map((row) => [buildFeatureKey(row.subclassEngName, row.featureName), row]));

  return subclasses.map((subclass) => ({
    ...subclass,
    featuresEng: (subclass.featuresEng ?? []).map((feature) => {
      const row = byKey.get(buildFeatureKey(subclass.engName, feature.name));

      return row
        ? withFieldAfterName(feature, "preparedSpells", row.byLevel)
        : withoutField(feature, "preparedSpells");
    }),
  }));
}

/// Та сама нормалізація друкарні, що в проході лічильників: `Monk’s Focus` проти `Monk's Focus`.
function buildFeatureKey(subclassEngName: string, featureName: string): string {
  return `${subclassEngName}|${featureName.replace(/[’ʼ‘]/g, "'").toLowerCase()}`;
}

function main() {
  const subclassesPath = join(process.cwd(), SUBCLASSES_JSON);
  const subclasses: SubclassJson2024[] = JSON.parse(readFileSync(subclassesPath, "utf-8"));
  const preparedSpells = extractSubclassPreparedSpells2024(readSubclassSources());

  const withPreparedSpells = applyPreparedSpellsToSubclasses(subclasses, preparedSpells);
  writeFileSync(subclassesPath, `${JSON.stringify(withPreparedSpells, null, 2)}\n`, "utf-8");

  const spells = preparedSpells.reduce(
    (total, row) => total + row.byLevel.reduce((count, level) => count + level.spellsEng.length, 0),
    0,
  );
  console.log(`✅ ${preparedSpells.length} підкласів, ${spells} згадок заклинань → ${SUBCLASSES_JSON}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
