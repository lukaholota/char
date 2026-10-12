import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { encode } from "@auth/core/jwt";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { CURRENT_RELEASE_FLAG } from "../src/lib/whats-new/release-notes";

const outputDirectory = fileURLToPath(new URL("../public/icons/screenshots/", import.meta.url));

function readCaptureEnvironment() {
  const origin = new URL(process.env.PWA_CAPTURE_ORIGIN ?? "http://127.0.0.1:3207");
  const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
  const secret = process.env.AUTH_SECRET;
  const localHosts = ["127.0.0.1", "localhost"];
  if (origin.protocol !== "http:" || !localHosts.includes(origin.hostname) || origin.port === "3000") throw new Error("Use an isolated local HTTP server outside port 3000");
  if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol) || !localHosts.includes(databaseUrl.hostname) || !databaseUrl.pathname.endsWith("_test") || databaseUrl.pathname === "/spells_test") {
    throw new Error("Use a separate local test database, never the spells_test template");
  }
  if (!secret) throw new Error("AUTH_SECRET must match the isolated server");
  return { origin: origin.origin, databaseUrl: databaseUrl.toString(), secret };
}

async function createDemoPerses(prisma: PrismaClient, userId: number) {
  const race = await prisma.race.findFirstOrThrow({ where: { name: "HUMAN_2014" } });
  const background = await prisma.background.findFirstOrThrow({ where: { name: "ACOLYTE", ruleset: "RULES_2014" } });
  const persIds: number[] = [];
  for (const [name, className] of [["Мирон", "FIGHTER_2014"], ["Соломія", "WIZARD_2014"], ["Остап", "DRUID_2014"]] as const) {
    const cls = await prisma.class.findFirstOrThrow({ where: { name: className } });
    const pers = await prisma.pers.create({ data: {
      userId, name, ruleset: "RULES_2014", classId: cls.classId, raceId: race.raceId,
      backgroundId: background.backgroundId, level: 3, currentHp: 24, maxHp: 28,
      str: 16, dex: 14, con: 14, int: 12, wis: 13, cha: 10,
      customLanguagesKnown: "Загальна",
    } });
    persIds.push(pers.persId);
  }
  return persIds;
}

async function saveScreenshot(page: Page, filename: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => Array.from(document.images).every((image) => {
    const bounds = image.getBoundingClientRect();
    const isOnScreen = bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth;
    return !isOnScreen || image.complete;
  }), undefined, { timeout: 15000 });
  await page.screenshot({ path: `${outputDirectory}/${filename}`, animations: "disabled" });
}

async function capturePhoneScreens(page: Page, origin: string, persId: number) {
  await page.goto(`${origin}/char/home`);
  await page.getByText("Мирон", { exact: true }).first().waitFor();
  await saveScreenshot(page, "characters-narrow.png");
  await page.goto(`${origin}/char/${persId}`);
  await page.getByText("Мирон", { exact: true }).first().waitFor();
  await saveScreenshot(page, "sheet-narrow.png");
  await page.getByRole("button", { name: "Кубики", exact: true }).click();
  await page.getByRole("button", { name: "Закрити кубики", exact: true }).waitFor();
  await page.getByRole("button", { name: "Кинути к20", exact: true }).click();
  await page.waitForFunction(() => Array.from(document.querySelectorAll("button")).some((button) => button.textContent?.includes("Кинути ще раз") && !button.disabled));
  await saveScreenshot(page, "dice-narrow.png");
  await page.goto(`${origin}/spells`);
  await page.locator(".glass-panel.group").first().waitFor();
  await saveScreenshot(page, "spells-narrow.png");
}

async function prepareCaptureContext(context: BrowserContext, origin: string, session: string) {
  await context.addCookies([{ name: "authjs.session-token", value: session, url: origin }]);
  await context.addInitScript((flag) => localStorage.setItem(`char:seen:${flag}`, "seen"), CURRENT_RELEASE_FLAG);
}

async function captureWideScreen(browser: Browser, origin: string, session: string) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "dark", serviceWorkers: "block" });
  await prepareCaptureContext(context, origin, session);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(`${origin}/spells`);
  await page.locator(".glass-panel.group").first().waitFor();
  await saveScreenshot(page, "spells-wide.png");
  await context.close();
}

async function captureBrowserScreens(origin: string, session: string, persId: number) {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: "dark", serviceWorkers: "block" });
    await prepareCaptureContext(context, origin, session);
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await capturePhoneScreens(page, origin, persId);
    await context.close();
    await captureWideScreen(browser, origin, session);
  } finally { await browser.close(); }
}

async function captureDemoScreens(prisma: PrismaClient, environment: ReturnType<typeof readCaptureEnvironment>) {
  const user = await prisma.user.create({ data: { email: `pwa-${Date.now()}@example.test`, name: "Демонстрація" } });
  try {
    const persIds = await createDemoPerses(prisma, user.id);
    const session = await encode({ token: { sub: String(user.id), userId: String(user.id), email: user.email, name: user.name }, secret: environment.secret, salt: "authjs.session-token" });
    await mkdir(outputDirectory, { recursive: true });
    await captureBrowserScreens(environment.origin, session, persIds[0]);
  } finally {
    await prisma.pers.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
}

async function captureInstallScreenshots() {
  const environment = readCaptureEnvironment();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: environment.databaseUrl }) });
  try { await captureDemoScreens(prisma, environment); }
  finally { await prisma.$disconnect(); }
}

await captureInstallScreenshots();
