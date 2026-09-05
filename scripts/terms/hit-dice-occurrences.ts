import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { findSentence } from "./sentence";

/// Знято 2026-09-01: ратифікований термін — `DND_DICTIONARY.restAndRecovery.hitDice`,
/// «Кубики Здоровʼя». «Кістки хітів» прийшли партіями бестіарію 2014 до ратифікації, і
/// корпус тримав дві форми одного терміна, поки партія 19 не пішла за словником.
export const RETIRED_HIT_DICE = /кіст(?:ки|ок|ка|ці|кам|ками|ках)?\s+хітів/gu;

/// Кубик супутника стоїть у квадратних дужках: так пише англійське джерело («[d8s]»),
/// і так фраза не отримує других дужок усередині вже наявних.
export const PARENTHESISED_COMPANION_DIE = /Кубик[а-яіїєґ]* Здоровʼя \(к\d+\)/gu;

export type TermOccurrence = {
  carrier: string;
  record: string;
  field: string;
  form: string;
  sentence: string;
};

/// Гейт стоїть і на джерелах, і на каталогах: правити термін дозволено лише у файлі-джерелі
/// (Р33), а каталог доводить, що збірка донесла правку до сторінки.
const CATALOGS = [
  "src/lib/generated/creatures.json",
  "src/lib/generated/creatures2024.json",
] as const;

const BATCH_DIRECTORIES = [
  "data/aidedd/translations/monsters-2014",
  "data/aidedd/translations/monsters-2024",
  "data/5etools/translations/monsters-2014",
  "data/5etools/translations/monsters-2024",
] as const;

export function findRetiredHitDice(): TermOccurrence[] {
  return findMatching(RETIRED_HIT_DICE);
}

export function findParenthesisedCompanionDice(): TermOccurrence[] {
  return findMatching(PARENTHESISED_COMPANION_DIE);
}

export function countRetiredHitDiceByCarrier(): Record<string, number> {
  const counted: Record<string, number> = {};
  for (const carrier of listCarriers()) counted[carrier] = 0;
  for (const found of findRetiredHitDice()) counted[found.carrier] += 1;
  return counted;
}

function findMatching(pattern: RegExp): TermOccurrence[] {
  return listCarriers().flatMap((carrier) => readCarrier(carrier, pattern));
}

function listCarriers(): string[] {
  return [...CATALOGS, ...BATCH_DIRECTORIES.flatMap(listBatchFiles)];
}

function listBatchFiles(directory: string): string[] {
  return readdirSync(join(process.cwd(), directory))
    .filter((entry) => entry.endsWith(".json"))
    .sort()
    .map((entry) => `${directory}/${entry}`);
}

function readCarrier(carrier: string, pattern: RegExp): TermOccurrence[] {
  const parsed: unknown = JSON.parse(readFileSync(join(process.cwd(), carrier), "utf-8"));
  const found: TermOccurrence[] = [];
  collectFromNode(parsed, carrier, "?", "", pattern, found);
  return found;
}

function collectFromNode(
  node: unknown,
  carrier: string,
  record: string,
  field: string,
  pattern: RegExp,
  found: TermOccurrence[]
): void {
  if (typeof node === "string") {
    for (const form of node.match(pattern) ?? []) {
      found.push({ carrier, record, field, form, sentence: findSentence(node, form) });
    }
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) collectFromNode(item, carrier, record, field, pattern, found);
    return;
  }

  if (node === null || typeof node !== "object") return;

  const entries = node as Record<string, unknown>;
  const named = readRecordName(entries) ?? record;
  for (const [key, value] of Object.entries(entries)) {
    collectFromNode(value, carrier, named, key, pattern, found);
  }
}

function readRecordName(entries: Record<string, unknown>): string | undefined {
  for (const key of ["nameEng", "name", "slug"]) {
    const value = entries[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}
