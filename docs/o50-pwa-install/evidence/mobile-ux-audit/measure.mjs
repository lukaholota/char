// Usage: node measure.mjs <appDir> <port> <label>
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import path from "node:path";

const [appDir, port, label] = process.argv.slice(2);
const require = createRequire(path.join(appDir, "package.json"));
const { chromium, devices } = require("@playwright/test");
const { encode } = await import(path.join(appDir, "node_modules/@auth/core/jwt.js"));

const BASE = `http://localhost:${port}`;
const PERS_ID = 16045;
const USER = { userId: 995, email: "pwa-shell-1791632094255@example.test", name: "PWA" };
const SECRET = (await import("node:fs")).readFileSync(path.join(appDir, ".env"), "utf8").match(/AUTH_SECRET="([^"]+)"/)[1];

async function buildContext(browser) {
  const context = await browser.newContext({ ...devices["Pixel 7"], serviceWorkers: "allow" });
  const token = await encode({ token: { sub: String(USER.userId), ...USER }, secret: SECRET, salt: "authjs.session-token", maxAge: 86400 });
  await context.addCookies([{ name: "authjs.session-token", value: token, url: BASE }]);
  await context.addInitScript(() => {
    localStorage.setItem("char:seen:whats-new:2026-09", "x");
    if (localStorage.getItem("__forceOffline") === "1") Object.defineProperty(navigator, "onLine", { get: () => false });
  });
  return context;
}

async function throttle(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  if (process.env.SLOW_NET) {
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 500 * 1024, uploadThroughput: 190 * 1024 });
  }
  return cdp;
}

async function armMutationClock(page) {
  await page.evaluate(() => {
    window.__firstMutation = null;
    new MutationObserver(() => { window.__firstMutation ??= performance.timeOrigin + performance.now(); })
      .observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  });
}

async function measureTap(page, { tap, done }) {
  await armMutationClock(page);
  const tappedAt = Date.now();
  await tap();
  let urlAt = null;
  const startUrl = page.url();
  const poll = setInterval(() => { if (!urlAt && page.url() !== startUrl) urlAt = Date.now(); }, 10);
  await done();
  const doneAt = Date.now();
  clearInterval(poll);
  const feedbackAt = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    return window.__firstMutation ?? (fcp ? performance.timeOrigin + fcp.startTime : null) ?? (nav ? performance.timeOrigin : null);
  }).catch(() => null);
  const fullReload = await page.evaluate(() => window.__firstMutation === undefined).catch(() => null);
  return {
    feedbackMs: feedbackAt ? Math.round(feedbackAt - tappedAt) : null,
    urlMs: urlAt ? urlAt - tappedAt : null,
    contentMs: doneAt - tappedAt,
    fullReload,
  };
}

async function settle(page) {
  await page.waitForLoadState("load");
  await page.waitForTimeout(2500);
}

async function runNavigation(browser) {
  const results = {};
  for (let run = 0; run < Number(process.env.RUNS ?? 3); run += 1) {
    const context = await buildContext(browser);
    const page = await context.newPage();
    await throttle(page);
    // Warm SW + caches, like a returning user.
    await page.goto(`${BASE}/`); await settle(page);
    await page.reload(); await settle(page);

    const record = (key, value) => (results[key] ??= []).push(value);

    record("home card → characters", await measureTap(page, {
      tap: () => page.locator("main a[href='/char/home']").first().tap(),
      done: () => page.getByText("Мирон").first().waitFor({ timeout: 30000 }),
    }));
    await settle(page);

    record("characters list → sheet", await measureTap(page, {
      tap: () => page.getByText("Мирон").first().tap(),
      done: () => page.locator("[data-safe-sheet-tabs] button", { hasText: "Спорядження" }).first().waitFor({ timeout: 30000 }),
    }));
    await settle(page);

    record("bottom nav → home", await measureTap(page, {
      tap: () => page.locator("nav[data-safe-navigation] a[aria-label='Головна']:visible, nav[data-safe-navigation] button[aria-label='Назад']:visible").first().tap(),
      done: () => page.locator("main a[href='/char/home']").first().waitFor({ timeout: 30000 }),
    }));
    await settle(page);

    record("bottom nav → characters", await measureTap(page, {
      tap: () => page.locator("nav[data-safe-navigation] a[aria-label='Персонажі']").tap(),
      done: () => page.getByText("Мирон").first().waitFor({ timeout: 30000 }),
    }));
    await settle(page);

    record("dice button → tray", await measureTap(page, {
      tap: () => page.locator("nav[data-safe-navigation] button[aria-label='Кубики']").tap(),
      done: () => page.getByRole("dialog").or(page.locator("[data-dice-tray]")).first().waitFor({ timeout: 30000 }),
    }));
    await context.close();
  }
  return results;
}

async function goOffline(page) {
  await page.context().setOffline(true);
  await page.evaluate(() => {
    localStorage.setItem("__forceOffline", "1");
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    window.dispatchEvent(new Event("offline"));
  });
}

async function readSlideState(page, tabName) {
  await page.locator("[data-safe-sheet-tabs] button", { hasText: tabName }).first().click();
  await page.waitForTimeout(2500);
  const text = await page.locator("body").innerText();
  if (/ще не збережено на пристрої/i.test(text)) return "not-saved-notice";
  if (/Application error|Помилка/i.test(text)) return "error";
  return "ok";
}

const sheetTab = (page, name) => page.locator("[data-safe-sheet-tabs] button", { hasText: name }).first();

async function waitForReadiness(page, maxMs) {
  const startedAt = Date.now();
  const ready = await page.locator("[data-offline-readiness='ready']").first().waitFor({ timeout: maxMs }).then(() => true, () => false);
  const state = await page.locator("[data-offline-readiness]").first().getAttribute("data-offline-readiness", { timeout: 500 }).catch(() => null);
  return { state, waitedMs: Date.now() - startedAt, ready };
}

async function checkOffline(page) {
  await goOffline(page);
  const slides = {};
  for (const tab of ["Спорядження", "Магія", "Фічі", "Навички"]) slides[tab] = await readSlideState(page, tab);
  let reload = "ok";
  const afterReload = {};
  try {
    await page.reload({ timeout: 15000 });
    await sheetTab(page, "Спорядження").waitFor({ timeout: 10000 });
    for (const tab of ["Спорядження", "Магія", "Фічі", "Навички"]) afterReload[tab] = await readSlideState(page, tab);
  } catch (error) {
    reload = `fail: ${String(error.message).split("\n")[0]}`;
  }
  let charList = "ok";
  try {
    await page.goto(`${BASE}/char/home`, { timeout: 15000 });
    await page.getByText("Мирон").first().waitFor({ timeout: 10000 });
  } catch (error) {
    charList = `fail: ${String(error.message).split("\n")[0]}`;
  }
  return { slides, reload, afterReload, charListOffline: charList };
}

async function runOffline(browser, waitMs) {
  const context = await buildContext(browser);
  const page = await context.newPage();
  await throttle(page);
  await page.goto(`${BASE}/char/${PERS_ID}`);
  await sheetTab(page, "Спорядження").waitFor();
  const readiness = waitMs === "ready" ? await waitForReadiness(page, 60000) : (await page.waitForTimeout(waitMs), await waitForReadiness(page, 1));
  const result = { waitMs, readiness, ...(await checkOffline(page)) };
  await context.close();
  return result;
}

// The owner's path: first visit to home, then client-side navigations only.
async function runOfflineViaClientNavigation(browser) {
  const context = await buildContext(browser);
  const page = await context.newPage();
  await throttle(page);
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(3000);
  await page.locator("main a[href='/char/home']").first().tap();
  await page.getByText("Мирон").first().waitFor();
  await page.waitForTimeout(1000);
  await page.getByText("Мирон").first().tap();
  await sheetTab(page, "Спорядження").waitFor();
  const readiness = await waitForReadiness(page, 60000);
  const result = { readiness, ...(await checkOffline(page)) };
  await context.close();
  return result;
}

const browser = await chromium.launch();
const report = { label, at: new Date().toISOString(), cpuThrottle: 4, device: "Pixel 7 emulation (Chromium)" };
if (!process.env.SKIP_NAV) report.navigation = await runNavigation(browser);
if (!process.env.SKIP_OFFLINE) {
  report.offlineFirstVisit3s = await runOffline(browser, 3000);
  report.offlineFirstVisit15s = await runOffline(browser, 15000);
  if (!process.env.SKIP_READY) report.offlineAfterReady = await runOffline(browser, "ready");
  report.offlineViaClientNavigation = await runOfflineViaClientNavigation(browser);
}
await browser.close();
writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), `report-${label}${process.env.SLOW_NET ? "-slownet" : ""}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
