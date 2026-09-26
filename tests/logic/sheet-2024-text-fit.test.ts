import { beforeAll, describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts, TextAlignment, layoutMultilineText, type PDFFont } from "pdf-lib";

import { fitMultilineFontSize, fitSingleLineFontSize, wrapText } from "@/server/pdf/sheet2024/textFit";

let font: PDFFont;

beforeAll(async () => {
  font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
});

const TEXT = "Bardic Inspiration\nSpellcasting with a very long feature name that has to wrap twice in a narrow column\nExpertise";

describe("підбір кегля листа 2024", () => {
  it.each([60, 120, 200])("перенос рядків збігається з тим, що намалює pdf-lib (ширина %i pt)", (width) => {
    const drawn = layoutMultilineText(TEXT, { alignment: TextAlignment.Left, fontSize: 8, font, bounds: { x: 1, y: 1, width: width - 2, height: 1000 } });

    expect(wrapText(TEXT, font, 8, width).length).toBe(drawn.lines.length);
  });

  it("багаторядковий текст зменшується, щоб усі рядки влізли у висоту", () => {
    const box = { width: 120, height: 40 };
    const size = fitMultilineFontSize(TEXT, font, box, 10);
    const drawn = layoutMultilineText(TEXT, { alignment: TextAlignment.Left, fontSize: size, font, bounds: { x: 1, y: 1, width: 118, height: 38 } });

    expect(size).toBeLessThan(10);
    expect(drawn.lines.length * drawn.lineHeight).toBeLessThanOrEqual(38);
  });

  it("короткий текст лишається максимальним кеглем, довгий зменшується за шириною", () => {
    expect(fitSingleLineFontSize("+3", font, { width: 40, height: 20 }, 14)).toBe(14);
    expect(fitSingleLineFontSize("Very long weapon name here", font, { width: 40, height: 20 }, 14)).toBeLessThan(6);
  });
});
