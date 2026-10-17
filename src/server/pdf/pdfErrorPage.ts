import { NextResponse } from "next/server";

import { ARCANE, OBSIDIAN } from "@/styles/palette";

export type PdfErrorPageLinks = { catalogHref: string; catalogLabel: string; retryHref?: string };

/// Каталоги відкривають друк у новій вкладці, тож відмова має бути сторінкою з виходом, а не сирим JSON.
export function buildPdfErrorPage(message: string, status: number, links: PdfErrorPageLinks): NextResponse {
  return new NextResponse(renderPdfErrorHtml(message, links), {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export function findRetryHref(request: Request): string | undefined {
  if (request.method !== "GET") return undefined;
  const url = new URL(request.url);
  return url.pathname + url.search;
}

function renderPdfErrorHtml(message: string, { catalogHref, catalogLabel, retryHref }: PdfErrorPageLinks): string {
  const retryLink = retryHref ? `<a href="${escapeHtml(retryHref)}">Спробувати ще раз</a>` : "";
  return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PDF не зібрано</title>
<style>
  body { margin: 0; min-height: 100dvh; background: ${OBSIDIAN[950]}; color: ${OBSIDIAN[200]}; font-family: serif; font-size: 18px; line-height: 1.5; }
  main { max-width: 32rem; margin: 0 auto; padding: 48px 16px; }
  h1 { font-size: 1.5rem; margin: 0 0 12px; color: ${OBSIDIAN[50]}; }
  p { margin: 0 0 24px; }
  nav { display: flex; flex-wrap: wrap; gap: 12px; }
  a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px; border-radius: 6px; border: 1px solid ${OBSIDIAN[700]}; color: ${ARCANE[200]}; text-decoration: none; }
  a:first-child { background: ${ARCANE[700]}; border-color: ${ARCANE[600]}; color: ${OBSIDIAN[50]}; }
</style>
</head>
<body>
<main>
<h1>PDF не зібрано</h1>
<p>${escapeHtml(message)}</p>
<nav>${retryLink}<a href="${escapeHtml(catalogHref)}">${escapeHtml(catalogLabel)}</a></nav>
</main>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}
