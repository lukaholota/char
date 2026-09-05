import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { ParsedCreature } from "../aidedd/creature-schema";
import { CreatureTranslation, buildCreatureRecord } from "../aidedd/build-creature-record";
import { GeneratedCreature } from "../generate-creatures";
import { readSourceStatblock } from "./creature-statblock";
import { RulesEdition, SourceCreature, findLooseNameKey, readCreatures } from "./schema";

export const BATCH_PLAN_PATH = join(process.cwd(), "data/5etools/creature-batches.json");
export const TRANSLATIONS_DIR = join(process.cwd(), "data/5etools/translations");

export type BatchRowStatus = "ready" | "blocked-term";

export type BatchRow = {
  nameEng: string;
  slug: string;
  creatureId: number;
  edition: RulesEdition;
  /// Книга, з якої взято статблок. Пінується планом, а не вибирається щоразу: та сама істота
  /// лежить і в MPMM, і в первинній книзі, і мовчазна зміна книги змінила б текст (Р19).
  pinnedSource: string;
  status: BatchRowStatus;
  /// Названий словниковий blocker. Порожньо для `ready`; для `blocked-term` — обовʼязковий.
  blocker: string;
};

export type BatchPlan = {
  batchSize: number;
  revision: string;
  batches: Array<{ batch: number; edition: RulesEdition; creatures: BatchRow[] }>;
};

export function readBatchPlan(): BatchPlan {
  return JSON.parse(readFileSync(BATCH_PLAN_PATH, "utf-8")) as BatchPlan;
}

export function readBatchRows(batch: number): BatchRow[] {
  const found = readBatchPlan().batches.find((entry) => entry.batch === batch);
  if (!found) throw new Error(`У плані немає партії ${batch}`);
  return found.creatures;
}

export function findBatchTranslationPath(batch: number, edition: RulesEdition): string {
  const folder = edition === "RULES_2024" ? "monsters-2024" : "monsters-2014";
  return join(TRANSLATIONS_DIR, folder, `batch-${String(batch).padStart(2, "0")}.json`);
}

export function readBatchTranslations(batch: number, edition: RulesEdition): CreatureTranslation[] {
  const path = findBatchTranslationPath(batch, edition);
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf-8")) as CreatureTranslation[];
}

/// Один запис корпусу на рядок плану: назва **і** книга. Без книги `Alhoon` знаходиться
/// двічі — у MPMM і у VGM — з різним текстом.
export function findPinnedStatblock(row: BatchRow, corpus: SourceCreature[]): ParsedCreature {
  const found = corpus.filter(
    (creature) =>
      creature.source === row.pinnedSource &&
      creature.edition === row.edition &&
      findLooseNameKey(creature.nameEng) === findLooseNameKey(row.nameEng)
  );
  if (found.length !== 1) {
    throw new Error(`${row.nameEng} (${row.pinnedSource}): знайдено ${found.length} записів корпусу замість одного`);
  }
  return readSourceStatblock(found[0], row.slug);
}

/// Похідні істоти з усіх зведених партій. Це вхід для `build-creatures-2014.ts`; за [Р15]
/// істоти лишаються в JSON, тож жодного запису в базу тут немає й бути не може.
export function buildImportedCreaturesFrom5etools(edition: RulesEdition): GeneratedCreature[] {
  const corpus = readCreatures().filter((creature) => creature.isFullStatblock);

  return readBatchPlan()
    .batches.filter((entry) => entry.edition === edition)
    .flatMap((entry) => {
      const translations = readBatchTranslations(entry.batch, entry.edition);
      return entry.creatures
        .filter((row) => row.status === "ready")
        .map((row) => buildRecord(row, translations, corpus));
    });
}

function buildRecord(
  row: BatchRow,
  translations: CreatureTranslation[],
  corpus: SourceCreature[]
): GeneratedCreature {
  const translation = translations.find((entry) => entry.slug === row.slug);
  if (!translation) throw new Error(`${row.nameEng}: у партії немає перекладу для «${row.slug}»`);
  return buildCreatureRecord(findPinnedStatblock(row, corpus), translation, row.creatureId);
}
