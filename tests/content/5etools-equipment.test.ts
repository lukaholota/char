/**
 * KR16.5 — гейт каталогів спорядження проти `items-base.json` пінутої ревізії.
 *
 * Ліва сторона звірки — те, що віддає сторінка каталогу (`armorData`, `weaponsData`) і
 * перелік наборів із сіду. Права — корпус. Спільного збирача між ними немає, тому зламаний
 * збирач не посуне обидві сторони разом — рівно та пастка, на якій спіткнувся KR16.4.
 *
 * Числа тут пінуються навмисно: звірка, яка «нічого не знайшла», бо перестала щось
 * порівнювати, інакше виглядала б зеленою.
 */

import { describe, expect, it } from "vitest";

import {
  compareArmor,
  compareEquipment,
  comparePacks,
  compareWeapons,
} from "../../scripts/5etools/compare-equipment";
import {
  PACK_ITEM_KEY_BY_NAME,
  SOURCE_FIELD_DEFECTS,
  PACK_IN_SOURCE,
} from "../../scripts/5etools/equipment-registry";
import { readBaseItems, readItems, readPackContents } from "../../scripts/5etools/schema";

/// Зріз 2026-08-27. Обладунок 13 + 13, зброя 47 + 38, набори 9 — разом 120. Число рухається
/// тільки разом із каталогом і тільки свідомо: KR16.5 підняв його з нуля, бо звірки
/// спорядження до нього не існувало взагалі.
const CHECKED_ROWS = 120;

/// Рядки каталогів, яких у книзі немає й бути не може. Перелік точний: новий рядок, що
/// сюди потрапив, має спершу дістати пояснення, а не мовчки поповнити виняток.
const ROWS_OUTSIDE_THE_BOOK = [
  "Обладунок 2014 · HOMEBREW — власний рядок користувача, не предмет книги",
  "Обладунок 2014 · UNARMORED_DEFENSE_MONK — класова риса Ченця як джерело КБ",
  "Обладунок 2014 · UNARMORED_DEFENSE_BARBARIAN — класова риса Варвара як джерело КБ",
  "Обладунок 2014 · NATURAL_ARMOR_TORTLE — природний обладунок народу, не спорядження",
  "Обладунок 2014 · NATURAL_ARMOR_13_DEX — природний обладунок народу, не спорядження",
  "Обладунок 2014 · NATURAL_ARMOR_12_DEX — природний обладунок народу, не спорядження",
  "Обладунок 2014 · NATURAL_ARMOR_12_CON — природний обладунок народу, не спорядження",
  "Зброя 2014 · UNARMED_STRIKE — беззбройний удар — правило, а не предмет; базового предмета в корпусі немає",
  "Набори спорядження 2014 · HOMEBREW — власний набір користувача, у книзі його немає",
];

function describeDivergences(divergences: { catalog: string; row: string; field: string; ours: string; inSource: string }[]) {
  return divergences.map(
    (item) => `${item.catalog} · ${item.row} · ${item.field}: ${item.ours} ≠ ${item.inSource}`
  );
}

describe("каталоги спорядження проти items-base.json", () => {
  it("обладунок обох редакцій збігається з книгою поле-в-поле", () => {
    const comparison = compareArmor();

    expect(describeDivergences(comparison.divergences)).toEqual([]);
    expect(comparison.checkedRows).toBe(26);
  });

  it("зброя обох редакцій збігається з книгою поле-в-поле", () => {
    const comparison = compareWeapons();

    expect(describeDivergences(comparison.divergences)).toEqual([]);
    expect(comparison.checkedRows).toBe(85);
  });

  it("вміст наборів спорядження збігається з книгою предмет-у-предмет", () => {
    const comparison = comparePacks();

    expect(describeDivergences(comparison.divergences)).toEqual([]);
    expect(comparison.checkedRows).toBe(9);
  });

  it("звірка охоплює весь каталог, а не його залишок", () => {
    const comparison = compareEquipment();

    expect(comparison.checkedRows).toBe(CHECKED_ROWS);
    expect(comparison.rowsOutsideTheBook).toEqual(ROWS_OUTSIDE_THE_BOOK);
  });
});

describe("містки до корпусу", () => {
  it("кожна назва рядка набору веде до предмета, який у корпусі є", () => {
    const known = new Set(
      [...readBaseItems(), ...readItems()].map(
        (item) => `${item.nameEng.toLowerCase()}|${item.source.toLowerCase()}`
      )
    );

    const dangling = Object.entries(PACK_ITEM_KEY_BY_NAME)
      .filter(([, key]) => !key.startsWith("special:") && !known.has(key))
      .map(([name, key]) => `${name} → ${key}`);

    expect(dangling).toEqual([]);
  });

  it("кожен набір книги, який ми звіряємо, у корпусі знаходиться", () => {
    const packs = readItems();

    const missing = Object.entries(PACK_IN_SOURCE)
      .filter(([, bridge]) => bridge !== null && bridge.isPack)
      .filter(
        ([, bridge]) =>
          !packs.some((item) => item.nameEng === bridge!.name && item.source === bridge!.book)
      )
      .map(([category]) => category);

    expect(missing).toEqual([]);
  });

  /// Виняток на дефект джерела має лишатися дефектом. Якщо корпус його полагодив, звірка
  /// мовчки почала б підміняти правильне число нашим — і наступна помилка в тому самому
  /// рядку проїхала б непоміченою.
  it("кожен записаний дефект джерела досі відтворюється в корпусі", () => {
    const packs = readItems();

    const stale = SOURCE_FIELD_DEFECTS.filter((defect) => {
      const bridge = PACK_IN_SOURCE[defect.pack];
      const pack = packs.find(
        (item) => item.nameEng === bridge?.name && item.source === bridge?.book
      );
      if (pack === undefined) return true;

      const entry = readPackContents(pack).find(
        (line) => line.itemKey?.toLowerCase() === defect.itemKey
      );
      return entry?.quantity !== defect.sourceQuantity;
    }).map((defect) => `${defect.pack} · ${defect.itemKey}`);

    expect(stale).toEqual([]);
  });
});
