import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { applyJsonStringEdits, escapeForLiteral, type Edition } from "../spell-links/spell-mentions";
import { findRuleTermHref } from "../../src/lib/term-link";
import { collectProseParts, mapLiteralOffsets, readQuote, type ProsePart } from "./typescript-prose";

/// Посилання на стан чи дію в описі (KR34.3). Зачіпки `[EngName]` біля стану немає, тож
/// звʼязується по формі слова — але лише по формах із переглянутого словника
/// `data/rule-term-links/forms.json`, з обмеженнями, знятими з корпусу: «перевагу» лише перед
/// «на», «отруєний» — не перед «предмет». Стемінгу немає. Одне посилання на термін в описі —
/// абзац із пʼятьма підкресленими «бонусна дія» читається гірше. Правиться джерело
/// ([Р33](../../docs/DECISIONS.md#р33)).

/// `statblock` — масив істот, де проза лежить у `description` і в `text` кожної здібності, а
/// посилання на термін ставиться раз на всю істоту: у п'яти діях вовка «перевага» підкреслена одна.
export type RuleTermCarrier = { path: string; edition: Edition; format: "json" | "ts"; kind?: "prose" | "statblock" };

/// Те, що читають за столом: заклинання, риси, предмети. Довідника тут немає — стан посилався б
/// сам на себе. Предмети 2014 правляться в робочій зоні перекладу (aidedd, 5etools) і в
/// `baseline.json`: сід-партії `prisma/seed/magic-items/batch-*.json` з них перезбираються.
export const RULE_TERM_CARRIERS: ReadonlyArray<RuleTermCarrier> = [
  { path: "data/2024/normalized/spells.json", edition: "RULES_2024", format: "json" },
  { path: "data/2024/normalized/classes.json", edition: "RULES_2024", format: "json" },
  { path: "data/2024/normalized/subclasses.json", edition: "RULES_2024", format: "json" },
  { path: "data/2024/normalized/species.json", edition: "RULES_2024", format: "json" },
  { path: "prisma/seed/speciesChoices2024.ts", edition: "RULES_2024", format: "ts" },
  { path: "data/2024/normalized/subclass-choices.json", edition: "RULES_2024", format: "json" },
  { path: "data/2024/normalized/feats.json", edition: "RULES_2024", format: "json" },
  { path: "data/2024/normalized/invocations.json", edition: "RULES_2024", format: "json" },
  { path: "data/2024/normalized/metamagic.json", edition: "RULES_2024", format: "json" },
  { path: "data/2024/normalized/magic-items.json", edition: "RULES_2024", format: "json" },
  { path: "data/2014/spells.json", edition: "RULES_2014", format: "json" },
  { path: "data/2014/bestiary-lore/groups.json", edition: "RULES_2014", format: "json" },
  { path: "data/2024/bestiary-lore/groups.json", edition: "RULES_2024", format: "json" },
  { path: "data/aidedd/magic-items-2014.json", edition: "RULES_2014", format: "json" },
  { path: "prisma/seed/magic-items/baseline.json", edition: "RULES_2014", format: "json" },
  { path: "data/5etools/translations/magic-items-2014/batch-11.json", edition: "RULES_2014", format: "json" },
  { path: "data/5etools/translations/magic-items-2014/batch-12.json", edition: "RULES_2014", format: "json" },
  { path: "data/5etools/translations/magic-items-2014/batch-13.json", edition: "RULES_2014", format: "json" },
  { path: "data/5etools/translations/magic-items-2014/batch-14.json", edition: "RULES_2014", format: "json" },
  { path: "data/5etools/translations/magic-items-2014/batch-15.json", edition: "RULES_2014", format: "json" },
  { path: "data/5etools/translations/magic-items-2014/batch-16.json", edition: "RULES_2014", format: "json" },
  { path: "data/5etools/translations/magic-items-2014/batch-17.json", edition: "RULES_2014", format: "json" },
  { path: "data/5etools/translations/magic-items-2014/batch-18.json", edition: "RULES_2014", format: "json" },
  { path: "prisma/seed/classFeatureSeed.ts", edition: "RULES_2014", format: "ts" },
  { path: "prisma/seed/subclassFeatureSeed.ts", edition: "RULES_2014", format: "ts" },
  { path: "prisma/seed/raceFeatureSeed.ts", edition: "RULES_2014", format: "ts" },
  { path: "prisma/seed/subraceFeatureSeed.ts", edition: "RULES_2014", format: "ts" },
  { path: "prisma/seed/featSeed.ts", edition: "RULES_2014", format: "ts" },
  { path: "prisma/seed/infusionFeaturesSeed.ts", edition: "RULES_2014", format: "ts" },
  { path: "prisma/seed/backgroundSeed.ts", edition: "RULES_2014", format: "ts" },
  { path: "prisma/seed/raceChoiceOptionSeed.ts", edition: "RULES_2014", format: "ts" },
  ...listBastionCarriers(),
  ...listStatblockCarriers(),
];

function listBastionCarriers(): RuleTermCarrier[] {
  const directory = "data/2024/bastions-uk";
  return readdirSync(directory)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file): RuleTermCarrier => ({ path: `${directory}/${file}`, edition: "RULES_2024", format: "json" }));
}

/// Бестіарій (KR34.7): партії перекладу, з яких `build-creatures-2014.ts` і `-2024.ts` збирають
/// каталоги. Каталог `src/lib/generated/creatures*.json` не правиться — його перезбирають.
function listStatblockCarriers(): RuleTermCarrier[] {
  const directories = [
    ["data/aidedd/translations/monsters-2014", "RULES_2014"],
    ["data/5etools/translations/monsters-2014", "RULES_2014"],
    ["data/aidedd/translations/monsters-2024", "RULES_2024"],
    ["data/5etools/translations/monsters-2024", "RULES_2024"],
  ] as const;
  return directories.flatMap(([directory, edition]) =>
    readdirSync(directory)
      .filter((file) => file.endsWith(".json"))
      .sort()
      .map((file): RuleTermCarrier => ({ path: `${directory}/${file}`, edition, format: "json", kind: "statblock" }))
  );
}

/// Лише проза. Механічні поля заклинання («Концентрація, до 1 хвилини», «1 бонусна дія») і
/// короткі описи малюються звичайним текстом — сирий `<a>` там був би видно.
const PROSE_KEY = "description";
const STATBLOCK_PROSE_KEYS = new Set([PROSE_KEY, "text"]);

const FORMS_PATH = "data/rule-term-links/forms.json";
const EXCEPTIONS_PATH = "data/rule-term-links/not-a-rule-term.json";

type FormRule = {
  forms: string[];
  followedBy?: string;
  notFollowedBy?: string;
  precededBy?: string;
  notPrecededBy?: string;
  skipNear?: string;
};
export type TermForms = Record<string, FormRule[]>;

/// Переглянуті винятки: `{ "<носій>": { "<фрагмент тексту зі згадкою>": "причина" } }`.
export type RuleTermExceptions = Record<string, Record<string, string>>;

export type RuleTermMention = { original: string; start: number; end: number; label: string };
export type WrappedMention = { original: string; label: string; context: string };
export type RuleTermCarrierReport = { path: string; wrapped: WrappedMention[]; written: boolean; unwritable?: string };

const LETTER_OR_JOINER = "[\\p{L}ʼ'’-]";
const LOOKAROUND_CHARS = 60;

/// Розмітка, куди посилання ставити не можна: чужий якір, тег, маркер оригіналу, `[EngName]`,
/// жирна назва риси й заголовок.
const PROTECTED_REGIONS = [
  /<a\b[^>]*>[\s\S]*?<\/a>/g,
  /<[^>]+>/g,
  /\{\{[^}]*\}\}/g,
  /\[[^\]\n]*\]/g,
  /\*\*[^*\n]+\*\*/g,
  /<(b|strong)>[^<]*<\/\1>/g,
  /^#+ .*$/gm,
];

export function readTermForms(root = process.cwd()): TermForms {
  return JSON.parse(readFileSync(join(root, FORMS_PATH), "utf-8")) as TermForms;
}

export function readRuleTermExceptions(root = process.cwd()): RuleTermExceptions {
  const path = join(root, EXCEPTIONS_PATH);
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf-8")) as RuleTermExceptions) : {};
}

export function findRuleTermMentions(
  text: string,
  edition: Edition,
  forms: TermForms,
  keepAsText: ReadonlyArray<string> = [],
  linkedElsewhere: ReadonlySet<string> = new Set()
): RuleTermMention[] {
  const protectedRanges = collectProtectedRanges(text, keepAsText);
  const firstPerTerm = Object.entries(forms).flatMap(([original, rules]) => {
    const href = findRuleTermHref(original, edition);
    if (!href || linkedElsewhere.has(original) || isAlreadyLinked(text, href)) return [];
    const first = findFirstEligibleMention(text, original, rules, protectedRanges);
    return first ? [first] : [];
  });
  return dropOverlapping(firstPerTerm);
}

export function linkRuleTermsInText(
  text: string,
  edition: Edition,
  forms: TermForms,
  options: { quote?: string; keepAsText?: ReadonlyArray<string>; linkedElsewhere?: ReadonlySet<string> } = {}
): { text: string; wrapped: RuleTermMention[] } {
  const mentions = findRuleTermMentions(text, edition, forms, options.keepAsText, options.linkedElsewhere);
  let output = text;
  for (const mention of [...mentions].reverse()) {
    const open = escapeForLiteral(`<a href="${findRuleTermHref(mention.original, edition)}">`, options.quote);
    output = output.slice(0, mention.start) + open + mention.label + "</a>" + output.slice(mention.end);
  }
  return { text: output, wrapped: mentions };
}

export function linkRuleTermCarrier(
  carrier: RuleTermCarrier,
  forms: TermForms,
  exceptions: RuleTermExceptions,
  root = process.cwd(),
  write = false
): RuleTermCarrierReport {
  const source = readFileSync(join(root, carrier.path), "utf-8");
  const keepAsText = Object.keys(exceptions[carrier.path] ?? {});
  const { next, wrapped, unwritable } =
    carrier.format === "ts"
      ? linkTypeScriptCarrier(source, carrier.edition, forms, keepAsText)
      : linkJsonCarrier(source, carrier, forms, keepAsText);

  const written = write && next !== source && !unwritable;
  if (written) writeFileSync(join(root, carrier.path), next, "utf-8");
  return { path: carrier.path, wrapped, written, unwritable };
}

/// Виняток, що не збігається ні з одним описом носія, протух — його текст переписали.
export function findStaleExceptions(exceptions: RuleTermExceptions, root = process.cwd()): string[] {
  return Object.entries(exceptions).flatMap(([path, entries]) => {
    const source = existsSync(join(root, path)) ? readFileSync(join(root, path), "utf-8") : "";
    return Object.keys(entries)
      .filter((fragment) => !source.includes(fragment))
      .map((fragment) => `${path}: ${fragment}`);
  });
}

type LinkedSource = { next: string; wrapped: WrappedMention[]; unwritable?: string };

function linkJsonCarrier(source: string, carrier: RuleTermCarrier, forms: TermForms, keepAsText: ReadonlyArray<string>): LinkedSource {
  const { edition } = carrier;
  const isStatblock = carrier.kind === "statblock";
  const wrapped: WrappedMention[] = [];
  const edits: { original: string; linked: string }[] = [];

  const visit = (value: unknown, key: string, linkedInRecord: Set<string> | null): unknown => {
    if (typeof value === "string") {
      if (!(isStatblock ? STATBLOCK_PROSE_KEYS.has(key) : key === PROSE_KEY)) return value;
      const linked = linkRuleTermsInText(value, edition, forms, { keepAsText, linkedElsewhere: linkedInRecord ?? undefined });
      for (const mention of linked.wrapped) linkedInRecord?.add(mention.original);
      wrapped.push(...linked.wrapped.map((mention) => describeMention(value, mention)));
      if (linked.text !== value) edits.push({ original: value, linked: linked.text });
      return linked.text;
    }
    if (Array.isArray(value)) return value.map((item) => visit(item, key, linkedInRecord));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, visit(v, k, linkedInRecord)]));
    }
    return value;
  };

  const parsed: unknown = JSON.parse(source);
  const linkedValue =
    isStatblock && Array.isArray(parsed)
      ? parsed.map((record) => visit(record, "", collectLinkedOriginals(record, edition, forms)))
      : visit(parsed, "", null);
  if (edits.length === 0) return { next: source, wrapped };
  const canonical = rewriteCanonicalJson(source, parsed, linkedValue);
  if (canonical !== null) return { next: canonical, wrapped };
  const applied = applyJsonStringEdits(source, edits, linkedValue);
  return applied === null
    ? { next: source, wrapped, unwritable: "підстановка змінених рядків не відтворює файл" }
    : { next: applied, wrapped };
}

/// Посилання, що вже стоять у будь-якій прозі істоти: другий прогін не має ставити їх удруге в
/// іншій здібності.
function collectLinkedOriginals(record: unknown, edition: Edition, forms: TermForms): Set<string> {
  const prose = JSON.stringify(record);
  return new Set(
    Object.keys(forms).filter((original) => {
      const href = findRuleTermHref(original, edition);
      return href !== null && href !== undefined && prose.includes(JSON.stringify(`<a href="${href}">`).slice(1, -1));
    })
  );
}

/// Файл, записаний як `JSON.stringify(…, null, 2)`, перезбирається з уже звʼязаного значення.
/// Підстановка по рядку тут зачепила б і `shortDescription`, дослівно рівний опису, — а там сирий
/// `<a>` видно текстом.
function rewriteCanonicalJson(source: string, parsed: unknown, linkedValue: unknown): string | null {
  const trailing = source.endsWith("\n") ? "\n" : "";
  return `${JSON.stringify(parsed, null, 2)}${trailing}` === source ? `${JSON.stringify(linkedValue, null, 2)}${trailing}` : null;
}

function linkTypeScriptCarrier(source: string, edition: Edition, forms: TermForms, keepAsText: ReadonlyArray<string>): LinkedSource {
  const file = ts.createSourceFile("carrier.ts", source, ts.ScriptTarget.Latest, true);
  const wrapped: WrappedMention[] = [];
  const edits: Array<{ at: number; text: string }> = [];
  const seenLiterals = new Set<number>();
  const unplaced: string[] = [];

  for (const parts of collectDescriptionParts(file)) {
    const literals = parts.flatMap((part) => ("literal" in part ? [part.literal] : []));
    if (literals.some((literal) => seenLiterals.has(literal.getStart()))) continue;
    literals.forEach((literal) => seenLiterals.add(literal.getStart()));

    const text = parts.map((part) => ("literal" in part ? part.literal.text : part.gap ?? UNKNOWN_GAP)).join("");
    for (const mention of findRuleTermMentions(text, edition, forms, keepAsText)) {
      wrapped.push(describeMention(text, mention));
      const placed = placeMentionInSource(parts, mention, source);
      if (!placed) {
        unplaced.push(mention.label);
        continue;
      }
      const open = escapeForLiteral(`<a href="${findRuleTermHref(mention.original, edition)}">`, placed.quote);
      edits.push({ at: placed.start, text: open }, { at: placed.end, text: "</a>" });
    }
  }

  let next = source;
  for (const edit of edits.sort((a, b) => b.at - a.at)) next = next.slice(0, edit.at) + edit.text + next.slice(edit.at);
  const unwritable = unplaced.length > 0 ? `згадка на межі двох шматків коду — ${unplaced.join(", ")}; розбити інакше або внести у винятки` : undefined;
  return { next, wrapped, unwritable };
}

/// Замість невідомого `${…}` — не-літера, щоб слово з обох боків лишалося окремим словом.
const UNKNOWN_GAP = "…";

function collectDescriptionParts(file: ts.SourceFile): ProsePart[][] {
  const found: ProsePart[][] = [];
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node) && readPropertyName(node) === PROSE_KEY) {
      const parts = collectProseParts(node.initializer, file);
      if (parts) found.push(parts);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

function readPropertyName(property: ts.PropertyAssignment): string {
  return ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) ? property.name.text : property.name.getText();
}

/// Згадка, що перетинає межу двох шматків коду, лишається текстом: вставити один тег у два
/// літерали не можна.
function placeMentionInSource(parts: ProsePart[], mention: RuleTermMention, source: string): { start: number; end: number; quote: string } | null {
  let textAt = 0;
  for (const part of parts) {
    const length = "literal" in part ? part.literal.text.length : (part.gap ?? UNKNOWN_GAP).length;
    if ("literal" in part && mention.start >= textAt && mention.end <= textAt + length) {
      const offsets = mapLiteralOffsets(part.literal, source);
      if (!offsets) return null;
      return { start: offsets[mention.start - textAt], end: offsets[mention.end - textAt], quote: readQuote(part.literal, source) };
    }
    textAt += length;
  }
  return null;
}

function findFirstEligibleMention(
  text: string,
  original: string,
  rules: FormRule[],
  protectedRanges: Array<[number, number]>
): RuleTermMention | null {
  let first: RuleTermMention | null = null;
  for (const rule of rules) {
    for (const match of text.matchAll(buildFormsPattern(rule.forms))) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (first && start >= first.start) break;
      if (!isEligible(text, start, end, rule, protectedRanges)) continue;
      first = { original, start, end, label: match[0] };
      break;
    }
  }
  return first;
}

function isEligible(text: string, start: number, end: number, rule: FormRule, protectedRanges: Array<[number, number]>): boolean {
  const after = text.slice(end, end + LOOKAROUND_CHARS);
  const before = text.slice(Math.max(0, start - LOOKAROUND_CHARS), start);
  if (protectedRanges.some(([from, to]) => start < to && end > from)) return false;
  if (isPartOfNamedEntity(after)) return false;
  if (rule.followedBy && !testRule(rule.followedBy, after)) return false;
  if (rule.notFollowedBy && testRule(rule.notFollowedBy, after)) return false;
  if (rule.precededBy && !testRule(rule.precededBy, before)) return false;
  if (rule.notPrecededBy && testRule(rule.notPrecededBy, before)) return false;
  if (rule.skipNear && testRule(rule.skipNear, before + text.slice(start, end) + after)) return false;
  return true;
}

/// Форма, за якою одразу йде маркер оригіналу чи `[EngName]`, — частина назви: «Закривавлена{{Bloodied}}»
/// уже має свою підказку, «Промінь виснаження [Ray of Enfeeblement]» — заклинання, а не стан.
function isPartOfNamedEntity(after: string): boolean {
  return after.startsWith("{{") || /^\s*\[/.test(after);
}

function testRule(pattern: string, text: string): boolean {
  return new RegExp(pattern, "iu").test(text);
}

function buildFormsPattern(forms: string[]): RegExp {
  const alternatives = [...forms]
    .sort((a, b) => b.length - a.length)
    .map((form) => form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+"));
  return new RegExp(`(?<!${LETTER_OR_JOINER})(?:${alternatives.join("|")})(?!${LETTER_OR_JOINER})`, "giu");
}

function collectProtectedRanges(text: string, keepAsText: ReadonlyArray<string>): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const pattern of PROTECTED_REGIONS) {
    for (const match of text.matchAll(pattern)) ranges.push([match.index ?? 0, (match.index ?? 0) + match[0].length]);
  }
  for (const fragment of keepAsText) {
    for (let at = text.indexOf(fragment); at >= 0; at = text.indexOf(fragment, at + 1)) ranges.push([at, at + fragment.length]);
  }
  return ranges;
}

function isAlreadyLinked(text: string, href: string): boolean {
  return text.includes(`href="${href}"`) || text.includes(`href=\\"${href}\\"`);
}

function dropOverlapping(mentions: RuleTermMention[]): RuleTermMention[] {
  const kept: RuleTermMention[] = [];
  for (const mention of [...mentions].sort((a, b) => a.start - b.start)) {
    const previous = kept[kept.length - 1];
    if (!previous || mention.start >= previous.end) kept.push(mention);
  }
  return kept;
}

function describeMention(text: string, mention: RuleTermMention): WrappedMention {
  const context = text.slice(Math.max(0, mention.start - 50), mention.end + 30).replace(/\s+/g, " ");
  return { original: mention.original, label: mention.label, context };
}
