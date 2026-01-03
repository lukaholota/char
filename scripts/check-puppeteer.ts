import { createLogger } from "@/server/logging/logger";
import { diffUsage, takeUsageSnapshot } from "@/server/logging/perf";
import { getBrowser } from "@/server/pdf/pdfUtils";

async function main() {
  const log = createLogger("diag.puppeteer");
  const start = takeUsageSnapshot();

  log.info("start", {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    env: {
      PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
      PUPPETEER_USE_SPARTICUZ: process.env.PUPPETEER_USE_SPARTICUZ,
      PUPPETEER_DISABLE_DEV_SHM_USAGE: process.env.PUPPETEER_DISABLE_DEV_SHM_USAGE,
      PUPPETEER_LAUNCH_TIMEOUT_MS: process.env.PUPPETEER_LAUNCH_TIMEOUT_MS,
      PUPPETEER_DUMPIO: process.env.PUPPETEER_DUMPIO,
    },
  });

  const browser = await getBrowser();
  const version = await browser.version().catch(() => "unknown");
  log.info("browser.ready", { version });

  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);
  await page.setContent("<html><body><h1>ok</h1></body></html>", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.close();

  const end = takeUsageSnapshot();
  log.info("end", { ...diffUsage(start, end) });
}

main().catch((err) => {
  const log = createLogger("diag.puppeteer");
  log.error("error", { err });
  process.exitCode = 1;
});
