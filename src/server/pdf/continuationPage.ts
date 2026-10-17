import { rgb, type PDFDocument, type PDFFont, type PDFPage } from "pdf-lib";

import type { PdfArea } from "./portraitPrint";
import type { Overflow } from "./printContinuation";
import { CONTINUED_MARK, takeLines, wrapText, type MeasuringFont } from "./textFit";

export const CONTINUATION_TITLE = "Продовження";
export const DETAILS_BOX_MARK = "… далі на бланку подробиць";

export type ContinuationLine = { text: string; isHeading: boolean };
export type PageSize = { width: number; height: number };

const MARGIN = 48;
const TITLE_SIZE = 14;
const TITLE_GAP = 24;
const TEXT_SIZE = 9;
const LINE_HEIGHT = TEXT_SIZE * 1.35;
const INK = rgb(0.08, 0.08, 0.08);
const BOX_TEXT_SIZE = 7;
const BOX_LINE_HEIGHT = BOX_TEXT_SIZE * 1.35;
const BOX_COLUMNS = 2;
const BOX_COLUMN_GAP = 12;
const BLANK_LINE: ContinuationLine = { text: "", isHeading: false };

export type BoxColumns = { columns: ContinuationLine[][]; rest: Overflow[] };

/// Рамка бланка подробиць у дві колонки. Заголовок не лишається сам унизу колонки; якщо щось не влізло,
/// останній рядок — позначка, і решта йде на «Продовження».
export function layoutOverflowColumns(overflow: Overflow[], font: MeasuringFont, area: PdfArea): BoxColumns {
  const columnWidth = findColumnWidth(area);
  const perColumn = Math.max(2, Math.floor(area.height / BOX_LINE_HEIGHT));
  const lastTextLine = perColumn * BOX_COLUMNS - 1;
  const lines: ContinuationLine[] = [];
  const rest: Overflow[] = [];
  for (const { label, text } of overflow) {
    const start = findSectionStart(lines.length, perColumn);
    const freeLines = lastTextLine - start - 1;
    if (rest.length > 0 || freeLines < 1) {
      rest.push({ label, text });
      continue;
    }
    while (lines.length < start) lines.push(BLANK_LINE);
    const taken = takeLines(text, font, BOX_TEXT_SIZE, columnWidth, freeLines);
    lines.push({ text: `${label} (продовження)`, isHeading: true }, ...taken.lines.map((line) => ({ text: line, isHeading: false })));
    if (taken.rest) rest.push({ label, text: taken.rest });
  }
  if (rest.length > 0) lines.push({ text: CONTINUED_MARK, isHeading: false });
  return { columns: Array.from({ length: Math.ceil(lines.length / perColumn) }, (_, index) => lines.slice(index * perColumn, (index + 1) * perColumn)), rest };
}

export function drawOverflowInBox(page: PDFPage, overflow: Overflow[], fonts: { regular: PDFFont; bold: PDFFont }, area: PdfArea): Overflow[] {
  const { columns, rest } = layoutOverflowColumns(overflow, fonts.regular, area);
  const top = area.y + area.height - BOX_TEXT_SIZE;
  columns.forEach((lines, column) => {
    const x = area.x + column * (findColumnWidth(area) + BOX_COLUMN_GAP);
    lines.forEach((line, index) => {
      if (line.text) page.drawText(line.text, { x, y: top - index * BOX_LINE_HEIGHT, size: BOX_TEXT_SIZE, font: line.isHeading ? fonts.bold : fonts.regular, color: INK });
    });
  });
  return rest;
}

function findColumnWidth(area: PdfArea): number {
  return (area.width - BOX_COLUMN_GAP * (BOX_COLUMNS - 1)) / BOX_COLUMNS;
}

/// Між розділами — порожній рядок, крім верху колонки; заголовок, що впав би в останній рядок колонки, переходить у наступну.
function findSectionStart(used: number, perColumn: number): number {
  const afterGap = used % perColumn === 0 ? used : used + 1;
  return afterGap % perColumn === perColumn - 1 ? afterGap + 1 : afterGap;
}

/// Аркуш «Продовження» — звичайний текст NotoSans 9 pt на сторінках розміру бланка; заголовок розділу не лишається сам унизу.
export function layoutContinuationPages(overflow: Overflow[], font: MeasuringFont, page: PageSize): ContinuationLine[][] {
  const lines = overflow.flatMap(({ label, text }) => [
    { text: "", isHeading: false },
    { text: `${label} (продовження)`, isHeading: true },
    ...wrapText(text, font, TEXT_SIZE, page.width - MARGIN * 2).map((line) => ({ text: line, isHeading: false })),
  ]);
  return paginateLines(lines, countLinesPerPage(page));
}

export function appendContinuationPages(document: PDFDocument, overflow: Overflow[], fonts: { regular: PDFFont; bold: PDFFont }, page: PageSize) {
  layoutContinuationPages(overflow, fonts.regular, page).forEach((lines, index) => {
    const pdfPage = document.addPage([page.width, page.height]);
    const title = index === 0 ? CONTINUATION_TITLE : `${CONTINUATION_TITLE} (${index + 1})`;
    let y = page.height - MARGIN - TITLE_SIZE;
    pdfPage.drawText(title, { x: MARGIN, y, size: TITLE_SIZE, font: fonts.bold, color: INK });
    y -= TITLE_GAP;
    for (const line of lines) {
      if (line.text) pdfPage.drawText(line.text, { x: MARGIN, y, size: TEXT_SIZE, font: line.isHeading ? fonts.bold : fonts.regular, color: INK });
      y -= LINE_HEIGHT;
    }
  });
}

function countLinesPerPage(page: PageSize): number {
  return Math.max(2, Math.floor((page.height - MARGIN * 2 - TITLE_SIZE - TITLE_GAP) / LINE_HEIGHT));
}

function paginateLines(lines: ContinuationLine[], perPage: number): ContinuationLine[][] {
  const pages: ContinuationLine[][] = [];
  let current: ContinuationLine[] = [];
  for (const line of lines) {
    if (current.length === 0 && !line.text) continue;
    if (current.length === perPage) {
      const orphanHeading = current.at(-1)?.isHeading ? current.splice(-1) : [];
      pages.push(current);
      current = orphanHeading;
      if (!line.text) continue;
    }
    current.push(line);
  }
  if (current.length > 0) pages.push(current);
  return pages;
}
