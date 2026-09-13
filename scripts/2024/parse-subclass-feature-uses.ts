/**
 * KR31.3 — переливає числа використань, пули й тип дії підкласових фіч у
 * `data/2024/normalized/subclasses.json`.
 *
 * Правити числа руками у файлі не можна: джерело — сторінки `data/2024/source/raw/subclass/`,
 * і гейт `tests/content/subclass-feature-uses-2024.test.ts` червоніє, щойно файл розійдеться з
 * ними ([Р33](../../docs/DECISIONS.md#р33) — механіка живе в джерелі, не в проході по базі).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readSubclassSources } from "./parse-subclasses";
import {
  extractSubclassFeatureMechanics2024,
  type SubclassFeatureMechanics2024,
  type SubclassFeatureUses2024,
} from "./subclass-feature-uses";
import type { DisplayTypeName } from "./feature-uses-from-text";

export const SUBCLASSES_JSON = "data/2024/normalized/subclasses.json";

type SubclassFeatureEng2024 = {
  level: number;
  name: string;
  displayType?: DisplayTypeName[];
  uses?: SubclassFeatureUses2024;
  [key: string]: unknown;
};

type SubclassJson2024 = {
  engName: string;
  featuresEng?: SubclassFeatureEng2024[];
  [key: string]: unknown;
};

/**
 * Назва фічі як ключ звірки. Нормалізація потрібна з тієї ж причини, що в класовому проході:
 * `featuresEng` у файлі й текст у сирій сторінці — це два зняття того самого корпусу, і вони
 * розходяться в друкарні (`Monk’s Focus` проти `Monk's Focus`). Перейменувати фічу у файлі не
 * можна — її назва вже стоїть у `feature.eng_name` бази.
 */
function buildFeatureKey(subclassEngName: string, level: number, featureName: string): string {
  const name = featureName.replace(/[’ʼ‘]/g, "'").toLowerCase();
  return `${subclassEngName}|${level}|${name}`;
}

export function applyMechanicsToSubclasses(
  subclasses: SubclassJson2024[],
  mechanics: SubclassFeatureMechanics2024[],
): SubclassJson2024[] {
  const byKey = new Map(
    mechanics.map((row) => [buildFeatureKey(row.subclassEngName, row.level, row.featureName), row]),
  );

  return subclasses.map((subclass) => ({
    ...subclass,
    featuresEng: (subclass.featuresEng ?? []).map((feature) => {
      const { uses: _dropped, displayType: _also, ...withoutMechanics } = feature;

      const row = byKey.get(buildFeatureKey(subclass.engName, feature.level, feature.name));
      if (!row) {
        throw new Error(`${subclass.engName} L${feature.level} «${feature.name}»: фічі немає в сирих сторінках.`);
      }

      return { ...withoutMechanics, displayType: row.displayType, ...(row.uses ? { uses: row.uses } : {}) };
    }),
  }));
}

function main() {
  const subclassesPath = join(process.cwd(), SUBCLASSES_JSON);
  const subclasses: SubclassJson2024[] = JSON.parse(readFileSync(subclassesPath, "utf-8"));
  const mechanics = extractSubclassFeatureMechanics2024(readSubclassSources());

  const withMechanics = applyMechanicsToSubclasses(subclasses, mechanics);
  writeFileSync(subclassesPath, `${JSON.stringify(withMechanics, null, 2)}\n`, "utf-8");

  const counted = withMechanics.flatMap((subclass) => (subclass.featuresEng ?? []).filter((feature) => feature.uses));
  console.log(`✅ ${mechanics.length} підкласових фіч із джерела, ${counted.length} із лічильником або пулом → ${SUBCLASSES_JSON}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
