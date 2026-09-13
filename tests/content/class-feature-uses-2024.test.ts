/**
 * KR31.3 — числа використань класових фіч 2024 у файлі-джерелі мусять дорівнювати книзі.
 *
 * Гейт читає `data/2024/srd/classes.md`, а не памʼять: правка числа руками в `classes.json`
 * робить його червоним, і так само робить нове формулювання в книзі, якого витяг не розуміє.
 * Числа з таблиць рівнів звіряються **другим, незалежним** читанням тих самих таблиць — прямо
 * тут, комірка за коміркою, — щоб помилка в компресії не збіглася сама з собою.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractClassFeatureMechanics2024 } from "../../scripts/2024/class-feature-uses";
import {
  applyMechanicsToClasses,
  CLASSES_OUTSIDE_SRD,
  SRD_CLASSES_MD,
  CLASSES_JSON,
} from "../../scripts/2024/parse-class-feature-uses";

const srdMarkdown = readFileSync(join(process.cwd(), SRD_CLASSES_MD), "utf-8");
const classesFromFile = JSON.parse(readFileSync(join(process.cwd(), CLASSES_JSON), "utf-8"));

type FeatureEng = { level: number; name: string; displayType?: string[]; uses?: Record<string, unknown> };
type ClassJson = { engName: string; featuresEng?: FeatureEng[] };

function listFeaturesWithUses(classes: ClassJson[]): string[] {
  return classes
    .flatMap((cls) => (cls.featuresEng ?? []).map((feature) => ({ cls, feature })))
    .filter(({ feature }) => feature.uses)
    .map(({ cls, feature }) => `${cls.engName}: ${feature.name}`)
    .sort();
}

/// Друге читання книги: колонка таблиці рівнів, розгорнута щорівня, без будь-якої компресії.
function readTableColumnByLevel(className: string, column: string): Map<number, number> {
  const lines = srdMarkdown.split("\n");
  const start = lines.findIndex(
    (line, index) => line.trim() === `**${className} Features**` && index > lines.indexOf(`## ${className}`),
  );
  const headers: string[] = [];
  const byLevel = new Map<number, number>();
  let row: string[] | null = null;

  for (let index = start; index < lines.length && !/<\/table>/.test(lines[index]); index++) {
    const header = /<th>(.*)<\/th>/.exec(lines[index]);
    if (header) headers.push(header[1].trim());
    if (/<tr>/.test(lines[index])) row = [];
    const cell = /<td>(.*)<\/td>/.exec(lines[index]);
    if (cell && row) row.push(cell[1].trim());
    if (/<\/tr>/.test(lines[index]) && row?.length) {
      const level = Number(row[0]);
      const value = Number(row[headers.indexOf(column)]);
      if (Number.isInteger(level) && Number.isInteger(value)) byLevel.set(level, value);
      row = null;
    }
  }

  return byLevel;
}

function expandUsesByLevel(byLevel: Array<{ lvl: number; uses: number }>, levels: number[]): Map<number, number> {
  const expanded = new Map<number, number>();
  for (const level of levels) {
    const match = [...byLevel].filter((entry) => entry.lvl <= level).sort((a, b) => b.lvl - a.lvl)[0];
    if (match) expanded.set(level, match.uses);
  }
  return expanded;
}

describe("числа використань класових фіч 2024", () => {
  it("файл-джерело дорівнює витягу з книги", () => {
    const rebuilt = applyMechanicsToClasses(
      structuredClone(classesFromFile),
      extractClassFeatureMechanics2024(srdMarkdown),
    );

    expect(JSON.stringify(rebuilt, null, 2)).toBe(JSON.stringify(classesFromFile, null, 2));
  });

  it("лічильник має рівно той перелік фіч, який дає книга", () => {
    expect(listFeaturesWithUses(classesFromFile)).toEqual([
      "Barbarian: Persistent Rage",
      "Barbarian: Rage",
      "Bard: Bardic Inspiration",
      "Cleric: Channel Divinity",
      "Cleric: Divine Intervention",
      "Druid: Archdruid",
      "Druid: Wild Resurgence",
      "Druid: Wild Shape",
      "Fighter: Action Surge",
      "Fighter: Indomitable",
      "Fighter: Second Wind",
      "Monk: Monk’s Focus",
      "Monk: Uncanny Metabolism",
      "Paladin: Channel Divinity",
      "Paladin: Faithful Steed",
      "Paladin: Lay On Hands",
      "Paladin: Paladin's Smite",
      "Ranger: Favored Enemy",
      "Ranger: Nature's Veil",
      "Ranger: Tireless",
      "Rogue: Stroke of Luck",
      "Sorcerer: Font of Magic",
      "Sorcerer: Innate Sorcery",
      "Sorcerer: Sorcerous Restoration",
      "Warlock: Contact Patron",
      "Warlock: Magical Cunning",
      "Warlock: Mystic Arcanum",
      "Wizard: Arcane Recovery",
      "Wizard: Signature Spells",
    ]);
  });

  it.each([
    ["Barbarian", "Rages", "Rage"],
    ["Cleric", "Channel Divinity", "Channel Divinity"],
    ["Druid", "Wild Shape", "Wild Shape"],
    ["Fighter", "Second Wind", "Second Wind"],
    ["Monk", "Focus Points", "Monk’s Focus"],
    ["Paladin", "Channel Divinity", "Channel Divinity"],
    ["Ranger", "Favored Enemy", "Favored Enemy"],
    ["Sorcerer", "Sorcery Points", "Font of Magic"],
  ])("%s: «%s» у файлі щорівня дорівнює колонці книги", (className, column, featureName) => {
    const fromBook = readTableColumnByLevel(className, column);
    const feature = (classesFromFile as ClassJson[])
      .find((cls) => cls.engName === className)!
      .featuresEng!.find((candidate) => candidate.name === featureName)!;

    const fromFile = expandUsesByLevel(
      feature.uses!.usesCountSpecial as Array<{ lvl: number; uses: number }>,
      [...fromBook.keys()],
    );

    expect([...fromFile.entries()]).toEqual([...fromBook.entries()]);
  });

  it("у `usesCountSpecial` лежить максимум, а не маркер (BUG-011)", () => {
    const shapes = (classesFromFile as ClassJson[])
      .flatMap((cls) => cls.featuresEng ?? [])
      .map((feature) => feature.uses?.usesCountSpecial)
      .filter((special): special is object => Boolean(special))
      .filter((special) => {
        if (Array.isArray(special)) {
          return !special.every((entry) => typeof entry?.lvl === "number" && typeof entry?.uses === "number");
        }
        return (special as { type?: string }).type !== "FORMULA";
      });

    expect(shapes).toEqual([]);
  });

  it("Характерні заклинання несуть стільки безкоштовних застосувань, скільки дає книга", () => {
    const book = readFileSync(join(process.cwd(), "data/2024/srd/classes.md"), "utf-8");
    expect(book).toContain("Choose two level 3 spells in your spellbook");
    expect(book).toContain("you can cast each of them once at level 3 without expending a spell slot");

    const feature = (classesFromFile as ClassJson[])
      .find((cls) => cls.engName === "Wizard")!
      .featuresEng!.find((candidate) => candidate.name === "Signature Spells")!;

    expect(feature.uses).toEqual({ limitedUsesPer: "SHORT_REST", usesCount: 2 });
  });

  it("клас поза корпусом SRD лишається без механіки, і це видно", () => {
    const outside = (classesFromFile as ClassJson[]).filter((cls) => CLASSES_OUTSIDE_SRD.has(cls.engName));
    expect(outside.map((cls) => cls.engName)).toEqual(["Artificer"]);

    const withMechanics = outside.flatMap((cls) =>
      (cls.featuresEng ?? []).filter((feature) => feature.uses || feature.displayType).map((feature) => feature.name),
    );
    expect(withMechanics).toEqual([]);
  });

  it("фіча з лічильником показується як ресурс класу, і тільки вона", () => {
    const asResource = (classesFromFile as ClassJson[])
      .flatMap((cls) => (cls.featuresEng ?? []).map((feature) => ({ cls, feature })))
      .filter(({ feature }) => feature.displayType?.includes("CLASS_RESOURCE"))
      .map(({ cls, feature }) => `${cls.engName}: ${feature.name}`)
      .sort();

    expect(asResource).toEqual(listFeaturesWithUses(classesFromFile));
  });
});
