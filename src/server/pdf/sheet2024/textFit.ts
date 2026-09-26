export type MeasuringFont = {
  widthOfTextAtSize: (text: string, size: number) => number;
  heightAtSize: (size: number, options?: { descender?: boolean }) => number;
};

export type TextBox = { width: number; height: number };

const FONT_SIZE_STEP = 0.25;
export const MIN_FONT_SIZE = 4.5;

/// pdf-lib відступає 1 pt від краю поля без рамки.
const FIELD_PADDING = 1;

export function fitSingleLineFontSize(text: string, font: MeasuringFont, box: TextBox, maxFontSize: number): number {
  const inner = shrinkByPadding(box);
  const widthAtOne = font.widthOfTextAtSize(text, 1);
  const byWidth = widthAtOne > 0 ? (inner.width * 0.98) / widthAtOne : maxFontSize;
  const byHeight = inner.height / font.heightAtSize(1, { descender: false });
  return roundDown(Math.max(MIN_FONT_SIZE, Math.min(maxFontSize, byWidth, byHeight)));
}

export function fitMultilineFontSize(text: string, font: MeasuringFont, box: TextBox, maxFontSize: number): number {
  for (let size = maxFontSize; size > MIN_FONT_SIZE; size -= FONT_SIZE_STEP) {
    if (countFittingLines(font, box, size) >= wrapText(text, font, size, box.width).length) return size;
  }
  return MIN_FONT_SIZE;
}

export function countFittingLines(font: MeasuringFont, box: TextBox, size: number): number {
  return Math.floor(shrinkByPadding(box).height / (font.heightAtSize(size) * 1.2));
}

/// Та сама розбивка, що в `layoutMultilineText` pdf-lib: рядок ріжеться по останньому пробілу, що влазить.
export function wrapText(text: string, font: MeasuringFont, size: number, boxWidth: number): string[] {
  const maxWidth = shrinkByPadding({ width: boxWidth, height: 0 }).width;
  return text.split(/\r\n|\r|\n/).flatMap((line) => wrapLine(line, font, size, maxWidth));
}

function wrapLine(line: string, font: MeasuringFont, size: number, maxWidth: number): string[] {
  const wrapped: string[] = [];
  let remainder: string | undefined = line;
  while (remainder !== undefined) {
    const { head, tail } = splitAtWidth(remainder, font, size, maxWidth);
    wrapped.push(head);
    remainder = tail?.trim();
  }
  return wrapped;
}

function splitAtWidth(input: string, font: MeasuringFont, size: number, maxWidth: number): { head: string; tail?: string } {
  let end = input.length;
  while (end > 0) {
    const head = input.substring(0, end);
    if (font.widthOfTextAtSize(head, size) < maxWidth) return { head, tail: input.substring(end) || undefined };
    const lastSpace = head.search(/\s\S*$/);
    end = lastSpace > 0 ? lastSpace : 0;
  }
  return { head: input };
}

function shrinkByPadding(box: TextBox): TextBox {
  return { width: box.width - FIELD_PADDING * 2, height: box.height - FIELD_PADDING * 2 };
}

function roundDown(size: number): number {
  return Math.floor(size / FONT_SIZE_STEP) * FONT_SIZE_STEP;
}
