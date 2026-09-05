import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { buildSpellHref, buildSpellSlug } from "../../src/lib/spell-link";

/// Посилання на заклинання по маркеру `[EngName]` — рішення власника (O25, KR25.3). Зачіпка —
/// лише маркер: український текст стоїть у відмінках, і зшивати по формах слова заборонено тим
/// самим правилом, що й `sed` по українському тексту. Загортається рівно `Назва [EngName]`, і
/// лише коли назва перед маркером — точна назва заклинання з каталогу; відмінок і чужий переклад
/// ідуть у звіт. Правиться джерело, не каталог ([Р33](../../docs/DECISIONS.md#р33)).

export type Edition = "RULES_2014" | "RULES_2024";

export type Carrier = { path: string; edition: Edition; format: "json" | "ts" };

/// Джерела, які проставляч має право правити. Бестіарій обох редакцій сюди свідомо не входить —
/// його статблоки мають поля, що не рендеряться як проза (KR25.6).
export const SOURCE_DIRECTORIES: ReadonlyArray<{ directory: string; edition: Edition; format: "json" | "ts" }> = [
  { directory: "data/2024/normalized", edition: "RULES_2024", format: "json" },
  { directory: "data/2024/rules-uk", edition: "RULES_2024", format: "json" },
  { directory: "data/2024/bastions-uk", edition: "RULES_2024", format: "json" },
  { directory: "data/2014/rules-uk", edition: "RULES_2014", format: "json" },
  { directory: "data/2014/beyond-srd-uk", edition: "RULES_2014", format: "json" },
  { directory: "data/2014/traps-hazards-uk", edition: "RULES_2014", format: "json" },
  { directory: "data/2014/objects-uk", edition: "RULES_2014", format: "json" },
  /// `prisma/seed` тримає обидві редакції: файл із `2024` у назві — 2024, решта — 2014.
  { directory: "prisma/seed", edition: "RULES_2014", format: "ts" },
];

/// `data/aidedd/magic-items-2014.json` — джерело партій `prisma/seed/magic-items/batch-*.json`
/// (Р33): правити партію окремо не можна, її перегенерують.
export const SOURCE_FILES: ReadonlyArray<Carrier> = [
  { path: "data/aidedd/magic-items-2014.json", edition: "RULES_2014", format: "json" },
];

/// Поверхні — генеровані каталоги, які бачить читач. Їх не правлять; вимірювач лише доводить,
/// що правка джерела доїхала.
export const SURFACES: ReadonlyArray<string> = [
  "src/lib/generated/classes.json",
  "src/lib/generated/creator-content-2014.json",
  "src/lib/generated/creator-content-2024.json",
  "src/lib/generated/races.json",
  "src/lib/generated/feats.json",
  "src/lib/generated/invocations.json",
  "src/lib/generated/infusions.json",
  "src/lib/generated/magicItems.json",
  "src/lib/generated/backgrounds.json",
  "src/lib/generated/bastions.json",
  "src/lib/generated/rules-2014.json",
  "src/lib/generated/rules-2024.json",
  "src/lib/generated/rules-beyond-srd.json",
  "src/lib/generated/traps-hazards.json",
  "src/lib/generated/objects.json",
  "src/lib/generated/spells.json",
  "src/lib/generated/creatures.json",
  "src/lib/generated/creatures2024.json",
];

/// Поля, що несуть назву сутності, а не прозу: власне `Назва [EngName]` запису — не згадка.
const IDENTITY_KEYS = new Set(["name", "engName", "nameEng", "title", "engTitle", "slug", "key", "id", "source", "tags", "aliases"]);

const AMBIGUOUS_NAMES_PATH = "data/spell-links/ambiguous-names.json";
/// Рішення власника 2026-09-04 (П5): у контенті неоднозначна назва майже завжди означає саме
/// заклинання, тож `--ambiguous-too` дозволяє її загорнути — але **після перегляду очима**.
/// Тут лежать переглянуті винятки: згадка, яка заклинанням не є, з причиною на кожну.
const NOT_A_SPELL_PATH = "data/spell-links/not-a-spell.json";

/// Каталоги, чиї англійські назви можуть збігтися з назвою заклинання (предмет «Fireball»,
/// обладунок «Shield», риса «Darkvision»). Згадка з такою назвою — у звіт, не в автоправку.
const OTHER_ENTITY_CATALOGS = [
  "magicItems", "feats", "invocations", "infusions", "weapons", "armor", "backgrounds", "classes", "races",
  "bastions", "creatures", "creatures2024", "rules-2014", "rules-2024", "rules-beyond-srd", "traps-hazards", "objects",
];
const ENTITY_NAME_KEYS = new Set(["engName", "nameEng", "engTitle"]);
/// Під цими ключами лежать посилання на заклинання (предмет «дає» заклинання), а не однойменні сутності.
const SPELL_REFERENCE_KEYS = new Set(["givesSpells", "spells", "spellIds", "grantedSpells"]);

export type SpellRegistry = {
  byEngName: Map<string, { engName: string; ukrainianNames: Set<string> }>;
  ambiguous: Map<string, string[]>;
};

export type Mention = {
  index: number;
  end: number;
  engName: string;
  linked: boolean;
  ambiguous: boolean;
  markdownLink: boolean;
  ukrainianStart: number | null;
  before: string;
};

export type LinkReport = {
  mentions: number;
  linked: number;
  wrapped: number;
  ambiguous: number;
  markdownLinks: number;
  inflected: { engName: string; before: string }[];
};

export type CarrierReport = LinkReport & { path: string; edition: Edition; format: "json" | "ts"; written: boolean; unwritable?: string };

const LOOKBACK = 250;
const MENTION_PATTERN = /\[([^\[\]\n]+)\]/g;

function stripBracketedName(name: string): string {
  return name.replace(/\s*\[[^\]]*\]\s*$/, "").trim();
}

export function collectSpellRegistry(root = process.cwd()): SpellRegistry {
  const byEngName: SpellRegistry["byEngName"] = new Map();
  const catalogs = ["src/lib/generated/spells.json", "data/2024/normalized/spells.json"];
  for (const catalog of catalogs) {
    const spells = JSON.parse(readFileSync(join(root, catalog), "utf-8")) as { name: string; engName: string }[];
    for (const spell of spells) {
      const key = spell.engName.toLowerCase();
      const entry = byEngName.get(key) ?? { engName: spell.engName, ukrainianNames: new Set<string>() };
      entry.ukrainianNames.add(stripBracketedName(spell.name));
      byEngName.set(key, entry);
    }
  }
  return { byEngName, ambiguous: findAmbiguousSpellNames(byEngName, root) };
}

function findAmbiguousSpellNames(byEngName: SpellRegistry["byEngName"], root: string): Map<string, string[]> {
  const collisions = new Map<string, Set<string>>();
  const visit = (value: unknown, catalog: string) => {
    if (Array.isArray(value)) return value.forEach((item) => visit(item, catalog));
    if (!value || typeof value !== "object") return;
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SPELL_REFERENCE_KEYS.has(key)) continue;
      if (ENTITY_NAME_KEYS.has(key) && typeof nested === "string" && byEngName.has(nested.toLowerCase())) {
        const set = collisions.get(nested.toLowerCase()) ?? new Set<string>();
        set.add(catalog);
        collisions.set(nested.toLowerCase(), set);
      } else visit(nested, catalog);
    }
  };
  for (const catalog of OTHER_ENTITY_CATALOGS) {
    const path = join(root, `src/lib/generated/${catalog}.json`);
    if (existsSync(path)) visit(JSON.parse(readFileSync(path, "utf-8")), catalog);
  }
  return new Map([...collisions.entries()].sort().map(([key, set]) => [byEngName.get(key)!.engName, [...set].sort()]));
}

export function readAmbiguousNamesFile(root = process.cwd()): Record<string, string> {
  const path = join(root, AMBIGUOUS_NAMES_PATH);
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf-8")) as Record<string, string>) : {};
}

export type NotASpellIndex = Record<string, Record<string, string>>;

export function readNotASpellFile(root = process.cwd()): NotASpellIndex {
  const path = join(root, NOT_A_SPELL_PATH);
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf-8")) as NotASpellIndex) : {};
}

export function buildAmbiguousNamesFile(registry: SpellRegistry): Record<string, string> {
  return Object.fromEntries(
    [...registry.ambiguous.entries()].map(([name, catalogs]) => [name, `так само зветься запис у: ${catalogs.join(", ")}`])
  );
}

export function writeAmbiguousNamesFile(registry: SpellRegistry, root = process.cwd()): void {
  writeFileSync(join(root, AMBIGUOUS_NAMES_PATH), JSON.stringify(buildAmbiguousNamesFile(registry), null, 2) + "\n", "utf-8");
}

function isWordBoundary(text: string, index: number): boolean {
  return index <= 0 || !/[\p{L}\p{N}]/u.test(text[index - 1]);
}

function findUkrainianStart(text: string, mentionIndex: number, ukrainianNames: Set<string>): number | null {
  const before = text.slice(0, mentionIndex).replace(/\s+$/, "");
  for (const name of ukrainianNames) {
    if (before.endsWith(name) && isWordBoundary(before, before.length - name.length)) return before.length - name.length;
  }
  return null;
}

/// Та сама евристика, якою рахувалася таблиця README O25: згадка — `[EngName]` зі списку
/// заклинань; звʼязана — якщо в попередніх 250 символах є `/spell` без закритого `</a>` після нього.
export function findMentions(text: string, registry: SpellRegistry, unescape = (s: string) => s): Mention[] {
  const mentions: Mention[] = [];
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const raw = unescape(match[1]);
    const spell = registry.byEngName.get(raw.toLowerCase());
    if (!spell) continue;
    const index = match.index!;
    const lookback = text.slice(Math.max(0, index - LOOKBACK), index);
    const linked = lookback.lastIndexOf("/spell") > lookback.lastIndexOf("</a>");
    mentions.push({
      index,
      end: index + match[0].length,
      engName: spell.engName,
      linked,
      ambiguous: registry.ambiguous.has(spell.engName),
      markdownLink: text[index + match[0].length] === "(",
      ukrainianStart: findUkrainianStart(text, index, spell.ukrainianNames),
      before: text.slice(Math.max(0, index - 40), index),
    });
  }
  return mentions;
}

type Coverage = { mentions: number; linked: number };

function addCoverage(into: Coverage, text: string, registry: SpellRegistry, unescape?: (s: string) => string): void {
  for (const mention of findMentions(text, registry, unescape)) {
    into.mentions += 1;
    if (mention.linked) into.linked += 1;
  }
}

/// Лічба обходить прозу так само, як проставляч: поля назви запису (`name`, `engName`…) — не згадки.
export function countJsonCoverage(value: unknown, registry: SpellRegistry, into: Coverage = { mentions: 0, linked: 0 }, key = ""): Coverage {
  if (typeof value === "string") {
    if (!IDENTITY_KEYS.has(key)) addCoverage(into, value, registry);
  } else if (Array.isArray(value)) {
    value.forEach((item) => countJsonCoverage(item, registry, into, key));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) countJsonCoverage(v, registry, into, k);
  }
  return into;
}

export function countTypeScriptCoverage(source: string, registry: SpellRegistry): Coverage {
  const into: Coverage = { mentions: 0, linked: 0 };
  forEachProseLiteral(source, (raw, quote) => addCoverage(into, raw, registry, unescapeLiteral(quote)));
  return into;
}

export function countCoverage(source: string, format: "json" | "ts", registry: SpellRegistry): Coverage {
  return format === "ts" ? countTypeScriptCoverage(source, registry) : countJsonCoverage(JSON.parse(source), registry);
}

export function buildSpellAnchorHref(engName: string, edition: Edition): string {
  return buildSpellHref({ spellKey: buildSpellSlug(engName), ruleset: edition });
}

type WrapOptions = {
  edition: Edition;
  quote?: string;
  unescape?: (s: string) => string;
  /// Загортати й неоднозначні назви (П5). Без цього вони йдуть у звіт — правило KR25.3.
  linkAmbiguous?: boolean;
  /// Назви, які в цьому носії заклинанням не є, — переглянуті винятки з `not-a-spell.json`.
  keepAsText?: ReadonlySet<string>;
};

function isAmbiguousLeftAsText(mention: Mention, options: WrapOptions): boolean {
  if (!mention.ambiguous) return false;
  return !options.linkAmbiguous || (options.keepAsText?.has(mention.engName) ?? false);
}

function escapeForLiteral(anchor: string, quote: string | undefined): string {
  return quote === '"' ? anchor.replace(/"/g, '\\"') : anchor;
}

export function linkMentionsInText(text: string, registry: SpellRegistry, options: WrapOptions): { text: string; report: LinkReport } {
  const mentions = findMentions(text, registry, options.unescape);
  const report: LinkReport = { mentions: mentions.length, linked: 0, wrapped: 0, ambiguous: 0, markdownLinks: 0, inflected: [] };
  let output = text;

  for (const mention of [...mentions].reverse()) {
    if (mention.linked) { report.linked += 1; continue; }
    if (mention.markdownLink) { report.markdownLinks += 1; continue; }
    if (isAmbiguousLeftAsText(mention, options)) { report.ambiguous += 1; continue; }
    if (mention.ukrainianStart === null) { report.inflected.push({ engName: mention.engName, before: mention.before }); continue; }

    const label = output.slice(mention.ukrainianStart, mention.end);
    const open = escapeForLiteral(`<a href="${buildSpellAnchorHref(mention.engName, options.edition)}">`, options.quote);
    output = output.slice(0, mention.ukrainianStart) + open + label + "</a>" + output.slice(mention.end);
    report.wrapped += 1;
  }
  return { text: output, report };
}

function mergeReports(into: LinkReport, from: LinkReport): void {
  into.mentions += from.mentions;
  into.linked += from.linked;
  into.wrapped += from.wrapped;
  into.ambiguous += from.ambiguous;
  into.markdownLinks += from.markdownLinks;
  into.inflected.push(...from.inflected);
}

function emptyReport(): LinkReport {
  return { mentions: 0, linked: 0, wrapped: 0, ambiguous: 0, markdownLinks: 0, inflected: [] };
}

type StringEdit = { original: string; linked: string };

export type AmbiguityOptions = Pick<WrapOptions, "linkAmbiguous" | "keepAsText">;

export function linkMentionsInJson(value: unknown, registry: SpellRegistry, edition: Edition, report = emptyReport(), edits: StringEdit[] = [], key = "", ambiguity: AmbiguityOptions = {}): unknown {
  if (typeof value === "string") {
    if (IDENTITY_KEYS.has(key)) return value;
    const linked = linkMentionsInText(value, registry, { edition, ...ambiguity });
    mergeReports(report, linked.report);
    if (linked.text !== value) edits.push({ original: value, linked: linked.text });
    return linked.text;
  }
  if (Array.isArray(value)) return value.map((item) => linkMentionsInJson(item, registry, edition, report, edits, key, ambiguity));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, linkMentionsInJson(v, registry, edition, report, edits, k, ambiguity)])
    );
  }
  return value;
}

/// Формат файлу повертається йому ж: змінені рядки підставляються в текст файлу в їхньому
/// JSON-екранованому вигляді, решта байтів не чіпається. Якщо після підстановки файл не
/// розбирається в очікуване значення, він не пишеться, а називається у звіті (як у KR30.2).
export function applyJsonStringEdits(source: string, edits: StringEdit[], expected: unknown): string | null {
  let text = source;
  for (const edit of edits) {
    const escapedOriginal = JSON.stringify(edit.original).slice(1, -1);
    if (!text.includes(escapedOriginal)) return null;
    text = text.split(escapedOriginal).join(JSON.stringify(edit.linked).slice(1, -1));
  }
  try {
    return JSON.stringify(JSON.parse(text)) === JSON.stringify(expected) ? text : null;
  } catch {
    return null;
  }
}

function isIdentityLiteral(node: ts.Node): boolean {
  const parent = node.parent;
  return ts.isPropertyAssignment(parent) && parent.initializer === node && IDENTITY_KEYS.has(parent.name.getText());
}

function unescapeLiteral(quote: string) {
  return (text: string) => (quote === "`" || quote === "}" ? text : text.replace(/\\(['"\\])/g, "$1"));
}

/// Сіди 2014 тримають описи в рядкових літералах трьох видів; якір іде в текст літерала з
/// екрануванням під його лапки, а решта файлу не змінюється жодним байтом.
function forEachProseLiteral(source: string, onLiteral: (raw: string, quote: string, start: number, end: number) => void): void {
  const file = ts.createSourceFile("carrier.ts", source, ts.ScriptTarget.Latest, true);
  const visit = (node: ts.Node) => {
    const isLiteral =
      ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node);
    if (isLiteral && !isIdentityLiteral(node)) {
      const start = node.getStart(file);
      const raw = source.slice(start, node.getEnd());
      onLiteral(raw, raw[0], start, node.getEnd());
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}

export function linkMentionsInTypeScript(source: string, registry: SpellRegistry, edition: Edition, ambiguity: AmbiguityOptions = {}): { text: string; report: LinkReport } {
  const report = emptyReport();
  const edits: { start: number; end: number; text: string }[] = [];

  forEachProseLiteral(source, (raw, quote, start, end) => {
    const linked = linkMentionsInText(raw, registry, { edition, quote, unescape: unescapeLiteral(quote), ...ambiguity });
    mergeReports(report, linked.report);
    if (linked.text !== raw) edits.push({ start, end, text: linked.text });
  });

  let text = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
  return { text, report };
}

export function listCarriers(root = process.cwd()): Carrier[] {
  const carriers: Carrier[] = [];
  for (const { directory, edition, format } of SOURCE_DIRECTORIES) {
    const dir = join(root, directory);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir).sort()) {
      const path = join(dir, entry);
      if (!statSync(path).isFile() || !entry.endsWith(`.${format}`)) continue;
      carriers.push({ path: `${directory}/${entry}`, edition: /2024/.test(entry) ? "RULES_2024" : edition, format });
    }
  }
  return [...carriers, ...SOURCE_FILES];
}

export function linkCarrier(carrier: Carrier, registry: SpellRegistry, root = process.cwd(), write = false, linkAmbiguous = false): CarrierReport {
  const source = readFileSync(join(root, carrier.path), "utf-8");
  const ambiguity: AmbiguityOptions = {
    linkAmbiguous,
    keepAsText: new Set(Object.keys(readNotASpellFile(root)[carrier.path] ?? {})),
  };
  let next: string;
  let report: LinkReport;
  let unwritable: string | undefined;

  if (carrier.format === "ts") {
    ({ text: next, report } = linkMentionsInTypeScript(source, registry, carrier.edition, ambiguity));
  } else {
    report = emptyReport();
    const edits: StringEdit[] = [];
    const linkedValue = linkMentionsInJson(JSON.parse(source), registry, carrier.edition, report, edits, "", ambiguity);
    const applied = edits.length ? applyJsonStringEdits(source, edits, linkedValue) : source;
    next = applied ?? source;
    if (applied === null) unwritable = "підстановка змінених рядків не відтворює файл";
  }

  const changed = next !== source;
  if (write && changed && !unwritable) writeFileSync(join(root, carrier.path), next, "utf-8");
  return { ...report, path: carrier.path, edition: carrier.edition, format: carrier.format, written: write && changed && !unwritable, unwritable };
}

export type CoverageRow = { path: string; mentions: number; linked: number };

export function measureCarriers(registry: SpellRegistry, root = process.cwd()): CoverageRow[] {
  return listCarriers(root).map((carrier) => ({
    path: carrier.path,
    ...countCoverage(readFileSync(join(root, carrier.path), "utf-8"), carrier.format, registry),
  }));
}

export function measureSurfaces(registry: SpellRegistry, root = process.cwd()): CoverageRow[] {
  return SURFACES.filter((path) => existsSync(join(root, path))).map((path) => ({
    path,
    ...countCoverage(readFileSync(join(root, path), "utf-8"), "json", registry),
  }));
}

export function formatCoverageTable(rows: CoverageRow[]): string {
  const total = rows.reduce((acc, row) => ({ mentions: acc.mentions + row.mentions, linked: acc.linked + row.linked }), { mentions: 0, linked: 0 });
  const line = (label: string, row: Coverage) =>
    `${label.padEnd(62)} ${String(row.mentions).padStart(6)} ${String(row.linked).padStart(6)} ${row.mentions ? `${Math.round((100 * row.linked) / row.mentions)} %`.padStart(6) : "     —"}`;
  const header = `${"файл".padEnd(62)} ${"згадок".padStart(6)} ${"звʼяз.".padStart(6)}`;
  return [header, ...rows.filter((row) => row.mentions > 0).map((row) => line(row.path, row)), line("разом", total)].join("\n");
}
