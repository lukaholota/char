/**
 * Розбір рядка `Starting Equipment` книги 2024 у структуру.
 *
 * Джерел два: SRD-дамп на 12 класів і збережена сторінка Винахідника з його власної книги.
 * Розбір тримається окремо від сіду, бо ним користуються двоє: сідер, який пише рядки, і
 * гейт-тест, який звіряє написане з книгою. Спільний розбір — єдиний спосіб зробити ту звірку
 * чесною.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type BookEntry = { name: string; quantity: number; note: string | null };
export type BookOption = { letter: string; entries: BookEntry[] };
export type BookEquipment = { engName: string; raw: string; options: BookOption[] };

const SRD_CLASSES_IN_ORDER = [
  "Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk",
  "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard",
];

export const parseClassEquipment2024 = (): BookEquipment[] => [
  ...readSrdClasses(),
  readArtificer(),
];

const readSrdClasses = (): BookEquipment[] => {
  const lines = readSource("data/2024/srd/classes.md").split("\n");
  const rows = lines.flatMap((line, index) =>
    line.includes("<td>Starting Equipment</td>") ? [findCellAfter(lines, index)] : []
  );

  if (rows.length !== SRD_CLASSES_IN_ORDER.length) {
    throw new Error(`SRD: очікували ${SRD_CLASSES_IN_ORDER.length} рядків спорядження, знайшли ${rows.length}`);
  }

  return rows.map((raw, index) => toBookEquipment(SRD_CLASSES_IN_ORDER[index], raw));
};

const readArtificer = (): BookEquipment => {
  const html = readSource("data/2024/source/raw/class/artificer-main.html");
  const found = html.match(/Choose A or B:[^<]*/);

  if (!found) throw new Error("Винахідник: рядка `Choose A or B` немає в збереженій сторінці");

  return toBookEquipment("Artificer", normalizeApostrophes(found[0]));
};

const readSource = (relativePath: string): string =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

const findCellAfter = (lines: string[], index: number): string => {
  for (let cursor = index + 1; cursor < index + 5; cursor++) {
    const text = stripTags(lines[cursor] ?? "");
    if (text.startsWith("Choose ")) return text;
  }
  throw new Error(`не знайшов текст спорядження після рядка ${index + 1}`);
};

const stripTags = (line: string): string =>
  normalizeApostrophes(line.replace(/<[^>]*>/g, "").trim());

const normalizeApostrophes = (text: string): string => text.replace(/[‘’]/g, "'");

const toBookEquipment = (engName: string, raw: string): BookEquipment => ({
  engName,
  raw,
  options: splitIntoOptions(raw),
});

/// «Choose A, B, or C: (A) … ; (B) … ; or (C) 155 GP» — літера завжди в дужках на початку
/// свого шматка, тож ділимо саме по них, а не по «;» чи «or»: обидва трапляються всередині
/// самих переліків.
const splitIntoOptions = (raw: string): BookOption[] => {
  const body = raw.slice(raw.indexOf(":") + 1);
  const marks = [...body.matchAll(/\(([A-C])\)/g)];

  if (marks.length === 0) throw new Error(`нема жодної літери у «${raw}»`);

  return marks.map((mark, index) => {
    const from = mark.index! + mark[0].length;
    const to = index + 1 < marks.length ? marks[index + 1].index! : body.length;
    return { letter: mark[1].toLowerCase(), entries: splitIntoEntries(body.slice(from, to)) };
  });
};

const splitIntoEntries = (chunk: string): BookEntry[] =>
  chunk
    .replace(/;\s*(or\s*)?$/, "")
    .split(",")
    .map((piece) => piece.replace(/^\s*(and|or)\s+/i, "").trim())
    .filter((piece) => piece.length > 0)
    .map(toEntry);

/// «4 Handaxes» → кількість 4; «Druidic Focus (Quarterstaff)» → примітка в дужках, яка звужує
/// предмет до конкретного; «15 GP» → монети тією ж парою «назва + кількість».
const toEntry = (piece: string): BookEntry => {
  const withNote = piece.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  const note = withNote ? withNote[2].trim() : null;
  const named = (withNote ? withNote[1] : piece).trim();

  const withCount = named.match(/^(\d+)\s+(.*)$/);
  const quantity = withCount ? Number(withCount[1]) : 1;
  const name = (withCount ? withCount[2] : named).trim();

  return { name, quantity, note };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const cls of parseClassEquipment2024()) {
    console.log(`\n=== ${cls.engName} ===`);
    for (const option of cls.options) {
      console.log(`  (${option.letter.toUpperCase()})`);
      for (const entry of option.entries) {
        const note = entry.note ? `  [${entry.note}]` : "";
        console.log(`     ${entry.name} ×${entry.quantity}${note}`);
      }
    }
  }
}
