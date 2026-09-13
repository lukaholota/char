import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

type Expertise = {
  count: number;
  chooseFromCurrentProficiencies?: boolean;
  options?: string[];
};

type Feature = {
  level: number;
  name: string;
  skillExpertises?: Expertise;
  repeatAtLevels?: number[];
};

type CharacterClass = { engName: string; features: Feature[] };

const EXPECTED = [
  { className: "Bard", featureName: "Експертиза", level: 2, count: 2, repeats: [9], current: true },
  { className: "Rogue", featureName: "Експертиза", level: 1, count: 2, repeats: [6], current: true },
  { className: "Ranger", featureName: "Вправний дослідник", level: 2, count: 1, repeats: [], current: true },
  { className: "Ranger", featureName: "Експертиза", level: 9, count: 2, repeats: [], current: true },
  { className: "Wizard", featureName: "Науковець", level: 2, count: 1, repeats: [], current: false },
] as const;

it("KR31.2 — джерело містить усі гранти Експертизи 2024 на правильних рівнях", () => {
  const classes: CharacterClass[] = JSON.parse(readFileSync("data/2024/normalized/classes.json", "utf8"));

  for (const expected of EXPECTED) {
    const feature = classes
      .find((entry) => entry.engName === expected.className)
      ?.features.find((entry) => entry.level === expected.level && entry.name === expected.featureName);

    expect(feature?.skillExpertises?.count, `${expected.className} ${expected.level}`).toBe(expected.count);
    expect(feature?.repeatAtLevels ?? [], `${expected.className} ${expected.level} repeats`).toEqual(expected.repeats);
    expect(
      Boolean(feature?.skillExpertises?.chooseFromCurrentProficiencies),
      `${expected.className} ${expected.level} current proficiencies`,
    ).toBe(expected.current);
  }

  const scholar = classes
    .find((entry) => entry.engName === "Wizard")
    ?.features.find((entry) => entry.name === "Науковець");
  expect(scholar?.skillExpertises?.options).toEqual([
    "ARCANA", "HISTORY", "INVESTIGATION", "MEDICINE", "NATURE", "RELIGION",
  ]);
});
