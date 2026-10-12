import type { ArticleDocument, ContentBlock, InlineNode } from "./types";

type Section = ArticleDocument["translations"][number]["sections"][number];
type TableBlock = Extract<ContentBlock, { type: "table" }>;

export type LevelTableRow = { level: number; features: string; notes: string };

export function joinInlineText(nodes: readonly InlineNode[]): string {
  return nodes.map((node) => node.text).join("");
}

export function flattenSectionText(section: Section): string {
  return section.blocks.map(flattenBlockText).join("\n\n");
}

function flattenBlockText(block: ContentBlock): string {
  if (block.type === "list") return block.items.map(joinInlineText).join(" ");
  if (block.type === "table") return [...block.headers, ...block.rows.flat()].map(joinInlineText).join(" ");
  if (block.type === "rating") return "";
  return joinInlineText(block.content);
}

export function findFirstTable(section: Section): TableBlock | undefined {
  return section.blocks.find((block): block is TableBlock => block.type === "table");
}

export type LevelTableColumns = { featuresColumn: number; notesColumn: number };
const DEFAULT_LEVEL_TABLE_COLUMNS: LevelTableColumns = { featuresColumn: 1, notesColumn: 2 };

export function readLevelTableRows(section: Section, columns: LevelTableColumns = DEFAULT_LEVEL_TABLE_COLUMNS): LevelTableRow[] {
  const table = findFirstTable(section);
  if (!table) return [];
  const readCell = (row: InlineNode[][], column: number) => (row[column] ? joinInlineText(row[column]) : "");
  if (isNamedByClassLevel(table.rows)) {
    return table.rows.map((row, position) => ({ level: position + 1, features: readCell(row, columns.featuresColumn), notes: readCell(row, columns.notesColumn) }));
  }
  const rows = isLevelCell(table.headers[0]) ? [table.headers, ...table.rows] : table.rows;
  return rows.flatMap((row) => {
    const level = readLeadingLevel(row[0]);
    if (level === null) return [];
    return [{ level, features: readCell(row, columns.featuresColumn), notes: readCell(row, columns.notesColumn) }];
  });
}

function isNamedByClassLevel(rows: readonly InlineNode[][][]): boolean {
  return rows.length > 0 && rows.every((row) => /^\s*\S+(\s+\S+)*\s+\d{1,2}\s*$/.test(joinInlineText(row[0])) && readLeadingLevel(row[0]) === null);
}

function isLevelCell(cell: InlineNode[] | undefined): boolean {
  return cell !== undefined && readLeadingLevel(cell) !== null;
}

function readLeadingLevel(cell: InlineNode[]): number | null {
  const match = /^\s*(\d{1,2})(?!\d)/.exec(joinInlineText(cell));
  return match ? Number(match[1]) : null;
}

export function readAbilityTableBaseScores(section: Section): number[] | null {
  const table = findFirstTable(section);
  if (!table || table.rows.length !== 6) return null;
  const scores = table.rows.map((row) => Number(joinInlineText(row[1] ?? []).trim()));
  return scores.every(Number.isInteger) ? scores : null;
}
