import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { AIDEDD_DIR, findRawDir } from "./aidedd-catalogs";
import { CreatureEdition, ParsedCreature } from "./creature-schema";
import { parseMonster2024 } from "./parse-monster-2024";
import { parseMonster2014 } from "./parse-monster-2014";
import { readChallengeNumber } from "./statblock-fields";
import { readTranslationBatches as readTranslationBatches2024 } from "./import-creatures-2024";
import { readTranslationBatches as readTranslationBatches2014 } from "./import-creatures-2014";
import creatures2024 from "../../src/lib/generated/creatures2024.json";
import creatures2014 from "../../src/lib/generated/creatures.json";
import { toEntitySlug } from "../../src/lib/slug-utils";

/// aidedd публікує по цих трьох слагах лише збірну сторінку без статблока — імпортувати з неї
/// нічого й ніколи не буде. Поіменні істоти приїхали з корпусу 5etools: 15 прадраконів книги
/// FTD, партія 20. Рядок закритий не тим, що його переклали, а тим, що джерело покрив інший
/// конвеєр, — і без цього переліку він лишався б `pending` назавжди при зробленій роботі.
/// Загальний предикат нижче тут не працює: він зводить рядок із каталогом за слагом або id, а
/// збірного слага в каталозі немає взагалі й не буде.
const COLLECTIVE_PAGES_COVERED_ELSEWHERE = new Set([
  "gem-greatwyrm",
  "chromatic-greatwyrm",
  "metallic-greatwyrm",
]);

const MANIFEST_PATH = join(AIDEDD_DIR, "import-manifest.json");
const BATCH_SIZE = 30;

/// 2024 starts past its 23 hand-written summons/updates; 2014 continues the legacy catalogue's own
/// numbering (highest existing id was 564) — see Р12, ids never overlap between editions.
const FIRST_IMPORT_ID: Record<CreatureEdition, number> = {
  RULES_2024: 20024,
  RULES_2014: 565,
};

/// `existing` is not a stage of the import: for 2024 it marks a creature the catalog already
/// carried before the aidedd import started, so the queue never touches it again. 2014 has no such
/// status — a catalogued match there means the legacy statblock is stale and KR12.3 reconciles it,
/// so it flows through the normal pending → translated queue instead, reusing its existing id.
export type ImportStatus = "pending" | "parsed" | "translated" | "verified" | "existing";

export type ManifestRow = {
  nameEng: string;
  slug: string;
  edition: CreatureEdition;
  status: ImportStatus;
  creatureId: number;
  batch: number;
};

function buildImportManifest(): void {
  const previous = readPreviousRows();
  const rows = [...buildRows(previous, "RULES_2024"), ...buildRows(previous, "RULES_2014")];

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(rows, null, 2)}\n`, "utf-8");

  for (const edition of ["RULES_2024", "RULES_2014"] as const) {
    const counts = countByStatus(rows.filter((row) => row.edition === edition));
    console.log(`✅ ${edition}: ${rows.filter((row) => row.edition === edition).length} рядків: ${counts}`);
  }
}

function buildRows(previous: Map<string, ManifestRow>, edition: CreatureEdition): ManifestRow[] {
  const catalogued = readCataloguedSlugs(edition);
  const translated = readTranslatedSlugs(edition);
  const sorted = readParsedCreatures(edition);

  const cataloguedIds = new Set(catalogued.values());
  let nextId = findNextImportId(previous, edition);
  let nextBatchPosition = findNextBatchPosition(previous, edition);

  return sorted.map((creature) => {
    const kept = previous.get(rowKey(edition, creature.slug));
    const creatureId = catalogued.get(creature.slug) ?? kept?.creatureId ?? nextId;
    if (creatureId === nextId) nextId += 1;

    /// Рядок вважається закритим і за id, не лише за слагом. Слаг веде звірку скрізь, але aidedd
    /// подеколи пише назву з помилкою — «Ranimated Companion» замість «Reanimated Companion», —
    /// і тоді слаг каталогу з ним не збігається, хоча істота вже там. Id для цього надійний саме
    /// у 2024: їх роздає сам маніфест, а план 5etools переносить його рядок у рядок. У 2014 так
    /// не можна — там імпорт 5etools зайняв id із того самого діапазону, що роздає маніфест.
    const permanentlySkipped =
      COLLECTIVE_PAGES_COVERED_ELSEWHERE.has(creature.slug) ||
      (edition === "RULES_2024" &&
        (catalogued.has(creature.slug) || cataloguedIds.has(creatureId)) &&
        !translated.has(creature.slug));

    /// Номер партії, вже присвоєний рядку, переживає перехід у `existing`. Спершу
    /// `permanentlySkipped` обнуляв його беззастережно — і це стирало історію для рядків, які
    /// пройшли свою партію, були нею відкладені, а закрилися пізніше з іншого джерела (16 істот
    /// імпорту 5etools, 2026-08-29). Нуль лишається тим, чим був: позначкою «до партій не потрапляв».
    let batch: number;
    if (kept && kept.batch !== 0) {
      batch = kept.batch;
    } else if (permanentlySkipped) {
      batch = 0;
    } else {
      batch = Math.floor(nextBatchPosition / BATCH_SIZE) + 1;
      nextBatchPosition += 1;
    }

    return {
      nameEng: creature.nameEng,
      slug: creature.slug,
      edition,
      status: findStatus(permanentlySkipped, translated.has(creature.slug), kept),
      creatureId,
      batch,
    };
  });
}

function findStatus(
  permanentlySkipped: boolean,
  translated: boolean,
  kept: ManifestRow | undefined
): ImportStatus {
  if (permanentlySkipped) return "existing";
  if (kept?.status === "verified") return "verified";
  return translated ? "translated" : "pending";
}

function rowKey(edition: CreatureEdition, slug: string): string {
  return `${edition}::${slug}`;
}

function findNextImportId(previous: Map<string, ManifestRow>, edition: CreatureEdition): number {
  const assigned = [...previous.values()]
    .filter((row) => row.edition === edition && row.status !== "existing")
    .map((row) => row.creatureId);
  return assigned.length === 0 ? FIRST_IMPORT_ID[edition] : Math.max(...assigned) + 1;
}

/// Batch numbers for already-seen rows are preserved verbatim from `previous` (never recomputed),
/// so this position counter only decides batches for rows the manifest has never assigned one to.
function findNextBatchPosition(previous: Map<string, ManifestRow>, edition: CreatureEdition): number {
  return [...previous.values()].filter((row) => row.edition === edition && row.batch !== 0).length;
}

function readPreviousRows(): Map<string, ManifestRow> {
  if (!existsSync(MANIFEST_PATH)) return new Map();
  const rows = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as ManifestRow[];
  return new Map(rows.map((row) => [rowKey(row.edition, row.slug), row]));
}

type CataloguedCreature = { nameEng: string; creatureId: number };

/// The two catalogues' generated JSON shapes are wide, structurally distinct object-literal
/// unions; combining them through this ternary collapses map()'s inference to `any` unless each
/// side is narrowed to the two fields this function actually reads.
function readCataloguedSlugs(edition: CreatureEdition): Map<string, number> {
  const catalog = (edition === "RULES_2024" ? creatures2024 : creatures2014) as CataloguedCreature[];
  return new Map(catalog.map((creature) => [toEntitySlug(creature.nameEng), creature.creatureId]));
}

function readTranslatedSlugs(edition: CreatureEdition): Set<string> {
  const batches = edition === "RULES_2024" ? readTranslationBatches2024() : readTranslationBatches2014();
  return new Set(batches.map((translation) => translation.slug));
}

function readParsedCreatures(edition: CreatureEdition): ParsedCreature[] {
  const dir = findRawDir(edition === "RULES_2024" ? "monsters-2024" : "monsters-2014");
  const parse = edition === "RULES_2024" ? parseMonster2024 : parseMonster2014;
  const creatures = readdirSync(dir)
    .filter((file) => file.endsWith(".html"))
    .map((file) => parse(readFileSync(join(dir, file), "utf-8"), file.replace(/\.html$/, "")));

  return creatures.sort((left, right) => {
    const leftSortableCr = toSortableCr(readChallengeNumber(left.challenge));
    const rightSortableCr = toSortableCr(readChallengeNumber(right.challenge));
    if (leftSortableCr !== rightSortableCr) return leftSortableCr - rightSortableCr;
    return left.slug.localeCompare(right.slug);
  });
}

function toSortableCr(challenge: number): number {
  return Number.isFinite(challenge) ? challenge : Number.MAX_SAFE_INTEGER;
}

function countByStatus(rows: ManifestRow[]): string {
  const counts = new Map<ImportStatus, number>();
  for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  return [...counts.entries()].map(([status, count]) => `${status} ${count}`).join(", ");
}

buildImportManifest();
