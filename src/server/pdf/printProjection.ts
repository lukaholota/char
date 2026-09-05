import { remark } from "remark";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

import { stripGlossaryMarkers } from "@/lib/refs/glossary-marker";

export function preparePrintableMarkdown(markdown: string): string {
  return stripGlossaryMarkers(markdown);
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

export function escapePrintHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
