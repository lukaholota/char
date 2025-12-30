import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export function getFontsCss(): string {
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

  // Fallback for Noto Serif if not available locally, we map it to system serif
  // but we keep the NotoSansLocal definition
  // We explicitly define "NotoSansLocal" to be used in body
  return `
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
  `;
}
