export type ParsedRuleCategoryKey =
  | "combat"
  | "spellcasting"
  | "abilities"
  | "conditions"
  | "adventuring"
  | "equipment"
  | "gamemaster";

export type ParsedRuleSubSection = {
  id: string;
  engTitle: string;
  engContent: string;
};

export type MarkdownBlock = {
  level: number;
  title: string;
  body: string;
};

export type MarkdownHeading = {
  level: number;
  title: string;
  line: number;
};

export function splitByHeadings(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let current: { level: number; title: string; lines: string[] } | null = null;

  for (const line of markdown.split("\n")) {
    const heading = /^(#{1,6})\s+(.*\S)\s*$/.exec(line);
    if (heading) {
      if (current) blocks.push(closeBlock(current));
      current = { level: heading[1].length, title: heading[2].trim(), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }

  if (current) blocks.push(closeBlock(current));
  return blocks;
}

export function collectHeadings(lines: string[]): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];

  lines.forEach((line, index) => {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!match) return;
    headings.push({ level: match[1].length, title: match[2].trim(), line: index });
  });

  return headings;
}

export function sliceByLevel(
  headings: MarkdownHeading[],
  level: number,
  totalLines: number
): { heading: MarkdownHeading; endLine: number }[] {
  const starts = headings.filter((heading) => heading.level === level);

  return starts.map((heading, index) => ({
    heading,
    endLine: starts[index + 1]?.line ?? totalLines,
  }));
}

export function normalizeBody(body: string): string {
  return convertHtmlTables(body).replace(/\n{3,}/g, "\n\n").trim();
}

export function buildSummary(body: string): string {
  const firstParagraph = body
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .find(
      (paragraph) =>
        paragraph && !paragraph.startsWith("|") && !paragraph.startsWith("-") && !paragraph.startsWith("**")
    );

  if (!firstParagraph) return "";

  const plain = stripMarkdown(firstParagraph);
  const firstSentence = /^.*?[.!?](?=\s|$)/.exec(plain)?.[0] ?? plain;
  return firstSentence.length > 220 ? `${firstSentence.slice(0, 217).trimEnd()}…` : firstSentence;
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function kebabCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function claimSlug(base: string, qualifier: string | null, takenSlugs: Set<string>): string {
  const qualified = takenSlugs.has(base) && qualifier ? `${base}-${qualifier}` : base;
  let slug = qualified;
  let attempt = 2;
  while (takenSlugs.has(slug)) {
    slug = `${qualified}-${attempt}`;
    attempt += 1;
  }
  takenSlugs.add(slug);
  return slug;
}

export function numberArticlesWithinCategory<T extends { category: ParsedRuleCategoryKey }>(
  articles: T[]
): (T & { order: number })[] {
  const counters = new Map<ParsedRuleCategoryKey, number>();
  return articles.map((article) => {
    const next = (counters.get(article.category) ?? 0) + 1;
    counters.set(article.category, next);
    return { ...article, order: next };
  });
}

export function countWords(bodies: string[]): number {
  return bodies.join(" ").split(/\s+/).filter(Boolean).length;
}

function closeBlock(block: { level: number; title: string; lines: string[] }): MarkdownBlock {
  return { level: block.level, title: block.title, body: normalizeBody(block.lines.join("\n")) };
}

function convertHtmlTables(body: string): string {
  return body.replace(/<table>[\s\S]*?<\/table>/g, (table) => convertOneHtmlTable(table));
}

function convertOneHtmlTable(table: string): string {
  const headerCells = readTableCells(table.match(/<thead>[\s\S]*?<\/thead>/)?.[0] ?? "");
  const bodyRows = readTableRows(table.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0] ?? table);

  if (headerCells.length === 0) {
    return bodyRows.map((row) => `- ${row.filter(Boolean).join(" · ")}`).join("\n");
  }

  const header = `| ${headerCells.join(" | ")} |`;
  const divider = `| ${headerCells.map(() => "---").join(" | ")} |`;
  const rows = bodyRows.map((row) => `| ${padRow(row, headerCells.length).join(" | ")} |`);
  return [header, divider, ...rows].join("\n");
}

function readTableRows(html: string): string[][] {
  return [...html.matchAll(/<tr>[\s\S]*?<\/tr>/g)].map((match) => readTableCells(match[0]));
}

function readTableCells(html: string): string[] {
  return [...html.matchAll(/<t[hd]>([\s\S]*?)<\/t[hd]>/g)].map((match) => cleanCell(match[1]));
}

function cleanCell(value: string): string {
  return value
    .replace(/<br\s*\/?>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\|/g, "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

function padRow(row: string[], width: number): string[] {
  const padded = [...row];
  while (padded.length < width) padded.push("");
  return padded.slice(0, width);
}
