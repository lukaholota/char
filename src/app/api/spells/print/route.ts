import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { existsSync } from "node:fs";

import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";

type Body = {
  spellIds?: unknown;
};

function parseSpellIdsFromUnknown(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0) return [];
  return value
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n))
    .map((n) => Math.trunc(n));
}

function parseSpellIdsFromQuery(url: URL): number[] {
  const raw = url.searchParams.get("ids") ?? url.searchParams.get("spellIds") ?? "";
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isFinite(n))
    .map((n) => Math.trunc(n));
}

async function markdownToHtml(markdown: string) {
  const file = await remark().use(remarkGfm).use(remarkHtml, { sanitize: false }).process(markdown);
  return String(file);
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function levelLabel(level: number) {
  return level === 0 ? "Замовляння" : `Рівень ${level}`;
}

function getLocalPuppeteerExecutablePath() {
  const fromEnv =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_PATH ||
    process.env.GOOGLE_CHROME_BIN ||
    process.env.CHROMIUM_PATH;

  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  // Common macOS locations
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  ];

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }

  return undefined;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Невалідний JSON" }, { status: 400 });
  }

  const spellIds = parseSpellIdsFromUnknown(body.spellIds);
  if (spellIds.length === 0) {
    return NextResponse.json({ error: "spellIds має бути непорожнім масивом" }, { status: 400 });
  }

  return generatePdf(spellIds);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const spellIds = parseSpellIdsFromQuery(url);
  if (spellIds.length === 0) {
    return NextResponse.json({ error: "ids має бути непорожнім списком (через кому)" }, { status: 400 });
  }

  return generatePdf(spellIds);
}

async function generatePdf(spellIds: number[]) {

  const spells = await prisma.spell.findMany({
    where: { spellId: { in: spellIds } },
    orderBy: [{ level: "asc" }, { name: "asc" }],
    select: {
      spellId: true,
      name: true,
      level: true,
      school: true,
      castingTime: true,
      range: true,
      duration: true,
      components: true,
      description: true,
      source: true,
    },
  });

  const sections = await Promise.all(
    spells.map(async (s) => {
      const descriptionHtml = await markdownToHtml(s.description);
      return {
        ...s,
        source: String(s.source),
        descriptionHtml,
      };
    })
  );

  const html = `<!doctype html>
<html lang="uk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Spells Print</title>

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600&family=Noto+Serif:wght@600;700&display=swap"
      rel="stylesheet"
    />

    <style>
      @page { size: letter portrait; margin: 16mm 12mm; }
      * { box-sizing: border-box; }
      body {
        font-family: "Noto Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        color: #0f172a;
        background: #ffffff;
        margin: 0;
      }
      .wrap { padding: 0; }
      .columns {
        column-count: 2;
        column-gap: 14px;
        column-fill: auto;
      }
      .spell {
        display: block;
        padding: 0 0 10px 0;
        margin: 0 0 12px 0;
        border-bottom: 1px solid rgba(15, 23, 42, 0.18);
        break-inside: avoid-column;
        page-break-inside: avoid;
      }
      .header { display:flex; align-items: baseline; justify-content: space-between; gap: 12px; }
      .name { font-family: "Noto Serif", Georgia, "Times New Roman", serif; font-size: 18px; font-weight: 700; margin: 0; }
      .meta { font-size: 11px; color: rgba(15,23,42,0.65); text-align: right; white-space: nowrap; }
      .sub { margin-top: 6px; display:flex; gap: 10px; flex-wrap: wrap; font-size: 12px; color: rgba(15,23,42,0.8); }
      .grid { margin-top: 10px; display:grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .cell { border: 1px solid rgba(15,23,42,0.12); border-radius: 10px; padding: 8px; }
      .label { font-size: 10px; color: rgba(15,23,42,0.6); }
      .val { margin-top: 2px; font-size: 12px; }
      .desc { margin-top: 10px; font-size: 12px; line-height: 1.5; }
      .desc h1 { font-size: 14px; margin: 10px 0 6px 0; font-weight: 700; }
      .desc h2 { font-size: 13px; margin: 10px 0 6px 0; font-weight: 700; }
      .desc h3 { font-size: 12px; margin: 10px 0 6px 0; font-weight: 700; }
      .desc p { margin: 0 0 8px 0; }
      .desc table { width: 100%; border-collapse: collapse; margin: 8px 0; }
      .desc th, .desc td { border: 1px solid rgba(15,23,42,0.2); padding: 6px; text-align: left; }
      .desc ul, .desc ol { margin: 0 0 8px 18px; }
      .generated { column-span: all; margin-top: 14px; font-size: 10px; color: rgba(15,23,42,0.6); }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="columns">
      ${sections
        .map(
          (s) => `
      <section class="spell">
        <div class="header">
          <h1 class="name">${escapeHtml(s.name)}</h1>
          <div class="meta">${escapeHtml(String(s.source))}</div>
        </div>
        <div class="sub">
          <div><strong>${escapeHtml(levelLabel(s.level))}</strong></div>
          <div><em>${escapeHtml(s.school || "—")}</em></div>
        </div>
        <div class="grid">
          <div class="cell"><div class="label">Час використання</div><div class="val">${escapeHtml(s.castingTime)}</div></div>
          <div class="cell"><div class="label">Тривалість</div><div class="val">${escapeHtml(s.duration)}</div></div>
          <div class="cell"><div class="label">Дистанція</div><div class="val">${escapeHtml(s.range)}</div></div>
          <div class="cell"><div class="label">Компоненти</div><div class="val">${escapeHtml(s.components || "—")}</div></div>
        </div>
        <div class="desc">${s.descriptionHtml}</div>
      </section>`
        )
        .join("\n")}
      </div>
      <div class="generated">сформовано на spells.holota.family | pers.holota.family</div>
    </div>
  </body>
</html>`;

  let browser: Browser | null = null;

  try {
    const isVercelLike = Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

    const executablePath = isVercelLike ? await chromium.executablePath() : getLocalPuppeteerExecutablePath();

    if (!executablePath) {
      throw new Error(
        "Puppeteer не знайшов браузер. Для локальної розробки встанови Chrome/Chromium або задай PUPPETEER_EXECUTABLE_PATH (або CHROME_PATH)."
      );
    }

    browser = await puppeteer.launch({
      args: isVercelLike ? chromium.args : ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      printBackground: true,
      format: "letter",
      margin: { top: "16mm", right: "12mm", bottom: "16mm", left: "12mm" },
    });

    const pdfBytes = Uint8Array.from(pdfBuffer);
    const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": "inline; filename=spells.pdf",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return NextResponse.json({ error: "Не вдалося згенерувати PDF" }, { status: 500 });
  } finally {
    await browser?.close();
  }
}
