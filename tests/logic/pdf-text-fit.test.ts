import { readFileSync } from "node:fs";
import path from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, TextAlignment, layoutMultilineText, type PDFFont } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";

import { CONTINUE_BELOW_SIZE, NOT_FITTED_MARK, fitBoxesWithContinuation, fitOrCut } from "@/server/pdf/printContinuation";
import {
  MIN_FONT_SIZE,
  countFittingLines,
  findLargestFittingSize,
  fitMultilineText,
  fitSingleLineFontSize,
  splitTextToFit,
  wrapText,
  type MeasuringFont,
} from "@/server/pdf/textFit";
import { splitFlowLines } from "@/server/pdf/textFlow";

let font: PDFFont;
let document: PDFDocument;

beforeAll(async () => {
  document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  font = await document.embedFont(readFileSync(path.resolve("public/fonts/NotoSans-Regular.ttf")), { subset: false });
});

const MIXED = "Натхнення барда\nЧаклування з дуже довгою назвою вміння, що мусить переноситися двічі у вузькій колонці\nExpertise and a long English line that wraps as well";
const SENTENCE = "Я поклявся захищати гай, де народився, і кожен, хто зашкодить його деревам, стане моїм ворогом. ";

function layOutWithPdfLib(text: string, size: number, width: number) {
  return layoutMultilineText(text, { alignment: TextAlignment.Left, fontSize: size, font, bounds: { x: 1, y: 1, width: width - 2, height: 10_000 } });
}

function countMeasurements(target: MeasuringFont) {
  let calls = 0;
  const counting: MeasuringFont = {
    widthOfTextAtSize: (text, size) => {
      calls += 1;
      return target.widthOfTextAtSize(text, size);
    },
    heightAtSize: (size, options) => target.heightAtSize(size, options),
  };
  return { counting, readCalls: () => calls };
}

describe("перенос тексту в полях PDF", () => {
  it.each([
    [60, 7],
    [120, 8],
    [200, 6.5],
  ])("рядки збігаються з розкладкою pdf-lib (ширина %i pt, кегль %f)", (width, size) => {
    expect(wrapText(MIXED, font, size, width)).toEqual(layOutWithPdfLib(MIXED, size, width).lines.map((line) => line.text));
  });

  it("абзац на 6000 знаків розбивається з лінійною кількістю вимірів", () => {
    const text = SENTENCE.repeat(64).slice(0, 6000);
    const { counting, readCalls } = countMeasurements(font);
    const lines = wrapText(text, counting, 7, 160);
    const distinctWords = new Set(text.split(/\s+/)).size;

    expect(readCalls()).toBeLessThanOrEqual(distinctWords + 2 * lines.length + 4);
  });

  it("кожен рядок вужчий за поле: і нерозривне слово, і CRLF з табуляцією", () => {
    const text = `${"щ".repeat(300)}\r\nдругий\tрядок\rтретій`;
    const lines = wrapText(text, font, 7, 80);

    for (const line of lines) expect(font.widthOfTextAtSize(line, 7)).toBeLessThan(78);
    expect(lines.join("")).toBe(`${"щ".repeat(300)}другий рядоктретій`);
    expect(lines.slice(-2)).toEqual(["другий рядок", "третій"]);
  });

  it("двійковий пошук кегля дає те саме, що перебір згори вниз", () => {
    const box = { width: 120, height: 60 };
    for (const repeats of [1, 2, 4, 8]) {
      const text = SENTENCE.repeat(repeats);
      const isFitting = (size: number) => wrapText(text, font, size, box.width).length <= countFittingLines(font, box, size);
      let linear = MIN_FONT_SIZE;
      for (let size = 10; size >= MIN_FONT_SIZE; size -= 0.25) {
        if (isFitting(size)) {
          linear = size;
          break;
        }
      }
      expect(findLargestFittingSize(10, isFitting)).toBe(linear);
    }
  });

  it("останній рядок вміщує виносні елементи літер", () => {
    const size = 10;
    const lineHeight = font.heightAtSize(size) * 1.2;
    const descent = font.heightAtSize(size) - font.heightAtSize(size, { descender: false });
    const exactTwoLines = { width: 100, height: 2 + 2 * lineHeight };

    expect(countFittingLines(font, exactTwoLines, size)).toBe(1);
    expect(countFittingLines(font, { ...exactTwoLines, height: exactTwoLines.height + descent }, size)).toBe(2);
  });

  it("рядки й залишок разом відновлюють текст, а запас лишає рядок під позначку", () => {
    const text = `${SENTENCE.repeat(3)}\n${SENTENCE}`;
    const box = { width: 120, height: 40 };
    const capacity = countFittingLines(font, box, 8);
    const plain = splitTextToFit(text, font, box, 8);
    const reserved = splitTextToFit(text, font, box, 8, { reserveLastLine: true });
    const words = (value: string) => value.split(/\s+/).filter(Boolean);

    expect(plain.lines).toHaveLength(capacity);
    expect(reserved.lines).toHaveLength(capacity - 1);
    expect(words([...reserved.lines, reserved.rest].join(" "))).toEqual(words(text));
    expect(reserved.rest).toContain("\n");
  });

  it("підбір кегля: короткий рядок лишається найбільшим, довгий абзац дрібнішає до межі", () => {
    expect(fitSingleLineFontSize("+3", font, { width: 40, height: 20 }, 14)).toBe(14);
    expect(fitMultilineText(SENTENCE, font, { width: 150, height: 120 }, 10).size).toBe(10);
    expect(fitMultilineText(SENTENCE.repeat(40), font, { width: 150, height: 60 }, 10).size).toBe(MIN_FONT_SIZE);
  });

  it("абзац на 6000 знаків проходить підбір і заповнення поля pdf-lib менш ніж за 3 с", () => {
    const text = SENTENCE.repeat(64).slice(0, 6000);
    const box = { width: 165, height: 370 };
    const started = performance.now();
    const fitted = fitMultilineText(text, font, box, 7);
    const page = document.addPage();
    const field = document.getForm().createTextField(`long-${Date.now()}`);
    field.enableMultiline();
    field.addToPage(page, { x: 10, y: 10, width: box.width, height: box.height, borderWidth: 0, font });
    field.setFontSize(fitted.size);
    field.setText(fitted.lines.join("\n"));
    field.updateAppearances(font);

    expect(performance.now() - started).toBeLessThan(3000);
  });

  it("розподіл рядків між полями повертає те, що не влізло й в останнє", () => {
    const lines = Array.from({ length: 30 }, (_, index) => `Рядок ${index + 1}`);
    const { chunks, rest } = splitFlowLines(lines, font, [{ width: 120, height: 40 }], 8);

    expect([...chunks.flat(), ...rest]).toEqual(lines);
    expect(rest.length).toBeGreaterThan(0);
  });
});

describe("продовження тексту у вільному полі", () => {
  const host = { name: "host", label: "Уміння та Особливості", text: "· Дика форма", box: { width: 165, height: 370 }, maxFontSize: 7 };
  const small = { name: "langs", label: "Інші уміння та знання мов", text: "Мови: Загальна, Ельфійська", box: { width: 166, height: 129 }, maxFontSize: 7 };

  it("поле, що вміщує текст читабельно, не чіпає хоста", () => {
    const [printed, printedHost] = fitBoxesWithContinuation([small], host, font);

    expect(printed).toEqual({ name: "langs", lines: ["Мови: Загальна, Ельфійська"], size: 7 });
    expect(printedHost.lines).toEqual(["· Дика форма"]);
  });

  it("надлишок переходить у хост із позначкою, і жодне слово не губиться", () => {
    const long = { ...small, name: "bonds", label: "Прив'язаності", text: SENTENCE.repeat(6), box: { width: 153, height: 35 }, maxFontSize: 10 };
    const [printed, printedHost] = fitBoxesWithContinuation([long], host, font);
    const words = (value: string) => value.split(/\s+/).filter(Boolean);

    expect(printed.size).toBe(CONTINUE_BELOW_SIZE);
    expect(printed.lines.at(-1)).toBe("… далі в «Уміння та Особливості»");
    expect(printedHost.lines).toContain("Прив'язаності (продовження):");
    const hostRest = printedHost.lines.slice(printedHost.lines.indexOf("Прив'язаності (продовження):") + 1).join(" ");
    expect(words([...printed.lines.slice(0, -1), hostRest].join(" "))).toEqual(words(long.text));
  });

  it("коли хост повний, поле дрібнішає до межі й показує, що текст не вмістився", () => {
    const fullHost = { ...host, text: SENTENCE.repeat(40) };
    const long = { ...small, name: "bonds", text: SENTENCE.repeat(12), box: { width: 153, height: 35 }, maxFontSize: 10 };
    const [printed, printedHost] = fitBoxesWithContinuation([long], fullHost, font);

    expect(printed.size).toBe(MIN_FONT_SIZE);
    expect(printed.lines.at(-1)).toBe(NOT_FITTED_MARK);
    expect(printedHost).toEqual(fitOrCut(fullHost, font));
  });
});
