import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";

import { replaceMissingGlyphs, toPrintableText } from "@/server/pdf/missingGlyphs";

const FONTS_DIR = path.join(process.cwd(), "public/fonts");
const GENERATED_DIR = path.join(process.cwd(), "src/lib/generated");

async function embedFont(file: string, wrap: boolean): Promise<PDFFont> {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const font = await document.embedFont(readFileSync(path.join(FONTS_DIR, file)), { subset: true });
  return wrap ? replaceMissingGlyphs(font) : font;
}

function collectFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name);
    return statSync(file).isDirectory() ? collectFiles(file) : [file];
  });
}

function collectUnprintable(texts: string[], characterSet: ReadonlySet<number>): string[] {
  const unprintable = new Set<string>();
  for (const text of texts) {
    for (const char of new Set(text)) {
      if (char < " ") continue;
      if ([...toPrintableText(char, characterSet)].some((printed) => !characterSet.has(printed.codePointAt(0)!))) unprintable.add(char);
    }
  }
  return [...unprintable].map((char) => `U+${char.codePointAt(0)!.toString(16).toUpperCase()} ${char}`);
}

describe("знаки без гліфа у шрифті PDF", () => {
  let regular: PDFFont;
  let plainRegular: PDFFont;
  let semiBold: PDFFont;
  beforeAll(async () => {
    [regular, plainRegular, semiBold] = await Promise.all([embedFont("NotoSans-Regular.ttf", true), embedFont("NotoSans-Regular.ttf", false), embedFont("NotoSans-SemiBold.ttf", true)]);
  });

  it("друкує мінус і порівняння знаками, що є у шрифті, а не квадратиком", () => {
    expect(regular.encodeText("4 (−3), ≤ 2, ≥ 5, a → b, ✕").toString()).toBe(plainRegular.encodeText("4 (–3), <= 2, >= 5, a -> b, ×").toString());
    expect(regular.widthOfTextAtSize("−3", 9)).toBe(plainRegular.widthOfTextAtSize("–3", 9));
  });

  it("лишає справжній знак, коли шрифт його має", () => {
    expect(semiBold.encodeText("−").toString()).not.toBe(semiBold.encodeText("–").toString());
  });

  it("кожен знак згенерованих каталогів має гліф у Regular і Bold", async () => {
    const texts = collectFiles(GENERATED_DIR).filter((file) => file.endsWith(".json")).map((file) => readFileSync(file, "utf8"));
    const bold = await embedFont("NotoSans-Bold.ttf", false);

    expect(collectUnprintable(texts, new Set(plainRegular.getCharacterSet()))).toEqual([]);
    expect(collectUnprintable(texts, new Set(bold.getCharacterSet()))).toEqual([]);
  });
});
