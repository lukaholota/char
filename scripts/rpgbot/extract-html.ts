import { createHash } from "node:crypto";
import { JSDOM, VirtualConsole } from "jsdom";
import { blockSchema, sectionSchema } from "../../src/lib/optimization/schema";
import type { ContentBlock } from "../../src/lib/optimization/types";

type Inline = Extract<ContentBlock, { type: "paragraph" }>["content"][number];
type Section = ReturnType<typeof sectionSchema.parse>;
export type ExtractionIssue = { code: string; location: string; detail: string };
export type Extraction = { sections: Section[]; issues: ExtractionIssue[]; contentHash: string;
  metrics: { words: number; sections: number; blocks: number; tables: number; ratingSignals: number } };

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const ignorable = "nav,aside,footer,script,style,form,iframe,[aria-hidden='true'],#comments,.comments,.advertisement,.ads,.newsletter,.sharedaddy,.social-share,.pagination";

function locationOf(element: Element): string {
  if (element.id) return `#${element.id}`;
  const siblings = element.parentElement ? [...element.parentElement.children].filter((node) => node.tagName === element.tagName) : [element];
  return `${element.parentElement?.tagName.toLowerCase() ?? "root"}/${element.tagName.toLowerCase()}[${siblings.indexOf(element) + 1}]`;
}

function record(issue: ExtractionIssue[], code: string, element: Element, detail: string) {
  issue.push({ code, location: locationOf(element), detail: normalize(detail).slice(0, 180) });
}

function ratingSignals(root: Element, issues: ExtractionIssue[]): number {
  let count = 0;
  for (const element of root.querySelectorAll("[style],[class]")) {
    const style = element.getAttribute("style") ?? "";
    const classes = element.getAttribute("class") ?? "";
    if (!/(^|;)\s*color\s*:/i.test(style) && !/(^|[\s_-])(red|orange|green|blue|rating)([\s_-]|$)/i.test(classes)) continue;
    if (!normalize(element.textContent ?? "")) continue;
    count += 1;
    record(issues, "rating-signal-review", element, `${classes} ${style} ${element.textContent ?? ""}`);
  }
  return count;
}

function inlineNodes(element: Element, canonicalUrl: string, issues: ExtractionIssue[],
  style: Inline["type"] = "text", skipNestedLists = false): Inline[] {
  const result: Inline[] = [];
  for (const child of element.childNodes) {
    if (child.nodeType === 3 && child.textContent) result.push({ type: style === "link" ? "text" : style, text: child.textContent } as Inline);
    if (child.nodeType !== 1) continue;
    const node = child as Element;
    const tag = node.tagName.toLowerCase();
    if (tag === "br") { result.push({ type: "text", text: "\n" }); continue; }
    if ((tag === "ul" || tag === "ol") && skipNestedLists) continue;
    if (tag === "a") {
      const href = node.getAttribute("href") ?? "";
      let url: URL | null = null;
      try { if (href) url = new URL(href, canonicalUrl); }
      catch (error) { if (!(error instanceof TypeError)) throw error; }
      if (!url || !["http:", "https:"].includes(url.protocol)) record(issues, "unsafe-link", node, href);
      if (style !== "text") record(issues, "nested-markup-review", node, `link inside ${style}`);
      result.push(url && ["http:", "https:"].includes(url.protocol)
        ? { type: "link", text: node.textContent ?? "", href: url.href } : { type: "text", text: node.textContent ?? "" });
      continue;
    }
    if (!["span", "em", "i", "strong", "b", "p", "sup", "sub", "ul", "ol", "li"].includes(tag))
      record(issues, "inline-markup-review", node, tag);
    const next = ["em", "i"].includes(tag) ? "emphasis" : ["strong", "b"].includes(tag) ? "strong"
      : tag === "sup" ? "superscript" : tag === "sub" ? "subscript" : style;
    result.push(...inlineNodes(node, canonicalUrl, issues, next, skipNestedLists));
  }
  return result.filter((node) => node.text.length > 0);
}

function tableBlock(table: Element, blockId: string, url: string, issues: ExtractionIssue[]): ContentBlock | null {
  const rows = [...table.querySelectorAll("tr")].filter((row) => {
    if (row.closest("table") !== table) return false;
    if ([...row.children].some((cell) => ["TH", "TD"].includes(cell.tagName))) return true;
    record(issues, "empty-table-row-review", row, row.outerHTML);
    return false;
  });
  const cells = rows.map((row) => [...row.children].filter((cell) => ["TH", "TD"].includes(cell.tagName)));
  if (table.querySelectorAll(":scope > thead > tr").length > 1)
    record(issues, "multi-header-row-review", table, "Additional header rows are retained as table rows");
  for (const cell of cells.flat()) if (cell.hasAttribute("rowspan") || cell.hasAttribute("colspan"))
    record(issues, "table-span-review", cell, cell.outerHTML);
  if (cells.length && !cells[0].some((cell) => cell.tagName === "TH"))
    record(issues, "table-header-review", table, "First row has no explicit th cells");
  const caption = table.querySelector("caption");
  if (caption) record(issues, "table-caption-review", table, caption.textContent ?? "");
  if (table.querySelector("td ul,td ol,th ul,th ol"))
    record(issues, "table-nested-list-review", table, "List markup in table cells is preserved as inline text");
  if (!cells.length || !cells[0].length) { record(issues, "empty-table", table, table.outerHTML); return null; }
  if (cells.some((row) => row.length !== cells[0].length))
    record(issues, "ragged-table-review", table, `Cell counts: ${cells.map((row) => row.length).join(",")}`);
  const values = cells.map((row) => row.map((cell) => inlineNodes(cell, url, issues)));
  const block = { blockId, type: "table" as const,
    ...(caption && normalize(caption.textContent ?? "") ? { caption: inlineNodes(caption, url, issues) } : {}),
    headers: values[0], rows: values.slice(1) };
  const parsed = blockSchema.safeParse(block);
  if (!parsed.success) { record(issues, "table-shape-review", table, parsed.error.message); return null; }
  return parsed.data;
}

function listBlock(list: Element, blockId: string, url: string, issues: ExtractionIssue[]): ContentBlock | null {
  const items: Inline[][] = [];
  const depths: number[] = [];
  const itemKinds: ("ordered" | "unordered")[] = [];
  const visit = (parent: Element, depth: number) => {
    let looseNodes: Node[] = [];
    const flushLoose = () => {
      if (!looseNodes.length) return;
      const wrapper = parent.ownerDocument.createElement("div");
      looseNodes.forEach((node) => wrapper.appendChild(node.cloneNode(true)));
      looseNodes = [];
      if (!normalize(wrapper.textContent ?? "")) return;
      const content = inlineNodes(wrapper, url, issues);
      items.push(content); depths.push(depth); itemKinds.push(parent.tagName === "OL" ? "ordered" : "unordered");
      record(issues, "orphan-list-content-review", parent, wrapper.textContent ?? "");
    };
    for (const node of parent.childNodes) {
      if (node.nodeType !== 1 || !["LI", "UL", "OL"].includes((node as Element).tagName)) {
        looseNodes.push(node);
        continue;
      }
      flushLoose();
      const item = node as Element;
      if (item.tagName !== "LI") { visit(item, depth + 1); continue; }
      const content = inlineNodes(item, url, issues, "text", true);
      if (!content.length) record(issues, "empty-list-item-review", item, item.outerHTML);
      else {
        items.push(content); depths.push(depth); itemKinds.push(parent.tagName === "OL" ? "ordered" : "unordered");
      }
      if (item.querySelectorAll(":scope > p").length > 1) record(issues, "list-paragraphs-review", item, item.outerHTML);
      for (const nested of [...item.querySelectorAll("ul,ol")]
        .filter((child) => child.closest("li") === item))
        visit(nested, depth + 1);
    }
    flushLoose();
  };
  visit(list, 0);
  const block = { blockId, type: "list" as const, ordered: list.tagName === "OL", items, depths, itemKinds };
  const parsed = blockSchema.safeParse(block);
  if (!parsed.success) { record(issues, "list-shape-review", list, parsed.error.message); return null; }
  return parsed.data;
}

function sourceId(element: Element, prefix: string, ordinal: number, issues: ExtractionIssue[], usedIds: Set<string>): string {
  const anchor = element.id;
  if (!anchor) record(issues, "provisional-id", element, `${prefix}-${ordinal}`);
  else if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(anchor)) record(issues, "invalid-anchor-review", element, anchor);
  const base = anchor && /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(anchor)
    ? `${prefix}-${anchor}` : `${prefix}-${ordinal}`;
  let candidate = base;
  for (let suffix = 2; usedIds.has(candidate); suffix++) candidate = `${base}-${suffix}`;
  if (candidate !== base) record(issues, "duplicate-id-review", element, `${base} -> ${candidate}`);
  usedIds.add(candidate);
  return candidate;
}

function blockFrom(element: Element, blockId: string, url: string, issues: ExtractionIssue[]): ContentBlock | null {
  const tag = element.tagName.toLowerCase();
  if (tag === "table") return tableBlock(element, blockId, url, issues);
  if (tag === "ul" || tag === "ol") return listBlock(element, blockId, url, issues);
  if (tag === "p") {
    const content = inlineNodes(element, url, issues);
    if (!normalize(element.textContent ?? "")) return null;
    return blockSchema.parse({ blockId, type: "paragraph", content });
  }
  if (tag === "blockquote" || tag === "li") {
    const content = inlineNodes(element, url, issues, "text", tag === "li");
    record(issues, tag === "blockquote" ? "blockquote-review" : "orphan-list-item-review", element, element.outerHTML);
    return content.length ? blockSchema.parse({ blockId, type: "paragraph", content }) : null;
  }
  record(issues, "unsupported-block", element, element.outerHTML);
  return null;
}

function sourceText(sections: Section[]): string {
  const inlines = (content: Inline[]) => content.map((node) => node.text).join("");
  const blockText = (block: ContentBlock) => block.type === "list" ? block.items.map(inlines).join(" ")
    : block.type === "table" ? [block.caption ?? [], ...block.headers, ...block.rows.flat()].map(inlines).join(" ")
      : block.type === "rating" ? "" : inlines(block.content);
  return normalize(sections.map((section) => [section.sectionId === "intro" ? "" : section.heading,
    ...section.blocks.map(blockText)].join(" ")).join(" "));
}

export function extractHtml(html: string, canonicalUrl: string, contentSelector: string, title: string): Extraction {
  const document = new JSDOM(html, { url: canonicalUrl, virtualConsole: new VirtualConsole() }).window.document;
  const matches = [...document.querySelectorAll(contentSelector)];
  if (matches.length !== 1) throw new Error(`Content selector matched ${matches.length} elements: ${contentSelector}`);
  const root = matches[0];
  root.querySelectorAll(ignorable).forEach((node) => node.remove());
  const issues: ExtractionIssue[] = [];
  const signals = ratingSignals(root, issues);
  const sections: Section[] = [];
  const usedIds = new Set<string>(["intro"]);
  let current: Section = { sectionId: "intro", heading: title, blocks: [] };
  const headingStack: { level: number; id: string }[] = [];
  let blockOrdinal = 0;
  const walkChildren = (parent: Element, visit: (child: Element) => void) => {
    for (const node of parent.childNodes) {
      if (node.nodeType === 1) { visit(node as Element); continue; }
      if (node.nodeType !== 3) continue;
      const looseText = normalize(node.textContent ?? "");
      if (!looseText) continue;
      let blockId = `block-${current.sectionId}-${++blockOrdinal}`;
      for (let suffix = 2; usedIds.has(blockId); suffix++) blockId = `block-${current.sectionId}-${blockOrdinal}-${suffix}`;
      usedIds.add(blockId);
      current.blocks.push(blockSchema.parse({ blockId, type: "paragraph", content: [{ type: "text", text: looseText }] }));
      record(issues, "loose-text-review", parent, looseText);
    }
  };
  const walk = (element: Element) => {
    const tag = element.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) {
      const heading = normalize(element.textContent ?? "");
      if (!heading) { record(issues, "empty-heading-review", element, element.outerHTML); return; }
      if (current.blocks.length || current.sectionId !== "intro") sections.push(sectionSchema.parse(current));
      const level = Number(tag[1]);
      while (headingStack.length && headingStack[headingStack.length - 1].level >= level) headingStack.pop();
      const sectionId = sourceId(element, "section", sections.length + 1, issues, usedIds);
      current = { sectionId, heading,
        ...(element.id ? { sourceAnchor: element.id } : {}),
        ...(headingStack.length ? { parentSectionId: headingStack[headingStack.length - 1].id } : {}), blocks: [] };
      headingStack.push({ level, id: sectionId }); blockOrdinal = 0;
      return;
    }
    if (["div", "section", "article", "main"].includes(tag)) {
      walkChildren(element, walk);
      return;
    }
    if (tag === "figure") {
      const content = [...element.children].filter((child) => ["TABLE", "FIGCAPTION"].includes(child.tagName));
      if (content.length) {
        for (const child of content) {
          const childId = sourceId(child, `block-${current.sectionId}`, ++blockOrdinal, issues, usedIds);
          const block = child.tagName === "TABLE" ? tableBlock(child, childId, canonicalUrl, issues)
            : blockSchema.parse({ blockId: childId, type: "paragraph", content: inlineNodes(child, canonicalUrl, issues) });
          if (block) current.blocks.push(block);
        }
      } else {
        const quotes = [...element.querySelectorAll("blockquote")];
        if (quotes.length === 1 && normalize(element.textContent ?? "") === normalize(quotes[0].textContent ?? "")) {
          const quote = quotes[0];
          const blockId = sourceId(quote, `block-${current.sectionId}`, ++blockOrdinal, issues, usedIds);
          const content = inlineNodes(quote, canonicalUrl, issues);
          current.blocks.push(blockSchema.parse({ blockId, type: "paragraph", content }));
          record(issues, "blockquote-review", quote, quote.outerHTML);
        } else record(issues, "unsupported-block", element, element.outerHTML);
      }
      return;
    }
    const blockId = sourceId(element, `block-${current.sectionId}`, ++blockOrdinal, issues, usedIds);
    const block = blockFrom(element, blockId, canonicalUrl, issues);
    if (block) current.blocks.push(block);
    if (tag === "li") {
      for (const nested of [...element.querySelectorAll("ul,ol")]
        .filter((child) => child.closest("li") === element)) walk(nested);
    }
  };
  walkChildren(root, walk);
  if (current.blocks.length || current.sectionId !== "intro") sections.push(sectionSchema.parse(current));
  if (!sections.some((section) => section.blocks.length)) throw new Error("No analytical blocks extracted");
  const normalized = normalize(root.textContent ?? "");
  if (sourceText(sections).replace(/\s+/g, "") !== normalized.replace(/\s+/g, ""))
    issues.push({ code: "text-coverage-review", location: "root", detail: "Extracted text differs from source content" });
  const text = sourceText(sections);
  return { sections, issues, contentHash: digest(root.outerHTML), metrics: { words: text ? text.split(/\s+/).length : 0,
    sections: sections.length, blocks: sections.reduce((total, section) => total + section.blocks.length, 0),
    tables: sections.reduce((total, section) => total + section.blocks.filter((block) => block.type === "table").length, 0),
    ratingSignals: signals } };
}
