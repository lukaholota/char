import { stripMarkup } from "./markup";
import { readCachedValue } from "./mirror";
import { findLooseNameKey, RulesEdition } from "./schema";

/// Лор бестіарію в 5etools — дерево, а не плоский список: запис істоти тримає `_copy` на
/// вузол групи («Red Dragon» → «Chromatic Dragons» → «Dragons») і дописує свій текст через
/// `_mod.entries`. Вузли груп у самому бестіарії істотами не існують. KR33.8 бере корінь
/// дерева — вступ до групи — і істот, чий ланцюг у нього впирається.
export type LoreNode = {
  name: string;
  source: string;
  parentName: string | null;
  ownEntries: unknown[];
  isMonster: boolean;
};

export type LoreGroup = {
  key: string;
  engName: string;
  source: string;
  edition: RulesEdition;
  entries: unknown[];
  sourceSections: string[];
  memberNames: string[];
  words: number;
};

type Json = Record<string, unknown>;

const LORE_FILES: Record<RulesEdition, { fluff: string; bestiary: string }> = {
  RULES_2014: { fluff: "bestiary/fluff-bestiary-mm.json", bestiary: "bestiary/bestiary-mm.json" },
  RULES_2024: { fluff: "bestiary/fluff-bestiary-xmm.json", bestiary: "bestiary/bestiary-xmm.json" },
};

export function readLoreGroups(edition: RulesEdition): LoreGroup[] {
  const nodes = readLoreNodes(edition);
  const byName = new Map(nodes.map((node) => [node.name, node]));
  const roots = nodes.filter((node) => !node.isMonster && node.parentName === null && countEntryWords(node.ownEntries) > 0);
  const members = collectMembersByRoot(nodes, byName);

  return roots.map((root) => ({
    key: findLoreGroupKey(root.name),
    engName: findLoreGroupDisplayName(root.name),
    source: root.source,
    edition,
    entries: root.ownEntries,
    sourceSections: collectSectionNames(root.ownEntries),
    memberNames: members.get(root.name) ?? [],
    words: countEntryWords(root.ownEntries),
  }));
}

export function readLoreNodes(edition: RulesEdition): LoreNode[] {
  const { fluff, bestiary } = LORE_FILES[edition];
  const monsterKeys = new Set(readRecords(bestiary, "monster").map((monster) => findLooseNameKey(String(monster.name))));

  return readRecords(fluff, "monsterFluff").map((record) => ({
    name: String(record.name),
    source: String(record.source),
    parentName: readCopiedName(record),
    ownEntries: collectOwnEntries(record),
    isMonster: monsterKeys.has(findLooseNameKey(String(record.name))),
  }));
}

/// «Kuo-toa (*)» у XMM — вузол групи, названий так, щоб не збігтися з істотою «Kuo-toa».
export function findLoreGroupDisplayName(nodeName: string): string {
  return nodeName.replace(/\s*\(\*\)\s*$/, "");
}

export function findLoreGroupKey(nodeName: string): string {
  return findLoreGroupDisplayName(nodeName)
    .toLowerCase()
    .replace(/['’ʼ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/// Англійський текст групи для перекладу: абзаци через порожній рядок, підрозділи жирним,
/// списки й таблиці — GFM, вставки й цитати — цитатою. Картинки не текст.
export function renderLoreEntriesToMarkdown(entries: unknown[], context = ""): string {
  return entries
    .map((entry) => renderEntry(entry, context))
    .filter((block) => block.trim() !== "")
    .join("\n\n");
}

export function countEntryWords(entries: unknown[]): number {
  return collectEntryStrings(entries).reduce((total, text) => total + countWords(text), 0);
}

function collectMembersByRoot(nodes: LoreNode[], byName: Map<string, LoreNode>): Map<string, string[]> {
  const members = new Map<string, string[]>();
  for (const node of nodes.filter((candidate) => candidate.isMonster)) {
    const root = findRoot(node, byName);
    if (root === node || root.isMonster) continue;
    members.set(root.name, [...(members.get(root.name) ?? []), node.name]);
  }
  return members;
}

function findRoot(node: LoreNode, byName: Map<string, LoreNode>): LoreNode {
  let current = node;
  const seen = new Set<string>();
  while (current.parentName !== null) {
    if (seen.has(current.name)) throw new Error(`Цикл у ланцюгу _copy лору: ${node.name}`);
    seen.add(current.name);
    const parent = byName.get(current.parentName);
    if (!parent) return current;
    current = parent;
  }
  return current;
}

function readCopiedName(record: Json): string | null {
  const copy = record._copy;
  if (!copy || typeof copy !== "object") return null;
  const name = (copy as Json).name;
  return typeof name === "string" ? name : null;
}

/// Власний текст вузла: те, що він додає до скопійованого батька (`prependArr` — перед ним,
/// `appendArr` — після), плюс власні `entries`, коли `_copy` немає.
function collectOwnEntries(record: Json): unknown[] {
  const own = Array.isArray(record.entries) ? record.entries : [];
  const copy = record._copy;
  if (!copy || typeof copy !== "object") return own;

  const mod = (copy as Json)._mod;
  const entryMods = mod && typeof mod === "object" ? (mod as Json).entries : undefined;
  const mods = Array.isArray(entryMods) ? entryMods : entryMods ? [entryMods] : [];

  const prepended: unknown[] = [];
  const appended: unknown[] = [];
  for (const rule of mods as Json[]) {
    const items = Array.isArray(rule.items) ? rule.items : rule.items ? [rule.items] : [];
    if (rule.mode === "prependArr") prepended.push(...items);
    else if (rule.mode === "appendArr") appended.push(...items);
    else throw new Error(`${String(record.name)}: невідомий режим _mod.entries «${String(rule.mode)}»`);
  }
  return [...prepended, ...own, ...appended];
}

function collectSectionNames(entries: unknown[]): string[] {
  const names: string[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== "object") return;
    const entry = value as Json;
    if (typeof entry.name === "string" && entry.type !== "item") names.push(entry.name);
    for (const key of ["entries", "items"]) if (entry[key]) walk(entry[key]);
  };
  walk(entries);
  return names;
}

function collectEntryStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectEntryStrings);
  if (!value || typeof value !== "object") return [];
  const entry = value as Json;
  if (entry.type === "image") return [];
  const nested = ["entries", "items", "entry", "rows"].flatMap((key) => (entry[key] ? collectEntryStrings(entry[key]) : []));
  return typeof entry.name === "string" ? [entry.name, ...nested] : nested;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function renderEntry(entry: unknown, context: string): string {
  if (typeof entry === "string") return stripMarkup(entry, context);
  if (Array.isArray(entry)) return renderLoreEntriesToMarkdown(entry, context);
  if (!entry || typeof entry !== "object") return "";

  const node = entry as Json;
  const heading = typeof node.name === "string" ? `**${stripMarkup(node.name, context)}**` : "";
  const body = Array.isArray(node.entries)
    ? renderLoreEntriesToMarkdown(node.entries, context)
    : node.entry !== undefined
      ? renderEntry(node.entry, context)
      : "";

  switch (node.type) {
    case "image":
      return "";
    case "entries":
    case "section":
      return [heading, body].filter(Boolean).join("\n\n");
    case "inset":
    case "insetReadaloud":
      return quoteBlock([heading, body].filter(Boolean).join("\n\n"));
    case "quote":
      return quoteBlock(`${body}${typeof node.by === "string" ? `\n\n— ${stripMarkup(node.by, context)}` : ""}`);
    case "list":
      return renderList(node, context);
    case "item":
      return [heading ? `${heading} ` : "", body].join("");
    case "table":
      return renderTable(node, context);
    default:
      throw new Error(`${context}: невідомий тип запису лору «${String(node.type)}»`);
  }
}

function renderList(node: Json, context: string): string {
  const items = Array.isArray(node.items) ? node.items : [];
  return items.map((item) => `- ${renderEntry(item, context).replace(/\n\n/g, "\n  ")}`).join("\n");
}

function renderTable(node: Json, context: string): string {
  const labels = Array.isArray(node.colLabels) ? node.colLabels.map((label) => stripMarkup(String(label), context)) : [];
  const rows = Array.isArray(node.rows) ? (node.rows as unknown[][]) : [];
  const caption = typeof node.caption === "string" ? `**${stripMarkup(node.caption, context)}**\n\n` : "";
  const header = labels.length > 0 ? `| ${labels.join(" | ")} |\n| ${labels.map(() => "---").join(" | ")} |\n` : "";
  const body = rows.map((row) => `| ${row.map((cell) => renderCell(cell, context)).join(" | ")} |`).join("\n");
  return `${caption}${header}${body}`;
}

function renderCell(cell: unknown, context: string): string {
  if (typeof cell === "string") return stripMarkup(cell, context);
  if (typeof cell === "number") return String(cell);
  return renderEntry(cell, context).replace(/\n+/g, " ");
}

function quoteBlock(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function readRecords(relativePath: string, containerKey: string): Json[] {
  const value = readCachedValue(relativePath);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${relativePath}: очікували обʼєкт із ключем «${containerKey}»`);
  }
  const records = (value as Json)[containerKey];
  if (!Array.isArray(records)) throw new Error(`${relativePath}: немає масиву «${containerKey}»`);
  return records as Json[];
}
