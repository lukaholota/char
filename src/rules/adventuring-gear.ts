import { normalizeSearchText } from "@/lib/search/searchQuery";

export type GearItem = {
  name: string;
  group: string | null;
  price: string | null;
  weight: string | null;
  description: string | null;
  searchWords: readonly string[];
};

type ChapterEntry = { name: string; price: string | null; description: string };
type ChapterLines = { entries: ChapterEntry[]; costRows: string[][]; capacityRows: string[][] };

const ENTRY_LINE = /^\*\*\*(.+?)\*\*\*\.?\s*(.*)$/u;
const SECTION_LINE = /^\*\*(?!\*)(.+?)\*\*\s*$/u;
const GROUP_LABEL = /^\*(.+)\*$/u;
const CHILD_MARK = /^~\s*/u;
const TITLE_WITH_PRICE = /^(.+?)\s*\(([^()]+)\)$/u;
const TRAILING_BRACKETS = /\s*\([^()]*\)$/u;
const COST_SECTION = "Спорядження шукача пригод";
const CAPACITY_SECTION = "Місткість вмістищ";
const TABLE_HEADER_LABELS = new Set(["Річ", "Вмістище"]);

/// Правила кажуть «олія», а за столом кажуть «масло»: без цього гравець її не знаходить.
const SEARCH_WORDS: Readonly<Record<string, readonly string[]>> = { Олія: ["масло"] };

export function parseGear2014(content: string): GearItem[] {
  const { entries, costRows, capacityRows } = readChapterLines(content);
  const capacityByName = buildCapacityLookup(capacityRows);
  const items = mergeEntriesWithCostTable(entries, costRows);
  return sortGear(items.map((item) => appendCapacity(item, capacityByName)));
}

export function parseGear2024(subsections: readonly { title: string; content: string }[]): GearItem[] {
  return sortGear(subsections.slice(1).map(({ title, content }) => {
    const { name, price } = splitTitlePrice(title);
    return buildGearItem(name, { price, description: content.trim() });
  }));
}

export function findMatchingGear(items: readonly GearItem[], query: string): GearItem[] {
  const needle = normalizeSearchText(query).trim();
  if (!needle) return [...items];
  const byName = items.filter((item) => [item.name, ...item.searchWords].some((word) => normalizeSearchText(word).includes(needle)));
  const byText = items.filter((item) => !byName.includes(item) && normalizeSearchText(item.description ?? "").includes(needle));
  return [...byName, ...byText];
}

function readChapterLines(content: string): ChapterLines {
  const lines: ChapterLines = { entries: [], costRows: [], capacityRows: [] };
  let section = "";
  let entry: ChapterEntry | null = null;
  for (const line of content.split("\n")) {
    const heading = line.match(SECTION_LINE);
    const entryStart = line.match(ENTRY_LINE);
    if (heading) {
      section = heading[1];
      entry = null;
    } else if (entryStart) {
      entry = { ...splitTitlePrice(cleanEntryName(entryStart[1])), description: entryStart[2] };
      lines.entries.push(entry);
    } else if (line.startsWith("|")) {
      if (section.includes(COST_SECTION)) lines.costRows.push(readTableCells(line));
      if (section.includes(CAPACITY_SECTION)) lines.capacityRows.push(readTableCells(line));
    } else if (entry && line.trim()) {
      entry.description += `\n\n${line}`;
    }
  }
  return lines;
}

function cleanEntryName(raw: string): string {
  return raw.replace(/\{\{[^}]*\}\}/gu, "").replace(/\s*\[[^\]]*\]/gu, "").replace(/\.$/u, "").trim();
}

function splitTitlePrice(title: string): { name: string; price: string | null } {
  const match = title.trim().match(TITLE_WITH_PRICE);
  return match ? { name: match[1], price: match[2] } : { name: title.trim(), price: null };
}

function readTableCells(line: string): string[] {
  return line.split("|").slice(1, -1).map((cell) => cell.trim());
}

function isTableDataRow([label]: string[]): boolean {
  return Boolean(label) && !label.startsWith("-") && !TABLE_HEADER_LABELS.has(label);
}

function mergeEntriesWithCostTable(entries: ChapterEntry[], costRows: string[][]): GearItem[] {
  const entryByName = new Map(entries.map((entry) => [entry.name.toLocaleLowerCase("uk"), entry]));
  const pricedEntries = new Map<string, GearItem>();
  const tableOnlyItems: GearItem[] = [];
  let group: string | null = null;

  for (const row of costRows.filter(isTableDataRow)) {
    const groupLabel = row[0].match(GROUP_LABEL);
    if (groupLabel) {
      group = groupLabel[1];
      continue;
    }
    if (!CHILD_MARK.test(row[0])) group = null;
    const name = row[0].replace(CHILD_MARK, "");
    const baseName = name.replace(TRAILING_BRACKETS, "").toLocaleLowerCase("uk");
    const fields = { group, price: readCell(row[1]), weight: readCell(row[2]) };
    const entry = entryByName.get(baseName);
    if (entry) pricedEntries.set(baseName, buildGearItem(entry.name, { ...fields, description: entry.description }));
    else tableOnlyItems.push(buildGearItem(name, { ...fields, description: findParentDescription(baseName, group, entryByName) }));
  }

  const unpricedEntries = entries
    .filter((entry) => !pricedEntries.has(entry.name.toLocaleLowerCase("uk")))
    .map((entry) => buildGearItem(entry.name, { price: entry.price, description: entry.description }));
  return [...pricedEntries.values(), ...unpricedEntries, ...tableOnlyItems];
}

/// «Кристал» лежить у групі «Містичне фокусування», «Мотузка, шовкова» — різновид «Мотузки»: правила в них спільні.
function findParentDescription(baseName: string, group: string | null, entryByName: ReadonlyMap<string, ChapterEntry>): string | null {
  const parentName = group?.toLocaleLowerCase("uk") ?? baseName.split(",")[0];
  return entryByName.get(parentName)?.description ?? null;
}

function readCell(cell: string | undefined): string | null {
  return cell && cell !== "-" ? cell : null;
}

function buildCapacityLookup(capacityRows: string[][]): Map<string, string> {
  return new Map(capacityRows.filter(isTableDataRow).flatMap(([label, capacity]) =>
    label.replace(/\*/gu, "").split(" або ").map((name) => [name.trim().toLocaleLowerCase("uk"), capacity] as const),
  ));
}

function appendCapacity(item: GearItem, capacityByName: ReadonlyMap<string, string>): GearItem {
  const capacity = capacityByName.get(item.name.replace(TRAILING_BRACKETS, "").toLocaleLowerCase("uk"));
  if (!capacity) return item;
  const capacityLine = `Місткість: ${capacity}.`;
  return { ...item, description: item.description ? `${item.description}\n\n${capacityLine}` : capacityLine };
}

function buildGearItem(name: string, fields: Partial<Omit<GearItem, "name" | "searchWords">>): GearItem {
  return { name, group: null, price: null, weight: null, description: null, searchWords: SEARCH_WORDS[name] ?? [], ...fields };
}

function sortGear(items: GearItem[]): GearItem[] {
  return items.sort((left, right) => left.name.localeCompare(right.name, "uk"));
}
