import { rgb, type PDFDocument, type PDFFont } from "pdf-lib";

import type { Overflow } from "./printContinuation";
import { wrapText, type MeasuringFont } from "./textFit";

export const CONTINUATION_TITLE = "Продовження";

export type ContinuationLine = { text: string; isHeading: boolean };
export type PageSize = { width: number; height: number };

const MARGIN = 48;
const TITLE_SIZE = 14;
const TITLE_GAP = 24;
const TEXT_SIZE = 9;
const LINE_HEIGHT = TEXT_SIZE * 1.35;
const INK = rgb(0.08, 0.08, 0.08);

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
