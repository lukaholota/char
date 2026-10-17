import type { PDFFont } from "pdf-lib";

const STAND_INS: Record<string, string> = { "−": "–", "≤": "<=", "≥": ">=", "→": "->", "←": "<-", "✕": "×" };
const STAND_IN_PATTERN = new RegExp(`[${Object.keys(STAND_INS).join("")}]`, "gu");

export function toPrintableText(text: string, characterSet: ReadonlySet<number>): string {
  return text.replace(STAND_IN_PATTERN, (char) => (characterSet.has(char.codePointAt(0)!) ? char : STAND_INS[char]));
}

/// pdf-lib не має запасного шрифту: знак без гліфа друкується квадратиком. Підміна в самому шрифті
/// покриває і drawText, і вигляд полів форми, і текст, який гравець увів сам.
export function replaceMissingGlyphs(font: PDFFont): PDFFont {
  const characterSet = new Set(font.getCharacterSet());
  const encodeText = font.encodeText.bind(font);
  const widthOfTextAtSize = font.widthOfTextAtSize.bind(font);
  return Object.assign(font, {
    encodeText: (text: string) => encodeText(toPrintableText(text, characterSet)),
    widthOfTextAtSize: (text: string, size: number) => widthOfTextAtSize(toPrintableText(text, characterSet), size),
  });
}
