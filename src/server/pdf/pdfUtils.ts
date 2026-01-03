import { existsSync } from "node:fs";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser, type PDFOptions, type WaitForOptions } from "puppeteer-core";

import { createLogger } from "@/server/logging/logger";
import { diffUsage, formatBytes, takeUsageSnapshot } from "@/server/logging/perf";

import { getFontsCss as getFontsCssFromFile } from "./fonts";

let browserInstance: Browser | null = null;
let browserInitPromise: Promise<Browser> | null = null;

export type PdfLogContext = {
  jobId?: string;
  tag?: string;
};

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
    const log = createLogger("pdf.puppeteer");
    const start = takeUsageSnapshot();

    const isVercelLike = Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
    const forceSparticuz = process.env.PUPPETEER_USE_SPARTICUZ === "1";
    const useSparticuz = isVercelLike || forceSparticuz;

    let executablePath: string | undefined;
    try {
      const execStart = takeUsageSnapshot();
      executablePath = useSparticuz ? await chromium.executablePath() : getLocalPuppeteerExecutablePath();
      const execEnd = takeUsageSnapshot();
      log.info("browser.executablePath", {
        isVercelLike,
        useSparticuz,
        found: Boolean(executablePath),
        executablePath,
        ...diffUsage(execStart, execEnd),
      });
    } catch (err) {
      const execEnd = takeUsageSnapshot();
      log.error("browser.executablePath.error", { isVercelLike, useSparticuz, ...diffUsage(start, execEnd), err });
      throw err;
    }

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

    const launchStart = takeUsageSnapshot();
    log.info("browser.launch.start", {
      isVercelLike,
      executablePath,
      disableDevShmUsage,
      argsCount: (isVercelLike ? [...chromium.args, ...commonArgs] : localArgs).length,
    });

    browserInstance = await puppeteer.launch({
      args: useSparticuz ? [...chromium.args, ...commonArgs] : localArgs,
      executablePath,
      headless: true,
    });

    const launchEnd = takeUsageSnapshot();
    log.info("browser.launch.end", {
      isVercelLike,
      ...diffUsage(launchStart, launchEnd),
    });

    const end = takeUsageSnapshot();
    log.info("browser.ready", { ...diffUsage(start, end) });

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
  waitOptions: WaitForOptions = { waitUntil: "domcontentloaded", timeout: 15000 },
  logCtx: PdfLogContext = {}
): Promise<Uint8Array> {
  const log = createLogger("pdf.html").child({ jobId: logCtx.jobId, tag: logCtx.tag });
  const start = takeUsageSnapshot();

  const envWaitTimeoutMs = Number(process.env.PDF_SET_CONTENT_TIMEOUT_MS ?? "");
  const envPdfTimeoutMs = Number(process.env.PDF_RENDER_TIMEOUT_MS ?? "");

  const effectiveWaitOptions: WaitForOptions = {
    ...waitOptions,
    timeout: Number.isFinite(envWaitTimeoutMs) && envWaitTimeoutMs > 0 ? envWaitTimeoutMs : (waitOptions as any)?.timeout,
  };

  const effectivePdfTimeoutMs =
    (options as any)?.timeout ?? (Number.isFinite(envPdfTimeoutMs) && envPdfTimeoutMs > 0 ? envPdfTimeoutMs : undefined);

  log.info("render.start", {
    htmlBytes: Buffer.byteLength(html, "utf8"),
    waitUntil: (effectiveWaitOptions as any)?.waitUntil,
    waitTimeoutMs: (effectiveWaitOptions as any)?.timeout,
    pdfTimeoutMs: effectivePdfTimeoutMs,
  });

  const browser = await getBrowser();
  const page = await browser.newPage();

  let reqTotal = 0;
  let reqAbortedExternal = 0;
  let reqAbortedHeavy = 0;

  try {
    await page.setJavaScriptEnabled(false);
    await page.emulateMediaType("print");

    // Block any outbound network and heavy resources.
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      reqTotal += 1;
      const url = req.url();
      const type = req.resourceType();

      if (url.startsWith("http://") || url.startsWith("https://")) {
        reqAbortedExternal += 1;
        void req.abort();
        return;
      }

      if (type === "image" || type === "media" || type === "font") {
        reqAbortedHeavy += 1;
        void req.abort();
        return;
      }

      void req.continue();
    });

    // We use domcontentloaded because we embed all resources (fonts, etc) directly in HTML
    const setContentStart = takeUsageSnapshot();
    await page.setContent(html, effectiveWaitOptions);
    const setContentEnd = takeUsageSnapshot();
    log.info("render.setContent", {
      ...diffUsage(setContentStart, setContentEnd),
      reqTotal,
      reqAbortedExternal,
      reqAbortedHeavy,
    });

    const pdfStart = takeUsageSnapshot();
    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      scale: 0.98,
      format: "letter",
      margin: { top: "16mm", right: "12mm", bottom: "16mm", left: "12mm" },
      timeout: effectivePdfTimeoutMs ?? 20000,
      ...options,
    });

    const pdfEnd = takeUsageSnapshot();
    log.info("render.pdf", {
      ...diffUsage(pdfStart, pdfEnd),
      pdfBytes: pdfBuffer.byteLength,
      pdfBytesFmt: formatBytes(pdfBuffer.byteLength),
    });

    const end = takeUsageSnapshot();
    log.info("render.end", { ...diffUsage(start, end) });

    return Uint8Array.from(pdfBuffer);
  } catch (err) {
    const end = takeUsageSnapshot();
    log.error("render.error", { ...diffUsage(start, end), err, reqTotal, reqAbortedExternal, reqAbortedHeavy });
    throw err;
  } finally {
    try {
      await page.close();
    } catch {
      // ignore
    }
  }
}
