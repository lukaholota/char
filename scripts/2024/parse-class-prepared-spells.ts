/**
 * KR31.5 — переливає класові «завжди підготовлені» заклинання 2024 у
 * `data/2024/normalized/classes.json`.
 *
 * Правити перелік руками у файлі не можна: джерело — `data/2024/srd/classes.md`, і гейт
 * `tests/content/class-prepared-spells-2024.test.ts` червоніє, щойно файл розійдеться з ним
 * ([Р33](../../docs/DECISIONS.md#р33)).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractClassPreparedSpells2024, type ClassPreparedSpells2024 } from "./class-prepared-spells";
import { CLASSES_JSON } from "./parse-class-feature-uses";
import { readSrdClassFeatureBodies } from "./verify-class-features";
import { withFieldAfterName, withoutField } from "./feature-field-order";

const SRD_CLASSES_MD = "data/2024/srd/classes.md";

type ClassFeatureEng2024 = { level: number; name: string; alwaysPreparedSpells?: string[]; [key: string]: unknown };
type ClassJson2024 = { engName: string; featuresEng?: ClassFeatureEng2024[]; [key: string]: unknown };

export function applyPreparedSpellsToClasses(
  classes: ClassJson2024[],
  preparedSpells: readonly ClassPreparedSpells2024[],
): ClassJson2024[] {
  const byKey = new Map(
    preparedSpells.map((row) => [buildFeatureKey(row.className, row.level, row.featureName), row]),
  );

  return classes.map((characterClass) => ({
    ...characterClass,
    featuresEng: (characterClass.featuresEng ?? []).map((feature) => {
      const row = byKey.get(buildFeatureKey(characterClass.engName, feature.level, feature.name));
      return row
        ? withFieldAfterName(feature, "alwaysPreparedSpells", row.spellsEng)
        : withoutField(feature, "alwaysPreparedSpells");
    }),
  }));
}

/// Та сама нормалізація друкарні, що в проході лічильників: `Paladin’s Smite` проти `Paladin's Smite`.
function buildFeatureKey(className: string, level: number, featureName: string): string {
  return `${className}|${level}|${featureName.replace(/[’ʼ‘]/g, "'").toLowerCase()}`;
}

function main() {
  const classesPath = join(process.cwd(), CLASSES_JSON);
  const classes: ClassJson2024[] = JSON.parse(readFileSync(classesPath, "utf-8"));
  const srdMarkdown = readFileSync(join(process.cwd(), SRD_CLASSES_MD), "utf-8");
  const preparedSpells = extractClassPreparedSpells2024(readSrdClassFeatureBodies(srdMarkdown));

  writeFileSync(classesPath, `${JSON.stringify(applyPreparedSpellsToClasses(classes, preparedSpells), null, 2)}\n`, "utf-8");

  const spells = preparedSpells.reduce((total, row) => total + row.spellsEng.length, 0);
  console.log(`✅ ${preparedSpells.length} класових фіч, ${spells} заклинань → ${CLASSES_JSON}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
