/**
 * KR13.2 — жорсткий гейт: перелік класових фіч 2024 має збігатися з SRD 2024.
 *
 * SRD (data/2024/srd/classes.md) — незалежне джерело, а не те, з якого імпортували.
 * Розходження — падіння зі списком рядків, не ворнінг.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const CLASSES_JSON = "data/2024/normalized/classes.json";
const SRD_CLASSES_MD = "data/2024/srd/classes.md";

/** Винахідника немає в PHB 2024, отже і в SRD — його фічі має лише вікі. */
export const CLASSES_WITHOUT_SRD_REFERENCE = ["Artificer"];

export type FeatureKey = { level: number; name: string };

export type ClassFeatureMismatch = {
  className: string;
  onlyInWiki: string[];
  onlyInSrd: string[];
};

export function readSrdClassFeatures(markdown: string): Map<string, FeatureKey[]> {
  const byClass = new Map<string, FeatureKey[]>();
  let className: string | null = null;
  let section: string | null = null;

  for (const line of markdown.split("\n")) {
    const classHeading = /^## (.+)$/.exec(line);
    if (classHeading) {
      className = classHeading[1].trim();
      section = null;
      byClass.set(className, []);
      continue;
    }

    const sectionHeading = /^### (.+)$/.exec(line);
    if (sectionHeading) {
      section = sectionHeading[1].trim();
      continue;
    }

    const featureHeading = /^#### Level (\d+): (.+)$/.exec(line);
    if (featureHeading && className && section === `${className} Class Features`) {
      byClass.get(className)!.push({
        level: Number(featureHeading[1]),
        name: featureHeading[2].trim(),
      });
    }
  }

  return byClass;
}

export function findClassFeatureMismatches(
  wikiByClass: Map<string, FeatureKey[]>,
  srdByClass: Map<string, FeatureKey[]>,
): ClassFeatureMismatch[] {
  const mismatches: ClassFeatureMismatch[] = [];

  for (const [className, srdFeatures] of srdByClass) {
    const wikiFeatures = wikiByClass.get(className);
    if (!wikiFeatures) {
      mismatches.push({
        className,
        onlyInWiki: [],
        onlyInSrd: srdFeatures.map(formatKey),
      });
      continue;
    }

    const wikiKeys = wikiFeatures.map(toComparableKey);
    const srdKeys = srdFeatures.map(toComparableKey);
    const onlyInWiki = wikiFeatures.filter((_, i) => !srdKeys.includes(wikiKeys[i])).map(formatKey);
    const onlyInSrd = srdFeatures.filter((_, i) => !wikiKeys.includes(srdKeys[i])).map(formatKey);

    if (onlyInWiki.length || onlyInSrd.length) {
      mismatches.push({ className, onlyInWiki, onlyInSrd });
    }
  }

  return mismatches;
}

function toComparableKey({ level, name }: FeatureKey): string {
  const normalized = name
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return `${level}/${normalized}`;
}

function formatKey({ level, name }: FeatureKey): string {
  return `Level ${level}: ${name}`;
}

function main() {
  const classes: { engName: string; featuresEng?: FeatureKey[] }[] = JSON.parse(
    readFileSync(join(process.cwd(), CLASSES_JSON), "utf-8"),
  );
  const wikiByClass = new Map(classes.map((cls) => [cls.engName, cls.featuresEng ?? []]));
  const srdByClass = readSrdClassFeatures(readFileSync(join(process.cwd(), SRD_CLASSES_MD), "utf-8"));

  for (const className of CLASSES_WITHOUT_SRD_REFERENCE) {
    const count = wikiByClass.get(className)?.length ?? 0;
    console.log(`⚠️  ${className}: ${count} фіч без звірки — цього класу немає в SRD 2024.`);
  }

  const mismatches = findClassFeatureMismatches(wikiByClass, srdByClass);
  if (mismatches.length === 0) {
    const checked = [...srdByClass.values()].reduce((sum, list) => sum + list.length, 0);
    console.log(`✅ ${srdByClass.size} класів, ${checked} фіч збігаються з SRD 2024.`);
    return;
  }

  for (const { className, onlyInWiki, onlyInSrd } of mismatches) {
    console.error(`❌ ${className}`);
    onlyInWiki.forEach((key) => console.error(`     тільки на вікі: ${key}`));
    onlyInSrd.forEach((key) => console.error(`     тільки в SRD:   ${key}`));
  }
  throw new Error(`Розходжень із SRD: ${mismatches.length} класів.`);
}

if (process.argv[1]?.endsWith("verify-class-features.ts")) main();
