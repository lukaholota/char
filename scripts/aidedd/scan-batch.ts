import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { AIDEDD_DIR, findCatalog, findRawDir } from "./aidedd-catalogs";
import { CreatureEdition, ParsedCreature, StatblockEntry } from "./creature-schema";
import { parseMonster2014 } from "./parse-monster-2014";
import { parseMonster2024 } from "./parse-monster-2024";
import {
  CreatureTranslation,
  TranslatedFields,
  buildCreatureRecord,
  findSourceKey2014,
} from "./build-creature-record";
import { readTranslationBatches as readTranslationBatches2014 } from "./import-creatures-2014";
import { readTranslationBatches as readTranslationBatches2024 } from "./import-creatures-2024";
import { fetchTextPolitely, pause, DEFAULT_PAUSE_MS } from "../lib/polite-http";
import creatures2014 from "../../src/lib/generated/creatures.json";
import creatures2024 from "../../src/lib/generated/creatures2024.json";
import spells from "../../src/lib/generated/spells.json";
import dictionaryFile from "../../src/lib/refs/dictionary.json";
import { buildCanonicalSuffix, cutSuffix } from "./ratify-glossary";

const RATIFIED_FEATURES: Record<string, string> = dictionaryFile.DND_DICTIONARY.statblockFeatures;
const MANIFEST_PATH = join(AIDEDD_DIR, "import-manifest.json");
const BRIEFINGS_DIR = join(AIDEDD_DIR, "briefings");
const OVERRIDABLE_FIELDS = [
  "ac",
  "hp",
  "speed",
  "skills",
  "senses",
  "languages",
  "gear",
  "conditionImmunity",
  "damageResistance",
  "damageVulnerability",
  "damageImmunity",
] as const;

type OverridableField = (typeof OVERRIDABLE_FIELDS)[number];

type ManifestRow = {
  nameEng: string;
  slug: string;
  edition: CreatureEdition;
  status: string;
  creatureId: number;
  batch: number;
};

type FieldGap = { field: OverridableField; english: string; reason: string };
type BlockingGap = { kind: "dictionary" | "source" | "statblock"; message: string };
type NameGlossary = {
  english: string;
  ratified: string;
  canonicalSuffix: string;
  known: Array<{ ukrainian: string; uses: number }>;
};
type SpellListGap = { entry: string; lines: string[]; spells: Array<{ english: string; ukrainian: string }> };

type CreatureBriefing = {
  slug: string;
  nameEng: string;
  creatureId: number;
  reusesCatalogueId: boolean;
  challenge: string;
  source: string;
  isStatblockEmpty: boolean;
  liveCheck?: "порожній і на живому сайті" | "на живому сайті НЕ порожній";
  fieldGaps: FieldGap[];
  blockingGaps: BlockingGap[];
  nameCandidates: string[];
  featureNames: NameGlossary[];
  spellListGaps: SpellListGap[];
};

type Briefing = {
  edition: CreatureEdition;
  batch: number;
  rows: number;
  deferCandidates: string[];
  blockCandidates: string[];
  translatable: number;
  creatures: CreatureBriefing[];
};

async function scanBatch(): Promise<void> {
  const options = readOptions();
  const rows = findBatchRows(options.edition, options.batch);
  if (rows.length === 0) throw new Error(`У маніфесті немає рядків партії ${options.batch}`);

  const parsed = rows.map((row) => readParsedCreature(options.edition, row.slug));
  const glossary = buildFeatureGlossary(options.edition);
  const briefing = buildBriefing(options.edition, options.batch, rows, parsed, glossary);

  if (options.verifyEmpty) await verifyEmptyAgainstLiveSite(options.edition, briefing);

  writeBriefing(briefing, options.out);
  printSummary(briefing, options.out);
}

/// Партії одноразові: рядок, відкладений своєю партією, більше нікуди не потрапляє, навіть коли
/// причина відпала (відповідь у questions.md, нове значення enum). Добірка збирає такі рядки в
/// одну віртуальну партію — усе, що ще pending, але має непорожній статблок.
async function scanGleaning(): Promise<void> {
  const edition: CreatureEdition = readFlag("edition") === "2024" ? "RULES_2024" : "RULES_2014";
  const rows = findGleaningRows(edition);
  if (rows.length === 0) throw new Error(`Нічого добирати: ${edition} не має відкладених рядків із текстом`);

  const parsed = rows.map((row) => readParsedCreature(edition, row.slug));
  const glossary = buildFeatureGlossary(edition);
  const briefing = buildBriefing(edition, GLEANING_BATCH, rows, parsed, glossary);
  const out = readFlag("out") || join(BRIEFINGS_DIR, `${edition.toLowerCase()}-gleaning.json`);

  writeBriefing(briefing, out);
  printSummary(briefing, out);
}

function findGleaningRows(edition: CreatureEdition): ManifestRow[] {
  return readManifest()
    .filter((row) => row.edition === edition && row.status === "pending")
    .filter((row) => !isStatblockEmpty(readParsedCreature(edition, row.slug)));
}

function buildBriefing(
  edition: CreatureEdition,
  batch: number,
  rows: ManifestRow[],
  parsed: ParsedCreature[],
  glossary: Map<string, Map<string, number>>
): Briefing {
  const creatures = rows.map((row, index) =>
    buildCreatureBriefing(edition, row, parsed[index], glossary)
  );

  return {
    edition,
    batch,
    rows: rows.length,
    deferCandidates: creatures.filter((c) => c.isStatblockEmpty).map((c) => c.slug),
    blockCandidates: creatures
      .filter((c) => !c.isStatblockEmpty && c.blockingGaps.length > 0)
      .map((c) => c.slug),
    translatable: creatures.filter((c) => !c.isStatblockEmpty && c.blockingGaps.length === 0).length,
    creatures,
  };
}

function buildCreatureBriefing(
  edition: CreatureEdition,
  row: ManifestRow,
  parsed: ParsedCreature,
  glossary: Map<string, Map<string, number>>
): CreatureBriefing {
  const probe = probeConverter(parsed);

  return {
    slug: row.slug,
    nameEng: row.nameEng,
    creatureId: row.creatureId,
    reusesCatalogueId: findCatalogueName(edition, row.nameEng) !== "",
    challenge: parsed.challenge,
    source: parsed.source,
    isStatblockEmpty: isStatblockEmpty(parsed),
    fieldGaps: probe.fieldGaps,
    blockingGaps: probe.blockingGaps,
    nameCandidates: findNameCandidates(edition, row.nameEng),
    featureNames: collectFeatureNames(parsed, glossary),
    spellListGaps: findSpellListGaps(edition, parsed),
  };
}

/// Добірка не належить жодній партії маніфесту — 0 лишає її поза нумерацією 1..32.
const GLEANING_BATCH = 0;

function isStatblockEmpty(parsed: ParsedCreature): boolean {
  return (
    parsed.traits.length +
      parsed.actions.length +
      parsed.bonusActions.length +
      parsed.reactions.length +
      parsed.legendaryActions.length ===
    0
  );
}

/// Runs the real converter against a stub translation, feeding a placeholder into whichever field
/// it rejects and retrying, so one pass reports every gap instead of only the first. A build that
/// succeeds can still leak English (translateAc silently returns unmatched formats verbatim), so
/// the surviving record is scanned for Latin text as well.
function probeConverter(parsed: ParsedCreature): {
  fieldGaps: FieldGap[];
  blockingGaps: BlockingGap[];
} {
  const fieldGaps: FieldGap[] = [];
  const fields: TranslatedFields = {};

  for (let attempt = 0; attempt <= OVERRIDABLE_FIELDS.length; attempt += 1) {
    try {
      const record = buildCreatureRecord(parsed, buildStubTranslation(parsed, fields), 1);
      return { fieldGaps: [...fieldGaps, ...findLeakingFields(record, fields)], blockingGaps: [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const field = findRejectedField(parsed, message);
      if (!field) return { fieldGaps, blockingGaps: [classifyBlockingGap(message)] };

      fieldGaps.push({ field, english: parsed[field], reason: message });
      fields[field] = "«ПОТРІБЕН ПЕРЕКЛАД»";
    }
  }

  return { fieldGaps, blockingGaps: [] };
}

function buildStubTranslation(parsed: ParsedCreature, fields: TranslatedFields): CreatureTranslation {
  const copy = (entries: StatblockEntry[]): StatblockEntry[] =>
    entries.map((entry) => ({ name: entry.name, text: entry.text }));

  return {
    slug: parsed.slug,
    name: "СТАБ",
    description: "",
    traits: copy(parsed.traits),
    actions: copy(parsed.actions),
    bonusActions: copy(parsed.bonusActions),
    reactions: copy(parsed.reactions),
    legendaryActions: copy(parsed.legendaryActions),
    fields,
  };
}

const REJECTION_PATTERNS: Array<{ pattern: RegExp; field: OverridableField }> = [
  { pattern: /Опис КЗ поза словником/, field: "ac" },
  { pattern: /режим руху/, field: "speed" },
  { pattern: /навичка/, field: "skills" },
  { pattern: /чуття/, field: "senses" },
  { pattern: /мова/, field: "languages" },
  { pattern: /Спорядження поза словником/, field: "gear" },
  { pattern: /стан «/, field: "conditionImmunity" },
];

function findRejectedField(parsed: ParsedCreature, message: string): OverridableField | null {
  const matched = REJECTION_PATTERNS.find((entry) => entry.pattern.test(message));
  if (matched) return matched.field;
  if (/тип ушкоджень/.test(message)) return findDamageField(parsed, message);
  return null;
}

/// Three fields share the damage-type vocabulary, so the message alone cannot say which one
/// failed; the offending term is looked up in the parsed values instead.
function findDamageField(parsed: ParsedCreature, message: string): OverridableField | null {
  const term = readQuotedTerm(message);
  const candidates: OverridableField[] = [
    "damageResistance",
    "damageImmunity",
    "damageVulnerability",
  ];
  return candidates.find((field) => parsed[field].includes(term)) ?? "damageResistance";
}

function classifyBlockingGap(message: string): BlockingGap {
  if (/Невідоме джерело/.test(message)) return { kind: "source", message };
  if (/поза затвердженим реєстром термінів/.test(message)) return { kind: "dictionary", message };
  return { kind: "statblock", message };
}

function readQuotedTerm(message: string): string {
  const match = /«([^»]*)»/.exec(message);
  return match ? match[1] : "";
}

function findLeakingFields(
  record: Record<string, unknown>,
  fields: TranslatedFields
): FieldGap[] {
  return OVERRIDABLE_FIELDS.filter((field) => fields[field] === undefined)
    .map((field) => ({ field, value: String(record[field] ?? "") }))
    .filter(({ value }) => /[A-Za-z]{2,}/.test(value.replace(/фт\./g, "")))
    .map(({ field, value }) => ({
      field,
      english: value,
      reason: "конвертер не впав, але лишив англійський текст",
    }));
}

/// Every English trait/action name already rendered in a shipped batch, with how often each
/// Ukrainian variant was used. Source and translation align by index because the converter
/// refuses any batch entry whose section lengths differ.
function buildFeatureGlossary(edition: CreatureEdition): Map<string, Map<string, number>> {
  const glossary = new Map<string, Map<string, number>>();
  const batches =
    edition === "RULES_2014" ? readTranslationBatches2014() : readTranslationBatches2024();

  for (const translation of batches) {
    const parsed = readParsedCreature(edition, translation.slug);
    for (const section of ["traits", "actions", "bonusActions", "reactions", "legendaryActions"] as const) {
      const source = parsed[section];
      const translated = translation[section] ?? [];
      for (let index = 0; index < Math.min(source.length, translated.length); index += 1) {
        const uses = glossary.get(source[index].name) ?? new Map<string, number>();
        uses.set(translated[index].name, (uses.get(translated[index].name) ?? 0) + 1);
        glossary.set(source[index].name, uses);
      }
    }
  }

  return glossary;
}

function collectFeatureNames(
  parsed: ParsedCreature,
  glossary: Map<string, Map<string, number>>
): NameGlossary[] {
  const names = [
    ...parsed.traits,
    ...parsed.actions,
    ...parsed.bonusActions,
    ...parsed.reactions,
    ...parsed.legendaryActions,
  ].map((entry) => entry.name);

  return names.map((english) => ({
    english,
    ratified: findRatifiedName(english),
    canonicalSuffix: buildCanonicalSuffix(cutSuffix(english).suffix) ?? "",
    known: [...(glossary.get(english) ?? new Map<string, number>()).entries()]
      .map(([ukrainian, uses]) => ({ ukrainian, uses }))
      .sort((left, right) => right.uses - left.uses),
  }));
}

/// The ratified table plus the rule-rendered usage limit: when this is filled in, the batch uses
/// it verbatim and does not weigh variants at all.
function findRatifiedName(english: string): string {
  const { base, suffix } = cutSuffix(english);
  const ratifiedBase = RATIFIED_FEATURES[base];
  if (!ratifiedBase) return "";
  const ratifiedSuffix = suffix === "" ? "" : buildCanonicalSuffix(suffix) ?? "";
  return ratifiedSuffix === "" ? ratifiedBase : `${ratifiedBase} (${ratifiedSuffix})`;
}

/// aidedd prints spell lists as bare `<br>` lines after the Spellcasting paragraph, so the parser
/// never sees them (KR12.3 journal, batches 2-11). They are recovered here from the raw page and
/// matched against the shipped spell catalogue by English name.
function findSpellListGaps(edition: CreatureEdition, parsed: ParsedCreature): SpellListGap[] {
  const html = readRawPage(edition, parsed.slug);
  const gaps: SpellListGap[] = [];

  for (const match of html.matchAll(/<p><strong><em>([^<]*?Spellcasting[^<]*?)<\/em><\/strong>[\s\S]*?<\/p>([\s\S]*?)(?=<p>|<div)/gi)) {
    const lines = match[2]
      .split(/<br\s*\/?>/i)
      .map((line) => line.trim())
      .filter((line) => line !== "");
    if (lines.length === 0) continue;

    gaps.push({
      entry: match[1].replace(/\.$/, ""),
      lines: lines.map((line) => line.replace(/<[^>]*>/g, "").trim()),
      spells: findSpellNames(lines),
    });
  }

  return gaps;
}

function findSpellNames(lines: string[]): Array<{ english: string; ukrainian: string }> {
  const byEnglish = new Map(
    spells.map((spell) => [spell.engName.trim().toLowerCase(), spell.name])
  );

  const names = lines.flatMap((line) =>
    [...line.matchAll(/<a[^>]*>([^<]+)<\/a>|<em>([^<]+)<\/em>/gi)].flatMap((match) =>
      (match[1] ?? match[2]).split(",")
    )
  );

  return names
    .map((name) => name.trim())
    .filter((name) => name !== "")
    .map((english) => ({
      english,
      ukrainian: byEnglish.get(english.toLowerCase()) ?? "— НЕМАЄ У spells.json —",
    }));
}

/// Ukrainian names already decided for this creature or its family, in both catalogues: the
/// legacy 2014 entry keeps its name on reimport, and a 2024 entry of the same name is the
/// standing precedent for a fresh one (Р12 keeps the records separate, not the vocabulary).
function findNameCandidates(edition: CreatureEdition, nameEng: string): string[] {
  const own = findCatalogueName(edition, nameEng);
  const other = findCatalogueName(edition === "RULES_2014" ? "RULES_2024" : "RULES_2014", nameEng);
  const firstWord = nameEng.split(/\s+/)[0];

  const family = [...readCatalogue("RULES_2014"), ...readCatalogue("RULES_2024")]
    .filter((creature) => creature.nameEng !== nameEng && creature.nameEng.startsWith(firstWord))
    .map((creature) => `${creature.nameEng} → ${creature.name}`);

  return [
    ...(own === "" ? [] : [`успадкований запис: ${own}`]),
    ...(other === "" ? [] : [`інша редакція: ${other}`]),
    ...family.slice(0, 6),
  ];
}

type CataloguedCreature = { nameEng: string; name: string; creatureId: number };

function readCatalogue(edition: CreatureEdition): CataloguedCreature[] {
  return (edition === "RULES_2014" ? creatures2014 : creatures2024) as CataloguedCreature[];
}

function findCatalogueName(edition: CreatureEdition, nameEng: string): string {
  return readCatalogue(edition).find((creature) => creature.nameEng === nameEng)?.name ?? "";
}

async function verifyEmptyAgainstLiveSite(edition: CreatureEdition, briefing: Briefing): Promise<void> {
  const catalog = findCatalog(edition === "RULES_2014" ? "monsters-2014" : "monsters-2024");

  for (const creature of briefing.creatures.filter((entry) => entry.isStatblockEmpty)) {
    const html = await fetchTextPolitely(catalog.buildPageUrl(creature.slug));
    const live = readParser(edition)(html, creature.slug);
    creature.liveCheck = isStatblockEmpty(live)
      ? "порожній і на живому сайті"
      : "на живому сайті НЕ порожній";
    await pause(DEFAULT_PAUSE_MS);
  }
}

function findBatchRows(edition: CreatureEdition, batch: number): ManifestRow[] {
  return readManifest().filter((row) => row.edition === edition && row.batch === batch);
}

/// The first batch nobody has worked on yet — not the first batch holding a pending row, because
/// every finished batch keeps its deferred rows pending forever.
function findFirstPendingBatch(edition: CreatureEdition): number {
  const touched = new Set(
    readManifest()
      .filter((row) => row.edition === edition && row.status !== "pending")
      .map((row) => row.batch)
  );
  const untouched = readManifest()
    .filter((row) => row.edition === edition && row.batch !== 0 && !touched.has(row.batch))
    .map((row) => row.batch);

  if (untouched.length === 0) throw new Error(`Усі партії ${edition} вже розібрані`);
  return Math.min(...untouched);
}

let manifestCache: ManifestRow[] | null = null;

function readManifest(): ManifestRow[] {
  if (manifestCache) return manifestCache;
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`Немає ${MANIFEST_PATH} — спершу bun run scripts/aidedd/build-import-manifest.ts`);
  }
  manifestCache = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as ManifestRow[];
  return manifestCache;
}

function readParser(edition: CreatureEdition) {
  return edition === "RULES_2014" ? parseMonster2014 : parseMonster2024;
}

function readRawPage(edition: CreatureEdition, slug: string): string {
  const dir = findRawDir(edition === "RULES_2014" ? "monsters-2014" : "monsters-2024");
  const path = join(dir, `${slug}.html`);
  if (!existsSync(path)) {
    throw new Error(`Немає кешованої сторінки ${path} — запусти fetch-pages.ts --only=${slug}`);
  }
  return readFileSync(path, "utf-8");
}

function readParsedCreature(edition: CreatureEdition, slug: string): ParsedCreature {
  return readParser(edition)(readRawPage(edition, slug), slug);
}

function writeBriefing(briefing: Briefing, out: string): void {
  mkdirSync(BRIEFINGS_DIR, { recursive: true });
  writeFileSync(out, `${JSON.stringify(briefing, null, 2)}\n`, "utf-8");
}

function printSummary(briefing: Briefing, out: string): void {
  const label = briefing.batch === GLEANING_BATCH ? "Добірка" : `Партія ${briefing.batch}`;
  console.log(`${label} (${briefing.edition}): ${briefing.rows} рядків`);
  console.log(`  перекладати: ${briefing.translatable}`);
  console.log(`  порожній статблок (дефект джерела): ${briefing.deferCandidates.length} — ${briefing.deferCandidates.join(", ") || "немає"}`);
  console.log(`  блокування поза дефектом: ${briefing.blockCandidates.length} — ${briefing.blockCandidates.join(", ") || "немає"}`);

  for (const creature of briefing.creatures) {
    const notes = [
      ...creature.fieldGaps.map((gap) => `fields.${gap.field}`),
      ...creature.blockingGaps.map((gap) => `${gap.kind}: ${gap.message}`),
      ...(creature.spellListGaps.length > 0 ? [`список заклинань × ${creature.spellListGaps.length}`] : []),
      ...(creature.featureNames.some((name) => name.known.length > 1) ? ["дрейф назв рис"] : []),
    ];
    if (notes.length > 0) console.log(`  · ${creature.slug}: ${notes.join(" | ")}`);
  }

  console.log(`\nБрифінг: ${out}`);
}

/// The whole corpus at once, so terminology gates are answered in one sitting instead of one
/// interruption per batch: every cached page is pushed through the real converter and whatever it
/// refuses is grouped by cause.
function printCorpusAudit(edition: CreatureEdition): void {
  const dir = findRawDir(edition === "RULES_2014" ? "monsters-2014" : "monsters-2024");
  const parse = readParser(edition);
  const creatures = readdirSync(dir)
    .filter((file) => file.endsWith(".html"))
    .map((file) => parse(readFileSync(join(dir, file), "utf-8"), file.replace(/\.html$/, "")));

  const filled = creatures.filter((creature) => !isStatblockEmpty(creature));
  console.log(`${creatures.length} сторінок ${edition}: ${filled.length} з текстом, ${creatures.length - filled.length} порожніх (дефект джерела)`);

  const probes = filled.map((creature) => ({ creature, ...probeConverter(creature) }));
  printSourceStrings(probes);
  printBlockingGaps(probes);
  printFieldGapTotals(probes);
}

type Probe = { creature: ParsedCreature; fieldGaps: FieldGap[]; blockingGaps: BlockingGap[] };

function printSourceStrings(probes: Probe[]): void {
  const bySource = groupBy(probes, (probe) => probe.creature.source);
  const unresolved = new Set([...bySource.keys()].filter((source) => !isSourceKnown(source)));
  console.log(`\nРядки джерела — ${bySource.size} різних, ✖ = findSourceKey2014 не знає:`);
  for (const [source, entries] of sortByCount(bySource)) {
    const mark = unresolved.has(source) ? "✖" : " ";
    const example = entries[0].creature.slug;
    console.log(`  ${mark} ${String(entries.length).padStart(4)}  «${source}»  напр. ${example}`);
  }
}

/// Asked directly, not inferred from a failed build: the converter resolves alignment before
/// source, so a creature blocked on vocabulary never reaches the source check and would look fine.
function isSourceKnown(source: string): boolean {
  try {
    findSourceKey2014(source);
    return true;
  } catch {
    return false;
  }
}

function printBlockingGaps(probes: Probe[]): void {
  const gaps = probes.flatMap((probe) =>
    probe.blockingGaps.map((gap) => ({ gap, slug: probe.creature.slug }))
  );
  const byMessage = groupBy(gaps, (entry) => `${entry.gap.kind}: ${entry.gap.message}`);

  console.log(`\nБлокування конвертера — ${byMessage.size} різних, ${gaps.length} записів:`);
  for (const [message, entries] of sortByCount(byMessage)) {
    console.log(`  ${String(entries.length).padStart(4)}  ${message}`);
    console.log(`        напр. ${entries.slice(0, 4).map((entry) => entry.slug).join(", ")}`);
  }
}

function printFieldGapTotals(probes: Probe[]): void {
  const gaps = probes.flatMap((probe) => probe.fieldGaps);
  const byField = groupBy(gaps, (gap) => gap.field);

  console.log(`\nПоля, що потребують fields-обходу — ${gaps.length} на весь корпус:`);
  for (const [field, entries] of sortByCount(byField)) {
    console.log(`  ${String(entries.length).padStart(4)}  ${field}`);
  }
}

function groupBy<T>(items: T[], readKey: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = readKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function sortByCount<T>(groups: Map<string, T[]>): Array<[string, T[]]> {
  return [...groups.entries()].sort((left, right) => right[1].length - left[1].length);
}

function printGlossaryDrift(edition: CreatureEdition): void {
  const drifting = [...buildFeatureGlossary(edition).entries()]
    .filter(([, uses]) => uses.size > 1)
    .map(([english, uses]) => ({
      english,
      variants: [...uses.entries()].sort((left, right) => right[1] - left[1]),
    }))
    .sort((left, right) => sumUses(right.variants) - sumUses(left.variants));

  console.log(`Назви з кількома варіантами перекладу (${edition}): ${drifting.length}`);
  for (const entry of drifting) {
    const variants = entry.variants.map(([name, uses]) => `${name} (${uses})`).join(" | ");
    console.log(`  ${entry.english} → ${variants}`);
  }
}

function sumUses(variants: Array<[string, number]>): number {
  return variants.reduce((total, [, uses]) => total + uses, 0);
}

type Options = {
  edition: CreatureEdition;
  batch: number;
  verifyEmpty: boolean;
  out: string;
};

function readOptions(): Options {
  const edition: CreatureEdition = readFlag("edition") === "2024" ? "RULES_2024" : "RULES_2014";
  const batchFlag = readFlag("batch");
  const batch = batchFlag === "" ? findFirstPendingBatch(edition) : Number(batchFlag);
  if (!Number.isInteger(batch) || batch <= 0) throw new Error(`Хибний номер партії: «${batchFlag}»`);

  return {
    edition,
    batch,
    verifyEmpty: process.argv.includes("--verify-empty"),
    out: readFlag("out") || join(BRIEFINGS_DIR, `${edition.toLowerCase()}-batch-${batch}.json`),
  };
}

function readFlag(name: string): string {
  const found = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : "";
}

const auditEdition: CreatureEdition = readFlag("edition") === "2024" ? "RULES_2024" : "RULES_2014";

if (process.argv.includes("--glossary")) {
  printGlossaryDrift(auditEdition);
} else if (process.argv.includes("--audit")) {
  printCorpusAudit(auditEdition);
} else if (process.argv.includes("--gleaning")) {
  await scanGleaning();
} else {
  await scanBatch();
}
