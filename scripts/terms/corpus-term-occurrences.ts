import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CORPUS_RETIRED_FORMS } from "../../tests/content/ratified-term-forms";
import { findSentence } from "./sentence";

/// KR32.1: носії, яких до цього дня не бачив жоден гейт — вони живлять конструктор
/// (`creator-content-*.json`), UI-написи (`translation.ts`), рукописний довідник правил
/// (`rulesData.ts`) і чотири каталоги без термінологічного гейта (бастіони, пастки й
/// небезпеки, об'єкти, довідник правил трьох джерел) плюс предмети 2024, яких
/// `magicItemsData.ts` віддає напряму з файлу, без бази ([O32](../../docs/o32-corpus-terms/README.md)).
const CARRIERS = [
  "src/lib/generated/creator-content-2014.json",
  "src/lib/generated/creator-content-2024.json",
  "src/lib/refs/translation.ts",
  "src/lib/rulesData.ts",
  "src/lib/generated/bastions.json",
  "src/lib/generated/traps-hazards.json",
  "src/lib/generated/objects.json",
  "src/lib/generated/rules-2014.json",
  "src/lib/generated/rules-2024.json",
  "src/lib/generated/rules-beyond-srd.json",
  "data/2024/normalized/magic-items.json",
] as const;

export type CorpusTermOccurrence = {
  carrier: string;
  record: string;
  field: string;
  label: string;
  form: string;
  sentence: string;
};

export function findCorpusTermOccurrences(): CorpusTermOccurrence[] {
  return CARRIERS.flatMap(readCarrier);
}

export function countCorpusTermsByCarrier(): Record<string, number> {
  const counted: Record<string, number> = {};
  for (const carrier of CARRIERS) counted[carrier] = readCarrier(carrier).length;
  return counted;
}

function readCarrier(carrier: string): CorpusTermOccurrence[] {
  const raw = readFileSync(join(process.cwd(), carrier), "utf-8");
  if (!carrier.endsWith(".json")) return collectFromSource(raw, carrier);

  const found: CorpusTermOccurrence[] = [];
  collectFromNode(JSON.parse(raw) as unknown, carrier, "?", "", found);
  return found;
}

/// `translation.ts` і `rulesData.ts` тримають прозу в коді, не в JSON — розібрати їх як дані
/// не можна, але текст у них той самий, що йде в UI, тож гейт читає їх рядками.
function collectFromSource(raw: string, carrier: string): CorpusTermOccurrence[] {
  const found: CorpusTermOccurrence[] = [];
  raw.split("\n").forEach((line, index) => {
    collectMatches(line, carrier, `рядок ${index + 1}`, "", found);
  });
  return found;
}

function collectFromNode(
  node: unknown,
  carrier: string,
  record: string,
  field: string,
  found: CorpusTermOccurrence[]
): void {
  if (typeof node === "string") {
    collectMatches(node, carrier, record, field, found);
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) collectFromNode(item, carrier, record, field, found);
    return;
  }

  if (node === null || typeof node !== "object") return;

  const entries = node as Record<string, unknown>;
  const named = readRecordName(entries) ?? record;
  for (const [key, value] of Object.entries(entries)) {
    collectFromNode(value, carrier, named, key, found);
  }
}

function collectMatches(
  text: string,
  carrier: string,
  record: string,
  field: string,
  found: CorpusTermOccurrence[]
): void {
  for (const { label, pattern } of CORPUS_RETIRED_FORMS) {
    const global = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    for (const match of text.matchAll(global)) {
      found.push({ carrier, record, field, label, form: match[0], sentence: findSentence(text, match[0]) });
    }
  }
}

function readRecordName(entries: Record<string, unknown>): string | undefined {
  for (const key of ["name", "engName", "title"]) {
    const value = entries[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}
