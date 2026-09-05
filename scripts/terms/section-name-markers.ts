import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import dictionary from "../../src/lib/refs/dictionary.json";
import { stripGlossaryMarkers } from "../../src/lib/refs/glossary-marker";
import { findRawDir } from "../aidedd/aidedd-catalogs";
import { ParsedCreature, StatblockEntry } from "../aidedd/creature-schema";
import { parseMonster2014 } from "../aidedd/parse-monster-2014";
import { parseMonster2024 } from "../aidedd/parse-monster-2024";
import { BatchRow, findPinnedStatblock, readBatchPlan } from "../5etools/creature-batches";
import { RulesEdition, SourceCreature, readCreatures } from "../5etools/schema";

/// Маркер оригіналу на кожній назві риси й дії — рішення власника 2026-09-02
/// ([Р20](../../docs/DECISIONS.md#р20), [O30](../../docs/o30-glossary-markers-sweep/)).
/// Оригінал береться з пінованого корпусу за індексом секції — тим самим, за яким конвеєр
/// зшиває переклад зі статблоком (`assertSectionsAlign`). Правиться лише файл партії
/// ([Р33](../../docs/DECISIONS.md#р33)); каталог — перезбором.
///
/// Запуск: `bunx tsx scripts/terms/section-name-markers.ts` — звіт без запису;
/// `--write` — дописує маркери у файли партій.

export const SECTION_KEYS = [
  "traits",
  "actions",
  "bonusActions",
  "reactions",
  "legendaryActions",
  "lairActions",
  "regionEffects",
  "mythicActions",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export type BatchCarrier = {
  directory: string;
  pipeline: "aidedd" | "5etools";
  edition: RulesEdition;
};

export const BATCH_CARRIERS: readonly BatchCarrier[] = [
  { directory: "data/aidedd/translations/monsters-2014", pipeline: "aidedd", edition: "RULES_2014" },
  { directory: "data/aidedd/translations/monsters-2024", pipeline: "aidedd", edition: "RULES_2024" },
  { directory: "data/5etools/translations/monsters-2014", pipeline: "5etools", edition: "RULES_2014" },
  { directory: "data/5etools/translations/monsters-2024", pipeline: "5etools", edition: "RULES_2024" },
];

export const CATALOGS = [
  { path: "src/lib/generated/creatures.json", edition: "RULES_2014" },
  { path: "src/lib/generated/creatures2024.json", edition: "RULES_2024" },
] as const;

export type SectionName = {
  file: string;
  slug: string;
  section: SectionKey;
  index: number;
  ukrainian: string;
  english: string;
  marked: boolean;
  bracketed: boolean;
  ratified: boolean;
};

type TranslationRecord = { slug: string; name: string } & Partial<Record<SectionKey, StatblockEntry[]>>;

const RATIFIED_FEATURES: Record<string, string> = dictionary.DND_DICTIONARY.statblockFeatures;
const RATIFIED_UKRAINIAN = new Set(Object.values(RATIFIED_FEATURES));

/// Дужковий хвіст назви — «(4/день)», «(перезарядка 5–6)», «(коштує 2 дії)». Маркер стоїть
/// перед ним: `Легендарний опір{{Legendary Resistance}} (4/день)`.
const PARENTHESIZED_TAIL = /(?:\s*\([^()]*\))+\s*$/;

export function splitNameTail(name: string): { head: string; tail: string } {
  const match = PARENTHESIZED_TAIL.exec(name);
  if (!match || match.index === 0) return { head: name, tail: "" };
  return { head: name.slice(0, match.index), tail: name.slice(match.index) };
}

export function hasMarkerOnName(name: string): boolean {
  const { head } = splitNameTail(name);
  return stripGlossaryMarkers(head) !== head;
}

/// Старіший запис оригіналу просто в назві — «Чарівний камінь [Magic Stone]». Дописати до нього
/// ще й `{{Magic Stone}}` означало б показати оригінал двічі, а зняти дужки — правка тексту, а
/// не суфікс. Такі назви скрипт не чіпає й називає окремо; формат — питання до власника.
const BRACKETED_ORIGINAL = /\[[A-Za-z][^\]]*\]/;

export function carriesBracketedOriginal(name: string): boolean {
  return BRACKETED_ORIGINAL.test(splitNameTail(name).head);
}

/// Оригінал без механічного хвоста, якщо український хвіст є — інакше хвіст залишається
/// частиною оригіналу («Spellcasting (Psionics)» → «Псіонічне чаротворення{{Spellcasting (Psionics)}}»).
export function buildMarkedName(ukrainian: string, english: string): string {
  const { head, tail } = splitNameTail(ukrainian);
  const original = tail === "" ? english.trim() : splitNameTail(english).head.trim();
  return `${head.trimEnd()}{{${original}}}${tail}`;
}

export function isRatifiedName(english: string): boolean {
  return RATIFIED_FEATURES[splitNameTail(english).head.trim()] !== undefined;
}

export function isRatifiedUkrainianName(ukrainian: string): boolean {
  return RATIFIED_UKRAINIAN.has(stripGlossaryMarkers(splitNameTail(ukrainian).head).trim());
}

export function collectBatchSectionNames(): SectionName[] {
  const sources = buildSourceReaders();
  return BATCH_CARRIERS.flatMap((carrier) =>
    listBatchFiles(carrier.directory).flatMap((file) =>
      readBatchFile(file).flatMap((record) =>
        collectRecordSectionNames(file, record, sources.read(carrier, record.slug))
      )
    )
  );
}

/// Збір читає 1 455 сирих сторінок aidedd і корпус 5etools, тож гейт збирає раз і передає сюди.
export function findUnmarkedBatchSectionNames(names = collectBatchSectionNames()): SectionName[] {
  return names.filter((name) => name.english !== "" && !name.marked && !name.bracketed);
}

export function findBracketedOriginalBatchSectionNames(names = collectBatchSectionNames()): SectionName[] {
  return names.filter((name) => !name.marked && name.bracketed);
}

export function describeSectionName(name: SectionName): string {
  return `${name.file} ${name.slug} ${name.section}[${name.index}] «${name.ukrainian}» ← «${name.english}»`;
}

export function writeMarkersIntoBatches(): Record<string, number> {
  const sources = buildSourceReaders();
  const inserted: Record<string, number> = {};

  for (const carrier of BATCH_CARRIERS) {
    for (const file of listBatchFiles(carrier.directory)) {
      const text = readFileSync(join(process.cwd(), file), "utf-8");
      const records = JSON.parse(text) as TranslationRecord[];
      const format = detectBatchFormat(text);
      assertRoundTrips(file, text, records, format);

      let count = 0;
      for (const record of records) {
        count += markRecordSectionNames(record, sources.read(carrier, record.slug));
      }
      inserted[file] = count;
      if (count > 0) writeFileSync(join(process.cwd(), file), serializeBatch(records, format), "utf-8");
    }
  }

  return inserted;
}

/// Назви секцій у зібраному каталозі: `<p><b>Назва.</b> текст</p>` — форма
/// `buildSectionHtml`; успадковані записи пишуть крапку за тегом (`<b>Назва</b>.`).
export type CatalogSectionName = {
  creatureId: number;
  nameEng: string;
  field: string;
  ukrainian: string;
  marked: boolean;
  ratified: boolean;
};

const CATALOG_PROSE_FIELDS = [
  "specialAbilities",
  "actions",
  "bonusActions",
  "reactions",
  "legendaryActions",
  "lairActions",
  "regionEffects",
  "mythicActions",
] as const;

const BOLD_LEMMA = /<p><b>([^<]+)<\/b>/g;

export function collectCatalogSectionNames(catalogPath: string): CatalogSectionName[] {
  const creatures = JSON.parse(readFileSync(join(process.cwd(), catalogPath), "utf-8")) as Array<
    Record<string, unknown> & { creatureId: number; nameEng: string }
  >;

  return creatures.flatMap((creature) =>
    CATALOG_PROSE_FIELDS.flatMap((field) => {
      const html = creature[field];
      if (typeof html !== "string") return [];
      return [...html.matchAll(BOLD_LEMMA)].map((match) => {
        const ukrainian = match[1].replace(/\.$/, "");
        return {
          creatureId: creature.creatureId,
          nameEng: creature.nameEng,
          field,
          ukrainian,
          marked: hasMarkerOnName(ukrainian),
          ratified: isRatifiedUkrainianName(ukrainian),
        };
      });
    })
  );
}

/// Ідентифікатори істот, що приїхали партіями — тобто мають оригінал у корпусі. Решта
/// каталогу — успадковані `.ts` і рукописні духи 2024, де оригіналу назви секції у файлі немає.
export function collectImportedCreatureIds(edition: RulesEdition): Set<number> {
  const manifest = JSON.parse(
    readFileSync(join(process.cwd(), "data/aidedd/import-manifest.json"), "utf-8")
  ) as Array<{ edition: string; creatureId: number; slug: string }>;
  const aideddSlugs = new Set(
    BATCH_CARRIERS.filter((carrier) => carrier.pipeline === "aidedd" && carrier.edition === edition)
      .flatMap((carrier) => listBatchFiles(carrier.directory))
      .flatMap((file) => readBatchFile(file).map((record) => record.slug))
  );
  const fromAidedd = manifest
    .filter((row) => row.edition === edition && aideddSlugs.has(row.slug))
    .map((row) => row.creatureId);
  const from5etools = readBatchPlan()
    .batches.filter((entry) => entry.edition === edition)
    .flatMap((entry) => entry.creatures.filter((row) => row.status === "ready").map((row) => row.creatureId));

  return new Set([...fromAidedd, ...from5etools]);
}

export function findUnmarkedImportedCatalogSectionNames(
  catalogPath: string,
  edition: RulesEdition
): CatalogSectionName[] {
  const imported = collectImportedCreatureIds(edition);
  return collectCatalogSectionNames(catalogPath).filter(
    (name) => imported.has(name.creatureId) && !name.marked && !carriesBracketedOriginal(name.ukrainian)
  );
}

export function describeCatalogSectionName(name: CatalogSectionName): string {
  return `${name.nameEng} (#${name.creatureId}) ${name.field} «${name.ukrainian}»`;
}

function collectRecordSectionNames(
  file: string,
  record: TranslationRecord,
  source: ParsedCreature | null
): SectionName[] {
  return SECTION_KEYS.flatMap((section) =>
    (record[section] ?? []).flatMap((entry, index) => {
      if (entry.name.trim() === "") return [];
      const english = source?.[section]?.[index]?.name?.trim() ?? "";
      return [
        {
          file,
          slug: record.slug,
          section,
          index,
          ukrainian: entry.name,
          english,
          marked: hasMarkerOnName(entry.name),
          bracketed: carriesBracketedOriginal(entry.name),
          ratified: isRatifiedName(english),
        },
      ];
    })
  );
}

function markRecordSectionNames(record: TranslationRecord, source: ParsedCreature | null): number {
  let count = 0;
  for (const section of SECTION_KEYS) {
    (record[section] ?? []).forEach((entry, index) => {
      const english = source?.[section]?.[index]?.name?.trim() ?? "";
      if (entry.name.trim() === "" || english === "") return;
      if (hasMarkerOnName(entry.name) || carriesBracketedOriginal(entry.name)) return;
      entry.name = buildMarkedName(entry.name, english);
      count += 1;
    });
  }
  return count;
}

type SourceReaders = { read: (carrier: BatchCarrier, slug: string) => ParsedCreature | null };

function buildSourceReaders(): SourceReaders {
  let corpus: SourceCreature[] | null = null;
  let rows: Map<string, BatchRow> | null = null;

  return {
    read(carrier, slug) {
      if (carrier.pipeline === "aidedd") return readAideddStatblock(carrier.edition, slug);
      corpus ??= readCreatures().filter((creature) => creature.isFullStatblock);
      rows ??= indexPlanRows();
      const row = rows.get(`${carrier.edition}:${slug}`);
      return row ? findPinnedStatblock(row, corpus) : null;
    },
  };
}

function indexPlanRows(): Map<string, BatchRow> {
  return new Map(
    readBatchPlan()
      .batches.flatMap((entry) => entry.creatures)
      .filter((row) => row.status === "ready")
      .map((row) => [`${row.edition}:${row.slug}`, row])
  );
}

function readAideddStatblock(edition: RulesEdition, slug: string): ParsedCreature {
  const catalog = edition === "RULES_2024" ? "monsters-2024" : "monsters-2014";
  const html = readFileSync(join(findRawDir(catalog), `${slug}.html`), "utf-8");
  return edition === "RULES_2024" ? parseMonster2024(html, slug) : parseMonster2014(html, slug);
}

function listBatchFiles(directory: string): string[] {
  return readdirSync(join(process.cwd(), directory))
    .filter((entry) => entry.endsWith(".json"))
    .sort()
    .map((entry) => `${directory}/${entry}`);
}

function readBatchFile(file: string): TranslationRecord[] {
  return JSON.parse(readFileSync(join(process.cwd(), file), "utf-8")) as TranslationRecord[];
}

/// Партії писалися різними сесіями: більшість — відступ 2 і перенос у кінці, три партії aidedd
/// 2024 — відступ 1, дві партії — без кінцевого переносу. Формат читається з файла й
/// повертається йому ж, інакше diff ніс би переформатування поверх маркерів.
type BatchFormat = { indent: number; trailingNewline: boolean };

function detectBatchFormat(text: string): BatchFormat {
  return {
    indent: /^\[\n( +)/.exec(text)?.[1].length ?? 2,
    trailingNewline: text.endsWith("\n"),
  };
}

function serializeBatch(records: TranslationRecord[], format: BatchFormat): string {
  return `${JSON.stringify(records, null, format.indent)}${format.trailingNewline ? "\n" : ""}`;
}

/// Файл, який не відтворюється `JSON.stringify` побайтово у своєму ж форматі, дістав би
/// сторонній diff — такий файл не чіпається, а падіння називає його.
function assertRoundTrips(file: string, text: string, records: TranslationRecord[], format: BatchFormat): void {
  if (serializeBatch(records, format) !== text) {
    throw new Error(`${file}: файл не відтворюється JSON.stringify побайтово — правити вручну`);
  }
}

function printReport(): void {
  const names = collectBatchSectionNames();
  const byFile = new Map<string, SectionName[]>();
  for (const name of names) byFile.set(name.file, [...(byFile.get(name.file) ?? []), name]);

  const columns = ["names", "marked", "unmarked", "ratifiedEn", "ratifiedUk", "bracketed", "noOriginal"] as const;
  console.log(
    "файл\tназв\tз маркером\tбез маркера\tз них ратифіковані (EN)\tз них ратифіковані (UK)\tз [оригіналом] у назві\tбез оригіналу"
  );
  const total = Object.fromEntries(columns.map((column) => [column, 0])) as Record<(typeof columns)[number], number>;
  for (const [file, list] of byFile) {
    const pending = list.filter((name) => !name.marked && !name.bracketed && name.english !== "");
    const row = {
      names: list.length,
      marked: list.filter((name) => name.marked).length,
      unmarked: pending.length,
      ratifiedEn: pending.filter((name) => name.ratified).length,
      ratifiedUk: pending.filter((name) => isRatifiedUkrainianName(name.ukrainian)).length,
      bracketed: list.filter((name) => !name.marked && name.bracketed).length,
      noOriginal: list.filter((name) => name.english === "").length,
    };
    for (const column of columns) total[column] += row[column];
    console.log([file, ...columns.map((column) => row[column])].join("\t"));
  }
  console.log(["разом", ...columns.map((column) => total[column])].join("\t"));

  for (const name of names.filter((entry) => entry.english === "")) {
    console.log(`без оригіналу: ${describeSectionName(name)}`);
  }
  for (const name of names.filter((entry) => !entry.marked && entry.bracketed)) {
    console.log(`[оригінал] у назві: ${describeSectionName(name)}`);
  }
}

if (process.argv[1]?.endsWith("section-name-markers.ts")) {
  if (process.argv.includes("--write")) {
    const inserted = writeMarkersIntoBatches();
    for (const [file, count] of Object.entries(inserted)) console.log(`${file}\t${count}`);
    console.log(`разом дописано: ${Object.values(inserted).reduce((sum, count) => sum + count, 0)}`);
  } else {
    printReport();
  }
}
