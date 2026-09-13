/**
 * KR31.5 — «завжди підготовлені» заклинання підкласів 2024 у файлі-джерелі мусять дорівнювати
 * сирим сторінкам.
 *
 * Перелік звіряється **другим, незалежним** читанням тих самих таблиць — прямо тут, рядок за
 * рядком, — щоб помилка витягу не збіглася сама з собою. Правка переліку руками в
 * `subclasses.json` робить гейт червоним, і так само робить нова форма таблиці в джерелі.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readSubclassSources } from "../../scripts/2024/parse-subclasses";
import { SUBCLASSES_JSON } from "../../scripts/2024/parse-subclass-feature-uses";
import { findMultiTablePreparedSpellFeatures } from "../../scripts/2024/subclass-prepared-spells";

type PreparedSpellsAtLevel = { classLevel: number; spellsEng: string[] };
type FeatureEng = { level: number; name: string; preparedSpells?: PreparedSpellsAtLevel[] };
type SubclassJson = { engName: string; featuresEng?: FeatureEng[] };

const subclassesFromFile: SubclassJson[] = JSON.parse(
  readFileSync(join(process.cwd(), SUBCLASSES_JSON), "utf-8"),
);

/// Коло землі дає чотири переліки — по типу місцевості, який друїд обирає після довгого
/// відпочинку. Це вибір гравця, а не сталий перелік, тож у файл він не їде до окремого рішення.
const KNOWN_MULTI_TABLE_FEATURES = [
  { subclassEngName: "Circle of the Land", featureName: "Circle of the Land Spells", tableCount: 4 },
];

/// Заклиначі третини мають під тією самою назвою таблицю прогресії: шість колонок і числа.
const THIRD_CASTER_SPELLCASTING = ["Eldritch Knight", "Arcane Trickster", "Warrior of the Mystic Arts"];

function readPreparedSpellsFromSource(subclassEngName: string): PreparedSpellsAtLevel[] {
  const subclass = readSubclassSources().find((candidate) => candidate.engName === subclassEngName)!;
  const lines = subclass.featuresEng.flatMap((feature) => feature.descriptionEng.split("\n"));

  const byLevel: PreparedSpellsAtLevel[] = [];
  let inside = false;
  for (const line of lines) {
    const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
    if (!line.trimStart().startsWith("|")) {
      inside = false;
      continue;
    }
    if (cells.length === 2 && /\blevel$/i.test(cells[0]) && /^(prepared |circle )?spells?$/i.test(cells[1])) {
      inside = true;
      continue;
    }
    if (!inside || cells.length !== 2 || /^-+$/.test(cells[0])) continue;
    byLevel.push({
      classLevel: Number(cells[0]),
      spellsEng: cells[1].split(",").map((name) => name.trim().replace(/\*+$/, "").trim()),
    });
  }

  return byLevel;
}

function listWithPreparedSpells(): Array<{ subclass: string; feature: FeatureEng }> {
  return subclassesFromFile.flatMap((subclass) =>
    (subclass.featuresEng ?? [])
      .filter((feature) => feature.preparedSpells?.length)
      .map((feature) => ({ subclass: subclass.engName, feature })),
  );
}

describe("KR31.5 — підкласові «завжди підготовлені» заклинання 2024 дорівнюють джерелу", () => {
  it("кожен перелік у файлі збігається з таблицею сирої сторінки", () => {
    for (const { subclass, feature } of listWithPreparedSpells()) {
      expect({ subclass, spells: feature.preparedSpells }).toEqual({
        subclass,
        spells: readPreparedSpellsFromSource(subclass),
      });
    }
  });

  it("тримає поточний обсяг: 34 підкласи, 181 заклинання", () => {
    const entries = listWithPreparedSpells();
    const names = new Set(entries.flatMap(({ feature }) => feature.preparedSpells!.flatMap((row) => row.spellsEng)));

    expect(entries).toHaveLength(34);
    expect(names.size).toBe(181);
  });

  it("Коло землі лишається єдиним підкласом із переліком на вибір", () => {
    expect(findMultiTablePreparedSpellFeatures(readSubclassSources())).toEqual(KNOWN_MULTI_TABLE_FEATURES);
    expect(listWithPreparedSpells().map(({ subclass }) => subclass)).not.toContain("Circle of the Land");
  });

  it("таблиця прогресії заклинача третини не читається як перелік заклинань", () => {
    const withSpells = listWithPreparedSpells().map(({ subclass }) => subclass);
    for (const subclass of THIRD_CASTER_SPELLCASTING) expect(withSpells).not.toContain(subclass);
  });
});
