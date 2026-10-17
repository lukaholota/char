import { readFileSync } from "node:fs";
import path from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, TextAlignment, layoutMultilineText, type PDFFont } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";

import { CONTINUATION_TITLE, appendContinuationPages, layoutContinuationPages, layoutOverflowColumns } from "@/server/pdf/continuationPage";
import { CONTINUED_MARK, CONTINUE_BELOW_SIZE, fitBoxesWithContinuation, fitOrCut } from "@/server/pdf/printContinuation";
import {
  MIN_FONT_SIZE,
  countFittingLines,
  findLargestFittingSize,
  fitMultilineText,
  fitSingleLineFontSize,
  pickReadableText,
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
const words = (value: string) => value.split(/\s+/).filter(Boolean);

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

  it("поле листа 2024, якому не вистачило й найменшого кегля, відсилає решту на аркуш «Продовження»", () => {
    const box = { width: 150, height: 60 };
    const text = SENTENCE.repeat(40);
    const fitted = pickReadableText([text], font, box, { maxFontSize: 10, multiline: true });
    const lines = fitted.text.split("\n");

    expect(fitted.size).toBe(MIN_FONT_SIZE);
    expect(lines).toHaveLength(countFittingLines(font, box, MIN_FONT_SIZE));
    expect(lines.at(-1)).toBe(CONTINUED_MARK);
    expect(words([...lines.slice(0, -1), fitted.rest].join(" "))).toEqual(words(text));
  });

  it("значення поля для редагування — суцільний текст без наших розривів рядків", () => {
    const box = { width: 150, height: 60 };
    const short = pickReadableText([`${SENTENCE}\n${SENTENCE}`], font, box, { maxFontSize: 10, multiline: true });
    const cut = pickReadableText([SENTENCE.repeat(40)], font, box, { maxFontSize: 10, multiline: true });

    expect(short.text.split("\n").length).toBeGreaterThan(2);
    expect(short.value).toBe(`${SENTENCE}\n${SENTENCE}`);
    expect(cut.value.split("\n")).toEqual([cut.value.split("\n")[0], CONTINUED_MARK]);
    expect(SENTENCE.repeat(40).startsWith(cut.value.split("\n")[0])).toBe(true);
  });

  it.each([
    ["ClassLevel", { width: 106, height: 16 }, "Чарівник 3 / Воїн 2 / Жрець 1 / Бард 4 / Чаклун 2 / Друїд 1"],
    ["PlayerName", { width: 90, height: 16 }, "Арістотель Вогнедухий Сріблоплин з Долини Тихих Вітрів"],
  ])("однорядкове поле шапки %s показує початок задовгого значення, а не саму позначку", (name, box, text) => {
    const printed = fitOrCut({ name, label: name, text, box, maxFontSize: 10 }, font);
    const [line] = printed.lines;

    expect(printed.lines).toHaveLength(1);
    expect(line.startsWith(text.split(" ")[0])).toBe(true);
    expect(line.endsWith("…")).toBe(true);
    expect(font.widthOfTextAtSize(line, printed.size)).toBeLessThan(box.width - 2);
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
    const { printed: [printed, printedHost], overflow } = fitBoxesWithContinuation([small], host, font);

    expect(printed).toEqual({ name: "langs", lines: ["Мови: Загальна, Ельфійська"], size: 7, value: "Мови: Загальна, Ельфійська" });
    expect(printedHost.lines).toEqual(["· Дика форма"]);
    expect(overflow).toEqual([]);
  });

  it("надлишок переходить у хост із позначкою, і жодне слово не губиться", () => {
    const long = { ...small, name: "bonds", label: "Прив'язаності", text: SENTENCE.repeat(6), box: { width: 153, height: 35 }, maxFontSize: 10 };
    const { printed: [printed, printedHost], overflow } = fitBoxesWithContinuation([long], host, font);

    expect(printed.size).toBe(CONTINUE_BELOW_SIZE);
    expect(printed.lines.at(-1)).toBe("… далі в «Уміння та Особливості»");
    expect(printedHost.lines).toContain("Прив'язаності (продовження):");
    const hostRest = printedHost.lines.slice(printedHost.lines.indexOf("Прив'язаності (продовження):") + 1).join(" ");
    expect(words([...printed.lines.slice(0, -1), hostRest].join(" "))).toEqual(words(long.text));
    expect(printed.value).toBe(`${printed.value.split("\n")[0]}\n… далі в «Уміння та Особливості»`);
    expect(overflow).toEqual([]);
  });

  it("коли хост повний, решта поля йде на аркуш «Продовження» без втрати слів", () => {
    const fullHost = { ...host, text: SENTENCE.repeat(40) };
    const long = { ...small, name: "bonds", label: "Прив'язаності", text: SENTENCE.repeat(12), box: { width: 153, height: 35 }, maxFontSize: 10 };
    const { printed: [printed, printedHost], overflow } = fitBoxesWithContinuation([long], fullHost, font);

    expect(printed.size).toBe(CONTINUE_BELOW_SIZE);
    expect(printed.lines.at(-1)).toBe(CONTINUED_MARK);
    expect(overflow[0].label).toBe("Прив'язаності");
    expect(words([...printed.lines.slice(0, -1), overflow[0].text].join(" "))).toEqual(words(long.text));
    expect(printedHost.lines.join(" ")).not.toContain("Прив'язаності (продовження)");
  });

  it("хост, якому замало й 6 pt, сам продовжується на аркуші «Продовження»", () => {
    const hugeHost = { ...host, text: SENTENCE.repeat(80) };
    const { printed: [printedHost], overflow } = fitBoxesWithContinuation([], hugeHost, font);

    expect(printedHost.size).toBe(CONTINUE_BELOW_SIZE);
    expect(printedHost.lines.at(-1)).toBe(CONTINUED_MARK);
    expect(overflow.map(({ label }) => label)).toEqual(["Уміння та Особливості"]);
    expect(words([...printedHost.lines.slice(0, -1), overflow[0].text].join(" "))).toEqual(words(hugeHost.text));
  });
});

describe("аркуш «Продовження»", () => {
  const page = { width: 612, height: 792 };

  it("переносить увесь текст розділів, не лишаючи заголовок останнім рядком сторінки", () => {
    const overflow = [
      { label: "Прив'язаності", text: SENTENCE.repeat(20) },
      { label: "Уміння та Особливості", text: SENTENCE.repeat(200) },
    ];
    const pages = layoutContinuationPages(overflow, font, page);
    const lines = pages.flat();

    expect(pages.length).toBeGreaterThan(1);
    for (const pageLines of pages) {
      expect(pageLines.at(-1)?.isHeading).toBe(false);
      expect(pageLines[0].text).not.toBe("");
    }
    expect(lines.filter((line) => line.isHeading).map((line) => line.text)).toEqual(["Прив'язаності (продовження)", "Уміння та Особливості (продовження)"]);
    expect(words(lines.filter((line) => !line.isHeading).map((line) => line.text).join(" "))).toEqual(words(overflow.map(({ text }) => text).join(" ")));
    for (const line of lines) expect(font.widthOfTextAtSize(line.text, 9)).toBeLessThan(page.width - 96);
  });

  it("заголовок розділу на межі сторінки переходить на наступну разом зі своїм текстом", () => {
    for (let lineCount = 40; lineCount <= 70; lineCount++) {
      const first = { label: "Ідеали", text: Array.from({ length: lineCount }, (_, index) => `рядок ${index + 1}`).join("\n") };
      const pages = layoutContinuationPages([first, { label: "Вади", text: "останній" }], font, page);
      for (const pageLines of pages) expect(pageLines.at(-1)?.isHeading).toBe(false);
      expect(pages.flat().map((line) => line.text)).toContain("Вади (продовження)");
    }
  });

  it("без надлишку сторінки не додаються", async () => {
    const target = await PDFDocument.create();
    target.registerFontkit(fontkit);
    const regular = await target.embedFont(readFileSync(path.resolve("public/fonts/NotoSans-Regular.ttf")), { subset: true });

    appendContinuationPages(target, [], { regular, bold: regular }, page);
    expect(target.getPageCount()).toBe(0);
    appendContinuationPages(target, [{ label: "Ідеали", text: SENTENCE }], { regular, bold: regular }, page);
    expect(target.getPageCount()).toBe(1);
    expect(CONTINUATION_TITLE).toBe("Продовження");
  });
});

describe("рамка бланка подробиць", () => {
  const area = { x: 224, y: 220, width: 352, height: 190 };
  const textOf = (lines: { text: string; isHeading: boolean }[]) => lines.filter((line) => !line.isHeading && line.text !== CONTINUED_MARK).map((line) => line.text).join(" ");

  it("короткий надлишок вміщається в одну колонку без позначки", () => {
    const overflow = [{ label: "Ідеали", text: SENTENCE.repeat(2) }];
    const { columns, rest } = layoutOverflowColumns(overflow, font, area);

    expect(rest).toEqual([]);
    expect(columns).toHaveLength(1);
    expect(columns[0][0]).toEqual({ text: "Ідеали (продовження)", isHeading: true });
    expect(words(textOf(columns[0]))).toEqual(words(overflow[0].text));
  });

  it("довгий надлишок займає дві колонки, а решту без втрати слів віддає на «Продовження»", () => {
    const overflow = [
      { label: "Спорядження", text: SENTENCE.repeat(8) },
      { label: "Уміння та Особливості", text: SENTENCE.repeat(60) },
      { label: "Вади", text: SENTENCE },
    ];
    const { columns, rest } = layoutOverflowColumns(overflow, font, area);
    const lines = columns.flat();

    expect(columns).toHaveLength(2);
    expect(columns[0]).toHaveLength(columns[1].length);
    expect(lines.at(-1)?.text).toBe(CONTINUED_MARK);
    expect(rest.map(({ label }) => label)).toEqual(["Уміння та Особливості", "Вади"]);
    const featuresInBox = lines.slice(lines.findIndex((line) => line.text === "Уміння та Особливості (продовження)") + 1);
    expect(words([textOf(featuresInBox), rest[0].text].join(" "))).toEqual(words(overflow[1].text));
    for (const line of lines) expect(font.widthOfTextAtSize(line.text, 7)).toBeLessThan((area.width - 12) / 2);
  });

  it("заголовок не лишається останнім рядком колонки, а колонка не починається з порожнього рядка", () => {
    for (let lineCount = 10; lineCount <= 30; lineCount++) {
      const first = { label: "Ідеали", text: Array.from({ length: lineCount }, (_, index) => `рядок ${index + 1}`).join("\n") };
      const { columns } = layoutOverflowColumns([first, { label: "Вади", text: "останній" }], font, area);
      for (const column of columns) {
        expect(column.at(-1)?.isHeading).toBe(false);
        expect(column[0].text).not.toBe("");
      }
    }
  });
});
