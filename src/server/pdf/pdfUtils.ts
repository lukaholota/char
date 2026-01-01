import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser, type PDFOptions, type WaitForOptions } from "puppeteer-core";

let cachedFontsCss: string | null = null;
let browserInstance: Browser | null = null;

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
  `;

  return cachedFontsCss;
}

function getLocalPuppeteerExecutablePath() {
  const fromEnv =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_PATH ||
    process.env.GOOGLE_CHROME_BIN ||
    process.env.CHROMIUM_PATH;

  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
  ];

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }

  return undefined;
}

export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  const isVercelLike = Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
  const executablePath = isVercelLike ? await chromium.executablePath() : getLocalPuppeteerExecutablePath();

  if (!executablePath) {
    throw new Error(
      "Puppeteer не знайшов браузер. Для локальної розробки встанови Chrome/Chromium або задай PUPPETEER_EXECUTABLE_PATH."
    );
  }

  browserInstance = await puppeteer.launch({
    args: isVercelLike
      ? [...chromium.args, "--font-render-hinting=none"]
      : [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--disable-setuid-sandbox",
          "--no-first-run",
          "--no-zygote",
          "--single-process", // Good for small VPS
          "--font-render-hinting=none",
        ],
    executablePath,
    headless: true,
  });

  return browserInstance;
}

export async function generatePdfFromHtml(
  html: string,
  options: PDFOptions = {},
  waitOptions: WaitForOptions = { waitUntil: "domcontentloaded", timeout: 30000 }
): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // We use domcontentloaded because we embed all resources (fonts, etc) directly in HTML
    await page.setContent(html, waitOptions);

    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      scale: 0.98,
      format: "letter",
      margin: { top: "16mm", right: "12mm", bottom: "16mm", left: "12mm" },
      timeout: 45000,
      ...options,
    });

    return Uint8Array.from(pdfBuffer);
  } finally {
    await page.close();
  }
}
