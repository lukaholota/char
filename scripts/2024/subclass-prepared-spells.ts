/**
 * KR31.5 — «завжди підготовлені» заклинання підкласів 2024, виведені з джерела.
 *
 * Джерело те саме, що в KR31.3: локальні сторінки `data/2024/source/raw/subclass/*.html`, бо SRD
 * 5.2 несе 12 підкласів із 76 (рішення власника 2026-09-07). Форма запису одна на весь корпус —
 * таблиця «рівень класу → перелік заклинань» усередині фічі.
 *
 * Дві таблиці свідомо не проходять. Прогресія заклиначів третини (Лицар-Чаклун, Містичний
 * спритник, Монах містичних мистецтв) має шість колонок і числа замість назв. Коло землі має
 * чотири таблиці в одній фічі — по типу місцевості на вибір після довгого відпочинку, — тобто це
 * вибір гравця, а не сталий перелік; такі фічі повертає `findMultiTablePreparedSpellFeatures`.
 */

import type { SubclassSource } from "./subclass-feature-uses";

export type PreparedSpellsAtLevel = { classLevel: number; spellsEng: string[] };

export type SubclassPreparedSpells2024 = {
  subclassEngName: string;
  featureName: string;
  featureLevel: number;
  byLevel: PreparedSpellsAtLevel[];
};

export type MultiTablePreparedSpellFeature = {
  subclassEngName: string;
  featureName: string;
  tableCount: number;
};

export function extractSubclassPreparedSpells2024(
  subclasses: readonly SubclassSource[],
): SubclassPreparedSpells2024[] {
  return subclasses.flatMap((subclass) =>
    subclass.featuresEng.flatMap((feature) => {
      const tables = findPreparedSpellTables(feature.descriptionEng);
      if (tables.length !== 1) return [];

      return [{
        subclassEngName: subclass.engName,
        featureName: feature.name,
        featureLevel: feature.level,
        byLevel: tables[0],
      }];
    }),
  );
}

export function findMultiTablePreparedSpellFeatures(
  subclasses: readonly SubclassSource[],
): MultiTablePreparedSpellFeature[] {
  return subclasses.flatMap((subclass) =>
    subclass.featuresEng
      .map((feature) => ({ feature, tables: findPreparedSpellTables(feature.descriptionEng) }))
      .filter(({ tables }) => tables.length > 1)
      .map(({ feature, tables }) => ({
        subclassEngName: subclass.engName,
        featureName: feature.name,
        tableCount: tables.length,
      })),
  );
}

function findPreparedSpellTables(description: string): PreparedSpellsAtLevel[][] {
  return splitMarkdownTables(description).flatMap((rows) => {
    const table = readPreparedSpellTable(rows);
    return table ? [table] : [];
  });
}

function splitMarkdownTables(description: string): string[][][] {
  const tables: string[][][] = [];
  let current: string[][] | null = null;

  for (const line of description.split("\n")) {
    if (!line.trimStart().startsWith("|")) {
      current = null;
      continue;
    }
    const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
    if (!current) {
      current = [];
      tables.push(current);
    }
    current.push(cells);
  }

  return tables;
}

/// Домен знань позначає зірочкою заклинання Школи віщування — виноска до сусідньої фічі, а не
/// частина назви.
function readSpellName(cell: string): string {
  return cell.trim().replace(/\*+$/, "").trim();
}

function readPreparedSpellTable(rows: string[][]): PreparedSpellsAtLevel[] | null {
  const [header, ...body] = rows;
  if (!header || header.length !== 2) return null;
  if (!/\blevel$/i.test(header[0])) return null;
  if (!/^(prepared |circle )?spells?$/i.test(header[1])) return null;

  const byLevel: PreparedSpellsAtLevel[] = [];
  for (const row of body) {
    if (row.length !== 2 || /^-+$/.test(row[0])) continue;
    const classLevel = Number(row[0]);
    const spellsEng = row[1].split(",").map(readSpellName).filter(Boolean);
    if (!Number.isInteger(classLevel) || !spellsEng.length) return null;
    if (spellsEng.some((name) => /^\d+$/.test(name))) return null;
    byLevel.push({ classLevel, spellsEng });
  }

  return byLevel.length ? byLevel : null;
}
