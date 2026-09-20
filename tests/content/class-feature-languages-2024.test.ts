import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

type ClassFeatureEng = { name: string; descriptionEng?: string; languagesToChooseCount?: number; givesLanguages?: string[] };
type ClassJson = { engName: string; featuresEng?: ClassFeatureEng[] };

const classes = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/2024/normalized/classes.json"), "utf-8")) as ClassJson[];

const WORD_TO_COUNT: Record<string, number> = { one: 1, two: 2, three: 3 };
const SECRET_LANGUAGES: Record<string, string> = { Druidic: "DRUIDIC", "Thieves' Cant": "THIEVES_CANT" };

function findFeature(className: string, featureName: string): ClassFeatureEng {
  const feature = classes.find((cls) => cls.engName === className)?.featuresEng?.find((entry) => entry.name === featureName);
  if (!feature) throw new Error(`${className}: немає риси ${featureName}`);
  return feature;
}

function readPromisedChoiceCount(description: string): number {
  const match = description.match(/\b(one|two|three)(?: other)? languages? of your choice/i);
  return match ? WORD_TO_COUNT[match[1].toLowerCase()] : 0;
}

function readPromisedSecretLanguages(description: string): string[] {
  return Object.entries(SECRET_LANGUAGES)
    .filter(([name]) => new RegExp(`You know ${name}`).test(description))
    .map(([, code]) => code);
}

describe("мови від рис класів 2024 записані полями, а не лише прозою", () => {
  it("Спритний дослідник дає дві мови на вибір, Жаргон злодіїв — жаргон і ще одну, Друїдська — друїдську", () => {
    expect(findFeature("Ranger", "Deft Explorer").languagesToChooseCount).toBe(2);
    expect(findFeature("Rogue", "Thieves' Cant")).toMatchObject({ languagesToChooseCount: 1, givesLanguages: ["THIEVES_CANT"] });
    expect(findFeature("Druid", "Druidic").givesLanguages).toEqual(["DRUIDIC"]);
  });

  it("кожна риса, чий текст обіцяє мову, несе це полем", () => {
    const mismatches = classes.flatMap((cls) =>
      (cls.featuresEng ?? []).flatMap((feature) => {
        const description = feature.descriptionEng ?? "";
        const promised = { choose: readPromisedChoiceCount(description), gives: readPromisedSecretLanguages(description) };
        const recorded = { choose: feature.languagesToChooseCount ?? 0, gives: feature.givesLanguages ?? [] };
        return JSON.stringify(promised) === JSON.stringify(recorded) ? [] : [`${cls.engName}: ${feature.name}`];
      }),
    );
    expect(mismatches).toEqual([]);
  });
});
