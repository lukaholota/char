/**
 * KR13.2 — валідує вхідний JSON, а НЕ стан бази.
 * Що фічі реально засіяні, перевіряє tests/db/class-features-2024-seeded.test.ts.
 *
 * SRD 2024 тут — незалежний еталон: імпорт іде з локальних сторінок вікі, а звірка з файлу,
 * якого той імпорт не торкається.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CLASSES_WITHOUT_SRD_REFERENCE,
  findClassFeatureMismatches,
  readSrdClassFeatures,
} from "../../scripts/2024/verify-class-features";

const CYRILLIC = /\p{Script=Cyrillic}/u;

type FeatureUa = { level: number; name: string; description: string };
type FeatureEng = { level: number; name: string; descriptionEng: string; displayOrder: number };
type ClassJson2024 = { engName: string; features?: FeatureUa[]; featuresEng?: FeatureEng[] };

const classes: ClassJson2024[] = JSON.parse(
  readFileSync(join(process.cwd(), "data/2024/normalized/classes.json"), "utf-8"),
);

describe("класові фічі 2024 у нормалізованих даних", () => {
  it("кожен клас має фічі, а українська й англійська версії вирівняні за індексом", () => {
    const broken = classes
      .filter((cls) => {
        const eng = cls.featuresEng ?? [];
        const ua = cls.features ?? [];
        return (
          eng.length === 0 ||
          eng.length !== ua.length ||
          eng.some((feature, index) => feature.level !== ua[index].level)
        );
      })
      .map((cls) => cls.engName);

    expect(broken).toEqual([]);
  });

  it("кожна фіча має український опис", () => {
    const withoutUkrainian = classes
      .flatMap((cls) => (cls.features ?? []).map((f) => ({ className: cls.engName, ...f })))
      .filter((f) => !f.description?.trim() || !CYRILLIC.test(f.description))
      .map((f) => `${f.className} / ${f.name}`);

    expect(withoutUkrainian).toEqual([]);
  });

  it("перелік фіч збігається з SRD 2024 для всіх класів, які там є", () => {
    const srdByClass = readSrdClassFeatures(
      readFileSync(join(process.cwd(), "data/2024/srd/classes.md"), "utf-8"),
    );
    const wikiByClass = new Map(classes.map((cls) => [cls.engName, cls.featuresEng ?? []]));

    expect([...srdByClass.keys()].sort()).toEqual(
      classes
        .map((cls) => cls.engName)
        .filter((name) => !CLASSES_WITHOUT_SRD_REFERENCE.includes(name))
        .sort(),
    );
    expect(findClassFeatureMismatches(wikiByClass, srdByClass)).toEqual([]);
  });
});
