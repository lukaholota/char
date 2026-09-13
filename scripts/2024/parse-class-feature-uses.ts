/**
 * KR31.3 — переливає числа використань і тип дії з книги у `data/2024/normalized/classes.json`.
 *
 * Правити числа руками у файлі не можна: джерело — `data/2024/srd/classes.md`, і гейт
 * `tests/content/class-feature-uses-2024.test.ts` червоніє, щойно файл розійдеться з книгою
 * ([Р33](../../docs/DECISIONS.md#р33) — термін і механіка живуть у джерелі, не в проході по базі).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractClassFeatureMechanics2024,
  type ClassFeatureMechanics2024,
  type DisplayTypeName,
  type FeatureUses2024,
} from "./class-feature-uses";

export const SRD_CLASSES_MD = "data/2024/srd/classes.md";
export const CLASSES_JSON = "data/2024/normalized/classes.json";

/// Клас без корпусу в SRD 5.2: 2024-Артифайсер окремою книгою не виходив, тож книги, з якої
/// виводити числа, для нього не існує. Його фічі лишаються без лічильників свідомо.
export const CLASSES_OUTSIDE_SRD = new Set(["Artificer"]);

type ClassFeatureEng2024 = {
  level: number;
  name: string;
  displayType?: DisplayTypeName[];
  uses?: FeatureUses2024;
  [key: string]: unknown;
};

type ClassJson2024 = {
  engName: string;
  featuresEng?: ClassFeatureEng2024[];
  [key: string]: unknown;
};

/**
 * Назва фічі як ключ звірки. Нормалізація потрібна, бо `featuresEng` знято з вікі, а числа — з
 * SRD, і два корпуси розходяться рівно в друкарні: «Jack of all Trades» проти «Jack of All
 * Trades» і «Monk’s Focus» (U+2019) проти «Monk's Focus». Перейменувати фічу у файлі не можна —
 * її назва вже стоїть у `feature.eng_name` бази.
 */
function buildFeatureKey(className: string, level: number, featureName: string): string {
  const name = featureName.replace(/[’ʼ‘]/g, "'").toLowerCase();
  return `${className}|${level}|${name}`;
}

export function applyMechanicsToClasses(
  classes: ClassJson2024[],
  mechanics: ClassFeatureMechanics2024[],
): ClassJson2024[] {
  const byKey = new Map(mechanics.map((row) => [buildFeatureKey(row.className, row.level, row.featureName), row]));

  const withMechanics = classes.map((cls) => ({
    ...cls,
    featuresEng: (cls.featuresEng ?? []).map((feature) => {
      const { uses: _dropped, displayType: _also, ...withoutMechanics } = feature;
      if (CLASSES_OUTSIDE_SRD.has(cls.engName)) return withoutMechanics;

      const row = byKey.get(buildFeatureKey(cls.engName, feature.level, feature.name));
      if (!row) throw new Error(`${cls.engName} L${feature.level} «${feature.name}»: фічі немає в ${SRD_CLASSES_MD}.`);

      return { ...withoutMechanics, displayType: row.displayType, ...(row.uses ? { uses: row.uses } : {}) };
    }),
  }));

  return withMechanics;
}

function main() {
  const classesPath = join(process.cwd(), CLASSES_JSON);
  const classes: ClassJson2024[] = JSON.parse(readFileSync(classesPath, "utf-8"));
  const mechanics = extractClassFeatureMechanics2024(readFileSync(join(process.cwd(), SRD_CLASSES_MD), "utf-8"));

  const withMechanics = applyMechanicsToClasses(classes, mechanics);
  writeFileSync(classesPath, `${JSON.stringify(withMechanics, null, 2)}\n`, "utf-8");

  const counted = withMechanics.flatMap((cls) => (cls.featuresEng ?? []).filter((feature) => feature.uses));
  console.log(`✅ ${mechanics.length} класових фіч із книги, ${counted.length} із лічильником → ${CLASSES_JSON}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
