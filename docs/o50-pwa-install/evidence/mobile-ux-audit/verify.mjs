// Usage: node verify.mjs <appDir> <port> <label>
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [appDir, port, label] = process.argv.slice(2);
const require = createRequire(path.join(appDir, "package.json"));
const { chromium, devices } = require("@playwright/test");
const { encode } = await import(path.join(appDir, "node_modules/@auth/core/jwt.js"));
const OUT = path.dirname(new URL(import.meta.url).pathname);

const BASE = `http://localhost:${port}`;
const PERS_ID = 16045;
const USER = { userId: 995, email: "pwa-shell-1791632094255@example.test", name: "PWA" };
const SECRET = readFileSync(path.join(appDir, ".env"), "utf8").match(/AUTH_SECRET="([^"]+)"/)[1];

async function buildContext(browser, { device = "Pixel 7", standalone = false, installVisits = null, signedIn = true } = {}) {
  const context = await browser.newContext({ ...devices[device], serviceWorkers: "allow" });
  if (signedIn) {
    const token = await encode({ token: { sub: String(USER.userId), ...USER }, secret: SECRET, salt: "authjs.session-token", maxAge: 86400 });
    await context.addCookies([{ name: "authjs.session-token", value: token, url: BASE }]);
  }
  await context.addInitScript(({ standalone, installVisits }) => {
    localStorage.setItem("char:seen:whats-new:2026-09", "x");
    if (installVisits !== null && !sessionStorage.getItem("__visitsSet")) {
      localStorage.setItem("char:install-visits:v1", String(installVisits));
      localStorage.removeItem("char:install-dismissed:v1");
      sessionStorage.setItem("__visitsSet", "1");
    }
    if (standalone) Object.defineProperty(navigator, "standalone", { get: () => true });
  }, { standalone, installVisits });
  return context;
}

const backButton = (page) => page.locator("nav[data-safe-navigation] button[aria-label='Назад']");

async function checkStandaloneBack(browser) {
  const context = await buildContext(browser, { standalone: true });
  const page = await context.newPage();
  const result = {};

  await page.goto(`${BASE}/char/home`);
  await page.getByText("Мирон").first().waitFor();
  await page.waitForTimeout(500);
  result.directListBackDisabled = await backButton(page).isDisabled();

  await page.getByText("Мирон").first().tap();
  await page.locator("[data-safe-sheet-tabs]").first().waitFor();
  await page.waitForTimeout(500);
  result.afterOpeningSheetBackDisabled = await backButton(page).isDisabled();
  await backButton(page).tap();
  await page.waitForURL(/\/char\/home$/);
  await page.waitForTimeout(500);
  result.backReturnedTo = new URL(page.url()).pathname;
  result.backDisabledAgainOnList = await backButton(page).isDisabled();

  await page.goto(`${BASE}/char/${PERS_ID}`);
  await page.locator("[data-safe-sheet-tabs]").first().waitFor();
  await page.waitForTimeout(500);
  result.directSheetBackDisabled = await backButton(page).isDisabled();
  await backButton(page).tap();
  await page.waitForURL(/\/char\/home$/);
  await page.waitForTimeout(500);
  result.directSheetBackLandedOn = new URL(page.url()).pathname;
  result.directSheetThenListBackDisabled = await backButton(page).isDisabled();
  await page.screenshot({ path: path.join(OUT, `${label}-standalone-list.png`) });
  await context.close();
  return result;
}

async function checkInstallForNewUser(browser) {
  const context = await buildContext(browser, { device: "iPhone 13", installVisits: 1, signedIn: false });
  const page = await context.newPage();
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(2000);
  const banner = page.getByRole("complementary", { name: "Встановлення застосунку" });
  const result = { bannerOnHome: await banner.isVisible() };
  if (result.bannerOnHome) {
    await page.screenshot({ path: path.join(OUT, `${label}-home-banner.png`) });
    await banner.getByRole("button", { name: "Встановити застосунок" }).tap();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await page.waitForTimeout(500);
    result.iosSteps = (await dialog.locator("ol li").allInnerTexts()).map((text) => text.replace(/\s+/g, " ").trim());
    await page.screenshot({ path: path.join(OUT, `${label}-ios-instructions.png`) });
  }
  const menu = page.locator("nav[data-safe-navigation]").getByRole("button", { name: /Меню/ });
  result.menuEntryVisible = await menu.isVisible().then(async (isVisible) => {
    if (!isVisible) return false;
    await page.keyboard.press("Escape");
    await menu.tap();
    return page.getByRole("button", { name: "Встановити застосунок" }).first().isVisible();
  });
  await context.close();
  return result;
}

async function checkRapidDoubleTap(browser) {
  const context = await buildContext(browser);
  const page = await context.newPage();
  await page.goto(`${BASE}/spells`);
  await page.waitForTimeout(2500);
  const historyBefore = await page.evaluate(() => history.length);
  const link = page.locator("nav[data-safe-navigation] a[aria-label='Персонажі']");
  await Promise.all([link.tap(), page.waitForTimeout(60).then(() => link.tap().catch(() => "second tap missed"))]);
  await page.getByText("Мирон").first().waitFor();
  await page.waitForTimeout(1500);
  const result = { url: new URL(page.url()).pathname, historyEntriesAdded: (await page.evaluate(() => history.length)) - historyBefore };
  await context.close();
  return result;
}

async function checkHoverRules(browser) {
  const context = await buildContext(browser, { signedIn: false });
  const page = await context.newPage();
  await page.goto(`${BASE}/`);
  const result = await page.evaluate(() => {
    const rules = [];
    const walk = (list, media) => {
      for (const rule of list) {
        if (rule.media) walk(rule.cssRules, rule.media.mediaText);
        else if (rule.selectorText?.includes("group-hover\\:opacity-100")) rules.push(media ?? "no media");
      }
    };
    for (const sheet of document.styleSheets) {
      try { walk(sheet.cssRules, null); } catch { /* cross-origin */ }
    }
    return { touchMatchesHoverMedia: matchMedia("(hover: hover) and (pointer: fine)").matches, groupHoverOpacityMedia: [...new Set(rules)] };
  });
  await context.close();
  return result;
}

async function captureReadiness(browser) {
  const context = await buildContext(browser);
  const page = await context.newPage();
  await page.goto(`${BASE}/char/${PERS_ID}`);
  await page.locator("[data-offline-readiness='ready']").waitFor({ timeout: 60000 }).catch(() => null);
  const state = await page.locator("[data-offline-readiness]").getAttribute("data-offline-readiness").catch(() => null);
  await page.screenshot({ path: path.join(OUT, `${label}-sheet-readiness.png`) });
  await context.close();
  return { state };
}

const browser = await chromium.launch();
const report = { label, at: new Date().toISOString() };
for (const [name, check] of Object.entries({ checkStandaloneBack, checkInstallForNewUser, checkRapidDoubleTap, checkHoverRules, captureReadiness })) {
  report[name] = await check(browser).catch((error) => ({ error: String(error.message).split("\n")[0] }));
}
await browser.close();
writeFileSync(path.join(OUT, `verify-${label}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
