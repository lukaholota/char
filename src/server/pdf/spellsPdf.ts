import { prisma } from "@/lib/prisma";
import { getFontsCss, generatePdfFromHtml } from "./pdfUtils";

import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

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

export async function generateSpellsPdfBytes(spellIds: number[]): Promise<Uint8Array> {
  if (spellIds.length === 0) {
    throw new Error("spellIds must be a non-empty array");
  }

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

  const fontsCss = getFontsCss();

  const html = `<!doctype html>
<html lang="uk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Spells Print</title>

    <style>
      ${fontsCss}
      @page { size: letter portrait; margin: 16mm 12mm; }
      * { box-sizing: border-box; }
      body {
        font-family: "NotoSansLocal", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
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
        break-inside: auto;
        page-break-inside: auto;
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
    </div>
  </body>
</html>`;

  return generatePdfFromHtml(html);
}
