#!/usr/bin/env node
import { chromium, devices, webkit } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MIN_TAP_PX = 40;
const MIN_FONT_PX = 12;
const SETTLE_MS = 800;

const PROFILES = [
  {
    name: "phone",
    engine: webkit,
    isPhone: true,
    contextOptions: { ...devices["iPhone 13"], viewport: { width: 375, height: 812 } },
  },
  {
    name: "desktop",
    engine: chromium,
    isPhone: false,
    contextOptions: { viewport: { width: 1280, height: 800 } },
  },
];

async function main() {
  const { base, routes, cookie, fullPage } = readArgs(process.argv.slice(2));
  const runDir = makeRunDir();
  const results = [];
  for (const profile of PROFILES) {
    results.push(...(await probeProfile(profile, { base, routes, cookie, fullPage, runDir })));
  }
  const compositePath = await buildComposite(results, runDir);
  writeFileSync(join(runDir, "report.json"), JSON.stringify(results, null, 2));
  for (const result of results) console.log(formatResult(result));
  console.log(`composite: ${compositePath}`);
}

function readArgs(args) {
  const options = { base: "http://localhost:3200", routes: [], cookie: null, fullPage: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--base") options.base = args[++index].replace(/\/$/, "");
    else if (arg === "--cookie") options.cookie = args[++index];
    else if (arg === "--full") options.fullPage = true;
    else options.routes.push(arg.startsWith("/") ? arg : `/${arg}`);
  }
  if (options.routes.length === 0) options.routes.push("/");
  return options;
}

function makeRunDir() {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  const runDir = join(process.cwd(), "tmp", "ui-qa", stamp);
  mkdirSync(runDir, { recursive: true });
  return runDir;
}

async function probeProfile(profile, { base, routes, cookie, fullPage, runDir }) {
  const browser = await profile.engine.launch();
  const context = await browser.newContext(profile.contextOptions);
  if (cookie) await context.addCookies([buildCookie(cookie, base)]);
  const results = [];
  for (const route of routes) {
    results.push(await probeRoute(context, { base, route, profile, runDir, fullPage }));
  }
  await browser.close();
  return results;
}

function buildCookie(cookie, base) {
  const separator = cookie.indexOf("=");
  return { name: cookie.slice(0, separator), value: cookie.slice(separator + 1), url: base };
}

async function probeRoute(context, { base, route, profile, runDir, fullPage }) {
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  page.on("pageerror", (error) => errors.push(error.message));
  const shotPath = join(runDir, `${profile.name}${route.replace(/[^a-z0-9]+/gi, "_")}.png`);
  try {
    await page.goto(`${base}${route}`, { waitUntil: "load", timeout: 90_000 });
    await page.waitForTimeout(SETTLE_MS);
    const metrics = await page.evaluate(measurePage, { isPhone: profile.isPhone, minTap: MIN_TAP_PX, minFont: MIN_FONT_PX });
    await page.screenshot({ path: shotPath, fullPage });
    return { profile: profile.name, route, shotPath, errors, ...metrics };
  } catch (error) {
    return { profile: profile.name, route, shotPath: null, errors, failure: error.message.split("\n")[0] };
  } finally {
    await page.close();
  }
}

function measurePage({ isPhone, minTap, minFont }) {
  const viewportWidth = window.innerWidth;
  const isShown = (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 1 && rect.height > 1 && style.visibility !== "hidden" && Number(style.opacity) > 0;
  };
  const describe = (element) => {
    const label = (element.getAttribute("aria-label") || element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 28);
    const rect = element.getBoundingClientRect();
    return `${element.tagName.toLowerCase()}${label ? ` "${label}"` : ""} ${Math.round(rect.width)}×${Math.round(rect.height)}`;
  };
  const isInlineProseLink = (element) =>
    element.tagName === "A" &&
    getComputedStyle(element).display === "inline" &&
    (element.parentElement?.textContent ?? "").trim().length > (element.textContent ?? "").trim().length;

  const overflowPx = document.documentElement.scrollWidth - viewportWidth;
  const overflowing = overflowPx > 1
    ? [...document.body.querySelectorAll("*")].filter((element) => {
        if (!isShown(element) || element.getBoundingClientRect().right <= viewportWidth + 1) return false;
        const parent = element.parentElement;
        return !parent || parent.getBoundingClientRect().right <= viewportWidth + 1;
      })
    : [];

  const interactive = isPhone
    ? [...document.querySelectorAll('a[href], button, [role="button"], [role="tab"], [role="menuitem"], input:not([type="hidden"]), select, textarea, summary')]
        .filter((element) => isShown(element) && !isInlineProseLink(element))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.right > 0 && rect.left < viewportWidth && Math.min(rect.width, rect.height) < minTap;
        })
    : [];

  const tinyText = isPhone
    ? [...document.body.querySelectorAll("*")].filter((element) => {
        const ownText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        return ownText && isShown(element) && parseFloat(getComputedStyle(element).fontSize) < minFont;
      })
    : [];

  const imagesWithoutAlt = [...document.querySelectorAll("img:not([alt])")].filter(isShown);

  return {
    overflowPx: Math.max(0, overflowPx),
    overflowSamples: overflowing.slice(0, 3).map(describe),
    smallTargets: interactive.length,
    smallTargetSamples: interactive.slice(0, 5).map(describe),
    tinyText: tinyText.length,
    tinyTextSamples: tinyText.slice(0, 5).map((element) => `${describe(element)} ${getComputedStyle(element).fontSize}`),
    imagesWithoutAlt: imagesWithoutAlt.length,
  };
}

function formatResult(result) {
  const head = `${result.profile.padEnd(7)} ${result.route}`;
  if (result.failure) return `ERR  ${head} — ${result.failure}`;
  const problems = [
    result.overflowPx > 1 && `overflow +${result.overflowPx}px: ${result.overflowSamples.join("; ")}`,
    result.smallTargets > 0 && `${result.smallTargets} targets <${MIN_TAP_PX}px: ${result.smallTargetSamples.join("; ")}`,
    result.tinyText > 0 && `${result.tinyText} text <${MIN_FONT_PX}px: ${result.tinyTextSamples.join("; ")}`,
    result.imagesWithoutAlt > 0 && `${result.imagesWithoutAlt} img without alt`,
    result.errors.length > 0 && `${result.errors.length} console errors (first: ${result.errors[0].slice(0, 120)})`,
  ].filter(Boolean);
  return problems.length === 0 ? `OK   ${head}` : `WARN ${head} — ${problems.join(" | ")}`;
}

async function buildComposite(results, runDir) {
  const figures = results
    .filter((result) => result.shotPath)
    .map((result) => {
      const width = result.profile === "phone" ? 300 : 620;
      const data = readFileSync(result.shotPath).toString("base64");
      return `<figure style="margin:0;width:${width}px"><figcaption>${result.profile} ${result.route}</figcaption><img style="width:100%;border:1px solid #444" src="data:image/png;base64,${data}"></figure>`;
    })
    .join("");
  const compositePath = join(runDir, "composite.png");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  await page.setContent(
    `<body style="margin:12px;background:#111;color:#ddd;font:13px sans-serif"><div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start">${figures}</div></body>`,
  );
  await page.screenshot({ path: compositePath, fullPage: true });
  await browser.close();
  return compositePath;
}

main().catch((error) => {
  console.error(`ui-probe failed: ${error.message}`);
  process.exit(1);
});
