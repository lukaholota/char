/**
 * KR16.2 — прапорець `differsFrom2014` мусить дорівнювати обчисленому, а не тому, що поставили.
 *
 * Обчислення — `scripts/5etools/differs-from-2014.ts`, джерело проти джерела. Цей тест і є та
 * перевірка, без якої прапорець розійшовся б зі звіркою знову: рік тому 273 записи стояли
 * «не змінилося» й несли текст 2014.
 */

import { describe, expect, it } from "vitest";
import catalog2024 from "../../data/2024/normalized/spells.json";
import { ALIGNED_WITH_XPHB } from "./aligned-with-xphb";
import { deriveDiffersFrom2014 } from "../../scripts/5etools/differs-from-2014";
import { findLooseNameKey, readSpells } from "../../scripts/5etools/schema";
import { readFactsFromSource } from "../../scripts/5etools/source-spell-facts";
import {
  collectUkrainianDice,
  compareSpellFacts,
  FactMismatch,
  isBaseClass,
  readCastingTimeFromUkrainian,
  readComponentsFromUkrainian,
  readDurationFromUkrainian,
  readRangeFromUkrainian,
  readSchoolFromUkrainian,
  SpellFacts,
} from "../../scripts/5etools/spell-facts";

type CatalogRow = {
  engName: string;
  classes: string[];
  kind: string;
  note: string | null;
  differsFrom2014: boolean;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  hasRitual: string;
  hasConcentration: string;
  description: string;
};

const catalog = catalog2024 as CatalogRow[];
const derived = deriveDiffersFrom2014(catalog.map((row) => row.engName));

const sourceByName = new Map(
  readSpells()
    .filter((spell) => spell.edition === "RULES_2024")
    .map((spell) => [findLooseNameKey(spell.nameEng), spell])
);

function findMechanicalMismatches2024(row: CatalogRow): FactMismatch[] {
  const counterpart = sourceByName.get(findLooseNameKey(row.engName));
  if (!counterpart) return [];

  const ours: SpellFacts = {
    level: row.level,
    school: readSchoolFromUkrainian(row.school, row.engName),
    castingTime: readCastingTimeFromUkrainian(row.castingTime, row.engName),
    range: readRangeFromUkrainian(row.range, row.engName),
    components: readComponentsFromUkrainian(row.components ?? ""),
    duration: readDurationFromUkrainian(row.duration, row.engName),
    concentration: row.hasConcentration.trim() === "так",
    ritual: row.hasRitual.trim() === "так",
    classes: [],
    dice: collectUkrainianDice(row.description ?? ""),
  };

  return compareSpellFacts(ours, readFactsFromSource(counterpart, [], row.engName), {
    compareClasses: false,
  });
}

describe("differsFrom2014 виводиться зі звірки", () => {
  it("прапорець кожного запису дорівнює обчисленому", () => {
    const drifted = catalog
      .map((row, index) => ({ row, expected: derived[index].differsFrom2014 }))
      .filter(({ row, expected }) => row.differsFrom2014 !== expected)
      .map(({ row, expected }) => `${row.engName}: у файлі ${row.differsFrom2014}, обчислено ${expected}`);

    expect(drifted).toEqual([]);
  });

  it("кожен запис, позначений «змінилося», називає, що саме розійшлося", () => {
    const unexplained = derived
      .filter((row) => row.differsFrom2014 && !row.isNewIn2024 && row.mismatches.length === 0)
      .map((row) => row.engName);

    expect(unexplained).toEqual([]);
  });

  it("нове в 2024 — це саме ті записи, яким немає відповідника в книгах 2014", () => {
    const taggedNew = catalog.filter((row) => row.kind === "new").map((row) => row.engName).sort();
    const withoutCounterpart = derived
      .filter((row) => row.isNewIn2024)
      .map((row) => row.engName)
      .sort();

    expect(withoutCounterpart).toEqual(taggedNew);
  });

  it("перейменовані заклинання знайшли свій запис 2014, а не порахувалися новими", () => {
    const renamed = new Set(
      catalog.filter((row) => row.kind === "renamed").map((row) => row.engName)
    );

    expect(renamed.size).toBe(3);
    expect(derived.filter((row) => renamed.has(row.engName) && row.isNewIn2024)).toEqual([]);
  });

  it("жодна нотатка не стверджує механічної зміни там, де обчислення її не бачить", () => {
    const lying = catalog
      .map((row, index) => ({ row, expected: derived[index].differsFrom2014 }))
      .filter(
        ({ row, expected }) => !expected && (row.note ?? "").startsWith("Механічна зміна проти 2014:")
      )
      .map(({ row }) => row.engName);

    expect(lying).toEqual([]);
  });
});

/// Запис 2024, який не збігається ні з XPHB, ні з тим, що каже про нього прапорець, — це вже
/// не «редакція змінилася», а дефект нашого тексту. Перелік порожній із партії 1 KR16.2:
/// останній такий запис, `Bestow Curse`, втратив був увесь список ефектів прокляття разом із
/// 1к8 некротичної шкоди, і його дописано з XPHB. Порожнім він і має лишатися.
const KNOWN_TEXT_GAPS_2024: string[] = [];

describe("механіка каталогу 2024 там, де редакція нічого не міняла", () => {
  it("запис, позначений «не змінилося», збігається з XPHB — крім названих прогалин тексту", () => {
    const broken = catalog
      .filter((row) => !row.differsFrom2014)
      .filter((row) => findMechanicalMismatches2024(row).length > 0)
      .map((row) => `${row.engName}: ${findMechanicalMismatches2024(row).map((m) => m.field).join(", ")}`);

    expect(broken.map((line) => line.split(":")[0])).toEqual(KNOWN_TEXT_GAPS_2024);
  });
});

describe("партії перекладу 2024 звірені з XPHB", () => {
  for (const [batch, names] of Object.entries(ALIGNED_WITH_XPHB)) {
    it(`${batch}: жоден перекладений запис не розходиться з XPHB`, () => {
      const broken = names
        .map((engName) => {
          const row = catalog.find((candidate) => candidate.engName === engName);
          if (!row) throw new Error(`${engName}: немає в каталозі 2024`);
          return row;
        })
        .filter((row) => findMechanicalMismatches2024(row).length > 0)
        .map((row) => `${row.engName}: ${findMechanicalMismatches2024(row).map((m) => m.field).join(", ")}`);

      expect(broken).toEqual([]);
    });
  }
});

describe("перелік класів каталогу 2024", () => {
  it("не містить підкласів — у 2024 розширених списків заклинань немає", () => {
    const offenders = catalog
      .filter((row) => row.classes.some((name) => !isBaseClass(name)))
      .map((row) => `${row.engName}: ${row.classes.filter((n) => !isBaseClass(n)).join(", ")}`);

    expect(offenders).toEqual([]);
  });

  it("не повторює той самий клас двічі і не лишає запис без класів", () => {
    const repeated = catalog
      .filter((row) => new Set(row.classes).size !== row.classes.length)
      .map((row) => row.engName);
    const empty = catalog.filter((row) => row.classes.length === 0).map((row) => row.engName);

    expect(repeated).toEqual([]);
    expect(empty).toEqual([]);
  });
});
