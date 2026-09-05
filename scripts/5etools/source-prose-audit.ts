import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

import { RENAMED_FROM_2014 } from "./differs-from-2014";
import { stripMarkup } from "./markup";
import { findLooseNameKey, readSpells, readSpellsFrom, SourceSpell } from "./schema";

export type SourceProseClassification =
  | "differs-from-2014"
  | "new-in-2024"
  | "source-identical";

export type SourceProseAuditRow = {
  engName: string;
  classification: SourceProseClassification;
  source2014Hash: string | null;
  source2024Hash: string;
};

export type SourceProseAudit = {
  total: number;
  withCounterpart2014: number;
  differsFrom2014: number;
  newIn2024: number;
  sourceIdentical: number;
  manualQueue: number;
  rows: SourceProseAuditRow[];
};

const XPHB_SOURCE_PATH = join(
  process.cwd(),
  "data",
  "5etools",
  "raw",
  "spells",
  "spells-xphb.json"
);

export function buildSourceProseAudit(): SourceProseAudit {
  const modernSpells = readXphbSpells();
  const classicByName = indexClassicSpells(readSpells());
  const rows = modernSpells.map((modern) => compareSourceProse(modern, classicByName));
  rows.sort((left, right) => left.engName.localeCompare(right.engName, "en"));

  const newIn2024 = countRows(rows, "new-in-2024");
  const sourceIdentical = countRows(rows, "source-identical");
  const differsFrom2014 = countRows(rows, "differs-from-2014");

  return {
    total: rows.length,
    withCounterpart2014: rows.length - newIn2024,
    differsFrom2014,
    newIn2024,
    sourceIdentical,
    manualQueue: differsFrom2014 + newIn2024,
    rows,
  };
}

function readNormalizedSourceProse(spell: SourceSpell): string {
  return readVisibleSourceProse(spell)
    .replace(/[‘’ʼ`]/gu, "'")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("en");
}

function readVisibleSourceProse(spell: SourceSpell): string {
  const record = readRecord(spell.raw, `${spell.nameEng}|${spell.source}`);
  return [record.entries, record.entriesHigherLevel]
    .filter((value) => value !== undefined)
    .flatMap((value) => renderEntry(value, `${spell.nameEng}|${spell.source}`))
    .join("\n\n");
}

function hashSourceProse(normalized: string): string {
  return createHash("sha256").update(normalized, "utf-8").digest("hex");
}

function readXphbSpells(): SourceSpell[] {
  const source = JSON.parse(readFileSync(XPHB_SOURCE_PATH, "utf-8")) as unknown;
  const spells = readSpellsFrom(source, XPHB_SOURCE_PATH);
  const foreign = spells.filter((spell) => spell.source !== "XPHB");
  if (foreign.length > 0) {
    throw new Error(
      `${XPHB_SOURCE_PATH}: знайдено не-XPHB записи: ${foreign.map((spell) => spell.nameEng).join(", ")}`
    );
  }
  return spells;
}

function indexClassicSpells(spells: SourceSpell[]): Map<string, SourceSpell> {
  const index = new Map<string, SourceSpell>();
  for (const spell of spells) {
    if (spell.edition !== "RULES_2014") continue;
    const key = findLooseNameKey(spell.nameEng);
    if (!index.has(key)) index.set(key, spell);
  }
  return index;
}

function compareSourceProse(
  modern: SourceSpell,
  classicByName: Map<string, SourceSpell>
): SourceProseAuditRow {
  const classicName = RENAMED_FROM_2014[modern.nameEng] ?? modern.nameEng;
  const classic = classicByName.get(findLooseNameKey(classicName));
  const modernText = readNormalizedSourceProse(modern);
  const source2024Hash = hashSourceProse(modernText);

  if (!classic) {
    return {
      engName: modern.nameEng,
      classification: "new-in-2024",
      source2014Hash: null,
      source2024Hash,
    };
  }

  const classicText = readNormalizedSourceProse(classic);
  return {
    engName: modern.nameEng,
    classification: classicText === modernText ? "source-identical" : "differs-from-2014",
    source2014Hash: hashSourceProse(classicText),
    source2024Hash,
  };
}

function countRows(rows: SourceProseAuditRow[], classification: SourceProseClassification): number {
  return rows.filter((row) => row.classification === classification).length;
}

function renderEntry(value: unknown, where: string): string[] {
  if (typeof value === "string") return [stripMarkup(value, where)];
  if (typeof value === "number") return [String(value)];
  if (Array.isArray(value)) return value.flatMap((entry) => renderEntry(entry, where));

  const record = readRecord(value, where);
  const type = record.type;
  if (typeof type !== "string") return renderRoll(record, where);

  return renderTypedEntry(record, type, where);
}

function renderTypedEntry(record: Record<string, unknown>, type: string, where: string): string[] {
  switch (type) {
    case "entries":
    case "inset":
    case "item":
      return renderNamedEntry(record, type, where);
    case "list":
      return renderRequiredEntry(record.items, `${where}.list.items`);
    case "quote":
      return renderQuoteEntry(record, where);
    case "table":
      return renderTableEntry(record, where);
    case "cell":
      return renderRequiredEntry(record.roll, `${where}.cell.roll`);
    default:
      throw new Error(`${where}: невідомий тип prose-entry «${type}»`);
  }
}

function renderNamedEntry(record: Record<string, unknown>, type: string, where: string): string[] {
  return [
    ...renderOptionalEntry(record.name, where),
    ...renderRequiredEntry(record.entries, `${where}.${type}.entries`),
  ];
}

function renderQuoteEntry(record: Record<string, unknown>, where: string): string[] {
  return [
    ...renderRequiredEntry(record.entries, `${where}.quote.entries`),
    ...renderOptionalEntry(record.by, where),
  ];
}

function renderTableEntry(record: Record<string, unknown>, where: string): string[] {
  return [
    ...renderOptionalEntry(record.caption, where),
    ...renderRequiredEntry(record.colLabels, `${where}.table.colLabels`),
    ...renderRequiredEntry(record.rows, `${where}.table.rows`),
  ];
}

function renderOptionalEntry(value: unknown, where: string): string[] {
  return value === undefined ? [] : renderEntry(value, where);
}

function renderRequiredEntry(value: unknown, where: string): string[] {
  if (value === undefined) throw new Error(`${where}: бракує видимого вмісту`);
  return renderEntry(value, where);
}

function renderRoll(record: Record<string, unknown>, where: string): string[] {
  if (typeof record.exact === "number") return [String(record.exact)];
  if (typeof record.min === "number" && typeof record.max === "number") {
    return [`${record.min}-${record.max}`];
  }
  throw new Error(`${where}: невідома структура prose-entry`);
}

function readRecord(value: unknown, where: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${where}: очікували prose-entry object`);
  }
  return value as Record<string, unknown>;
}
