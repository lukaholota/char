import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

let cachedFontsCss: string | null = null;

export function getFontsCss(): string {
  if (cachedFontsCss) return cachedFontsCss;

  const fontPathRegular = join(process.cwd(), "public/fonts/NotoSans-Regular.ttf");
  const fontPathBold = join(process.cwd(), "public/fonts/NotoSans-Bold.ttf");

  let regularBase64 = "";
  let boldBase64 = "";

  if (existsSync(fontPathRegular)) {
    regularBase64 = readFileSync(fontPathRegular).toString("base64");
  }

  if (existsSync(fontPathBold)) {
    boldBase64 = readFileSync(fontPathBold).toString("base64");
  }

  cachedFontsCss = `
@font-face {
  font-family: "NotoSansLocal";
  src: url(data:font/ttf;base64,${regularBase64}) format("truetype");
  font-weight: 400;
  font-style: normal;
}

@font-face {
  font-family: "NotoSansLocal";
  src: url(data:font/ttf;base64,${boldBase64}) format("truetype");
  font-weight: 700;
  font-style: normal;
}
`.trim();

  return cachedFontsCss;
}
