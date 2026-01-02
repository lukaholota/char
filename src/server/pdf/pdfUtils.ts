import { existsSync } from "node:fs";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser, type PDFOptions, type WaitForOptions } from "puppeteer-core";

import { getFontsCss as getFontsCssFromFile } from "./fonts";

let browserInstance: Browser | null = null;
let browserInitPromise: Promise<Browser> | null = null;

export function getFontsCss(): string {
  return getFontsCssFromFile();
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

  if (browserInitPromise) return browserInitPromise;

  browserInitPromise = (async () => {
    const isVercelLike = Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
    const executablePath = isVercelLike ? await chromium.executablePath() : getLocalPuppeteerExecutablePath();

    if (!executablePath) {
      throw new Error(
        "Puppeteer не знайшов браузер. Для локальної розробки встанови Chrome/Chromium або задай PUPPETEER_EXECUTABLE_PATH."
      );
    }

    const commonArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--single-process",
      "--no-zygote",
      "--disable-gpu",
      "--disable-background-networking",
      "--font-render-hinting=none",
    ];

    const disableDevShmUsage = process.env.PUPPETEER_DISABLE_DEV_SHM_USAGE !== "0";
    const localArgs = [
      ...commonArgs,
      ...(disableDevShmUsage ? ["--disable-dev-shm-usage"] : []),
    ];

    browserInstance = await puppeteer.launch({
      args: isVercelLike ? [...chromium.args, ...commonArgs] : localArgs,
      executablePath,
      headless: true,
    });

    return browserInstance;
  })();

  try {
    return await browserInitPromise;
  } finally {
    browserInitPromise = null;
  }
}

export async function generatePdfFromHtml(
  html: string,
  options: PDFOptions = {},
  waitOptions: WaitForOptions = { waitUntil: "domcontentloaded", timeout: 15000 }
): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setJavaScriptEnabled(false);
    await page.emulateMediaType("print");

    // Block any outbound network and heavy resources.
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      const type = req.resourceType();

      if (url.startsWith("http://") || url.startsWith("https://")) {
        void req.abort();
        return;
      }

      if (type === "image" || type === "media" || type === "font") {
        void req.abort();
        return;
      }

      void req.continue();
    });

    // We use domcontentloaded because we embed all resources (fonts, etc) directly in HTML
    await page.setContent(html, waitOptions);

    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      scale: 0.98,
      format: "letter",
      margin: { top: "16mm", right: "12mm", bottom: "16mm", left: "12mm" },
      timeout: 20000,
      ...options,
    });

    return Uint8Array.from(pdfBuffer);
  } finally {
    await page.close();
  }
}
