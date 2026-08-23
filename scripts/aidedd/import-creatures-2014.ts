import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { GeneratedCreature } from "../generate-creatures";
import { AIDEDD_DIR, findRawDir } from "./aidedd-catalogs";
import { CreatureTranslation, buildCreatureRecord } from "./build-creature-record";
import { parseMonster2014 } from "./parse-monster-2014";

export const TRANSLATIONS_DIR = join(AIDEDD_DIR, "translations/monsters-2014");
const MANIFEST_PATH = join(AIDEDD_DIR, "import-manifest.json");

type ManifestRow = { slug: string; edition: string; creatureId: number };

export function readTranslationBatches(): CreatureTranslation[] {
  if (!existsSync(TRANSLATIONS_DIR)) return [];

  return readdirSync(TRANSLATIONS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .flatMap(
      (file) =>
        JSON.parse(readFileSync(join(TRANSLATIONS_DIR, file), "utf-8")) as CreatureTranslation[]
    );
}

/// The English statblock comes from the page cache, the Ukrainian text from the batch file and the
/// id from the manifest — this is the only place where the three meet.
export function buildImportedCreatures2014(): GeneratedCreature[] {
  const ids = readManifestIds();

  return readTranslationBatches().map((translation) => {
    const creatureId = ids.get(translation.slug);
    if (!creatureId) {
      throw new Error(`У маніфесті немає рядка 2014 для «${translation.slug}»`);
    }
    return buildCreatureRecord(readParsedCreature(translation.slug), translation, creatureId);
  });
}

function readManifestIds(): Map<string, number> {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`Немає ${MANIFEST_PATH} — спершу bunx tsx scripts/aidedd/build-import-manifest.ts`);
  }
  const rows = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as ManifestRow[];
  return new Map(
    rows.filter((row) => row.edition === "RULES_2014").map((row) => [row.slug, row.creatureId])
  );
}

function readParsedCreature(slug: string) {
  const path = join(findRawDir("monsters-2014"), `${slug}.html`);
  if (!existsSync(path)) {
    throw new Error(
      `Немає кешованої сторінки ${path} — запусти bunx tsx scripts/aidedd/fetch-pages.ts --catalog=monsters-2014 --only=${slug}`
    );
  }
  return parseMonster2014(readFileSync(path, "utf-8"), slug);
}
