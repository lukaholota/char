import { remark } from "remark";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

import { stripGlossaryMarkers } from "@/lib/refs/glossary-marker";

const HTML_LINK = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
const MARKDOWN_LINK = /(?<!!)\[([^\]]+)\]\([^)\s]+\)/g;

export function preparePrintableMarkdown(markdown: string): string {
  return stripLinks(stripGlossaryMarkers(markdown));
}

function stripLinks(text: string): string {
  return text.replace(HTML_LINK, "$1").replace(MARKDOWN_LINK, "$1");
}

export async function renderPrintableMarkdown(markdown: string): Promise<string> {
  const projected = preparePrintableMarkdown(markdown);
  const rendered = await remark()
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkHtml, { sanitize: false })
    .process(projected);
  return String(rendered);
}

export function renderPrintableUserText(text: string): Promise<string> {
  return renderPrintableMarkdown(escapePrintHtml(text));
}

export function escapePrintHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
