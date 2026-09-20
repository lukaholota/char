import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { basename, dirname, join } from "path";
import sharp from "sharp";
import { fetchBinaryPolitely, pause } from "../lib/polite-http";
import {
  CREATURE_IMAGE_MANIFEST_PATH,
  CreatureImage,
  CreatureRuleset,
  FIVETOOLS_CREATURE_IMAGE_MANIFEST_PATH,
  buildPublicImagePath,
  compressToWebp,
  findImageDir,
  measureImage,
  normalizeName,
  readCreatureImageManifestFile,
} from "../aidedd/creature-images";
import { RAW_CACHE_DIR } from "./mirror";
import { PicturePick, collectPictureCorpus, pickPicture } from "./creature-pictures";

/// Pictures live in a sister repository of the data mirror, pinned for the same reason as the
/// corpus (see `mirror.ts`): the same command must fetch the same files tomorrow.
const IMAGE_MIRROR_REPOSITORY = "5etools-mirror-3/5etools-img";
const IMAGE_MIRROR_REVISION = "64a508983f48a7812986ca0fe3ee75abaf7c6d0e";
const ORIGINAL_DIR = join(RAW_CACHE_DIR, "img");
const PAUSE_MS = 250;

/// Токен 5etools — кругла картина у власному кільці, з прозорими кутами. Раніше ми вирізали з
/// нього квадрат у 58% сторони, щоб кільце не сперечалося з рамкою сайта, і втрачали більшу
/// частину малюнка разом із силуетом. Рішення власника 2026-09-20: брати токен як є й малювати
/// його без рамки — композиція намальована під круг, і круглою вона й лишається.

const CATALOGUE_FILES: Record<CreatureRuleset, string> = {
  RULES_2014: "src/lib/generated/creatures.json",
  RULES_2024: "src/lib/generated/creatures2024.json",
};

type CatalogueCreature = { nameEng: string; source: string };

async function importCreatureImagesFrom5etools(): Promise<void> {
  const ruleset = readRuleset();
  const uncovered = collectCreaturesWithoutAideddPicture(ruleset);
  const picks = pickPictures(uncovered, ruleset);
  reportPicks(ruleset, uncovered, picks);
  if (process.argv.includes("--dry-run")) return;

  const downloaded = await downloadOriginals(picks);
  const converted = await convertToWebp(ruleset, downloaded);
  writeManifest(ruleset, converted);

  console.log(`✅ ${ruleset}: ${converted.size} істот із картинкою 5etools у ${findImageDir(ruleset)}, маніфест ${FIVETOOLS_CREATURE_IMAGE_MANIFEST_PATH}`);
}

/// The gap is measured against the aidedd manifest, not against the generated catalogue's
/// `imageUrl`: after one run the catalogue carries our own stamps, and a second run would
/// otherwise see nothing to do and write an empty manifest.
function collectCreaturesWithoutAideddPicture(ruleset: CreatureRuleset): CatalogueCreature[] {
  const cataloguePath = join(process.cwd(), CATALOGUE_FILES[ruleset]);
  if (!existsSync(cataloguePath)) {
    throw new Error(`Немає ${cataloguePath}. Спершу зберіть каталог: npx tsx scripts/build-creatures-${ruleset.slice(-4)}.ts`);
  }

  const catalogue = JSON.parse(readFileSync(cataloguePath, "utf-8")) as CatalogueCreature[];
  const covered = new Set(Object.keys(readCreatureImageManifestFile(CREATURE_IMAGE_MANIFEST_PATH)[ruleset]).map(normalizeName));
  return catalogue.filter((creature) => !covered.has(normalizeName(creature.nameEng)));
}

function pickPictures(creatures: CatalogueCreature[], ruleset: CreatureRuleset): PicturePick[] {
  const corpus = collectPictureCorpus();
  return creatures.flatMap((creature) => {
    const pick = pickPicture(creature, ruleset, corpus);
    return pick ? [pick] : [];
  });
}

function reportPicks(ruleset: CreatureRuleset, uncovered: CatalogueCreature[], picks: PicturePick[]): void {
  const picked = new Set(picks.map((pick) => pick.nameEng));
  const art = picks.filter((pick) => pick.kind === "art").length;
  const unmatched = uncovered.filter((creature) => !picked.has(creature.nameEng));

  console.log(`🖼  ${ruleset}: ${uncovered.length} істот без картинки aidedd → арт ${art}, токен ${picks.length - art}, без збігу ${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log(`  без збігу: ${unmatched.map((creature) => `${creature.nameEng} [${creature.source}]`).join(", ")}`);
  }
}

/// `hasToken` in the mirror's JSON is a promise the image repository does not always keep, so a
/// 404 costs one creature its picture, not the whole run.
async function downloadOriginals(picks: PicturePick[]): Promise<PicturePick[]> {
  const downloaded: PicturePick[] = [];
  const missing: string[] = [];
  let fetched = 0;
  let cached = 0;

  for (const pick of picks) {
    const path = findOriginalPath(pick);
    if (existsSync(path) && statSync(path).size > 0) {
      cached += 1;
      downloaded.push(pick);
      continue;
    }

    mkdirSync(dirname(path), { recursive: true });
    if (fetched > 0) await pause(PAUSE_MS);
    try {
      writeFileSync(path, await fetchOriginal(pick.path));
      downloaded.push(pick);
    } catch {
      missing.push(pick.path);
    }
    fetched += 1;
    if (fetched % 50 === 0) console.log(`  … ${fetched} завантажено, ${cached} з кешу`);
  }

  console.log(`  ⬇  ${fetched} завантажено, ${cached} уже було в кеші`);
  if (missing.length > 0) console.log(`  ⚠️  ${missing.length} немає на дзеркалі: ${missing.slice(0, 5).join(", ")}`);
  return downloaded;
}

/// One mirror file often serves several statblocks («Dinosaurs.webp» for every dinosaur), so the
/// conversion is keyed by target file and the manifest by creature. The only file this must never
/// overwrite is one aidedd owns; a leftover of an interrupted run is simply rewritten.
async function convertToWebp(ruleset: CreatureRuleset, picks: PicturePick[]): Promise<Map<string, CreatureImage>> {
  const targetDir = findImageDir(ruleset);
  mkdirSync(targetDir, { recursive: true });
  const aideddFiles = new Set(Object.values(readCreatureImageManifestFile(CREATURE_IMAGE_MANIFEST_PATH)[ruleset]).map((image) => image.file));

  const force = process.argv.includes("--force");
  const byFile = new Map<string, CreatureImage>();
  const converted = new Map<string, CreatureImage>();
  const broken: string[] = [];
  let written = 0;

  for (const pick of picks) {
    const file = buildWebpName(pick);
    const known = byFile.get(file);
    if (known) {
      converted.set(pick.nameEng, known);
      continue;
    }

    if (aideddFiles.has(file)) {
      throw new Error(`${file} належить маніфесту aidedd — назва зіткнулася з чужою картинкою`);
    }

    const targetPath = join(targetDir, file);
    try {
      let image: CreatureImage;
      if (!force && existsSync(targetPath)) {
        image = await measureImage(targetPath, file);
      } else {
        image = await compressToWebp(findOriginalPath(pick), targetPath);
        written += 1;
      }
      const stamped = pick.kind === "token" ? { ...image, shape: "round" as const } : image;
      byFile.set(file, stamped);
      converted.set(pick.nameEng, stamped);
    } catch {
      broken.push(pick.path);
    }
  }

  console.log(`  🗜  ${written} стиснуто у webp, ${byFile.size - written} вже було, ${converted.size} істот`);
  if (broken.length > 0) console.log(`  ⚠️  ${broken.length} не читається: ${broken.slice(0, 5).join(", ")}`);
  return converted;
}

function writeManifest(ruleset: CreatureRuleset, converted: Map<string, CreatureImage>): void {
  const manifest = readCreatureImageManifestFile(FIVETOOLS_CREATURE_IMAGE_MANIFEST_PATH);
  const entries: Record<string, CreatureImage> = {};
  for (const nameEng of [...converted.keys()].sort((left, right) => left.localeCompare(right))) {
    entries[nameEng] = converted.get(nameEng) as CreatureImage;
  }

  manifest[ruleset] = entries;
  writeFileSync(FIVETOOLS_CREATURE_IMAGE_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  console.log(`  📒 ${Object.keys(entries).length} істот у маніфесті (${buildPublicImagePath(ruleset, "…")})`);
}

/// The JSON keeps the accent («Rothé»), the file on the mirror does not («Rothe.webp»).
async function fetchOriginal(mirrorPath: string): Promise<Buffer> {
  try {
    return await fetchBinaryPolitely(buildImageUrl(mirrorPath), { retries: 1 });
  } catch (error) {
    const folded = foldDiacritics(mirrorPath);
    if (folded === mirrorPath) throw error;
    return fetchBinaryPolitely(buildImageUrl(folded), { retries: 1 });
  }
}

function foldDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function buildImageUrl(mirrorPath: string): string {
  return `https://raw.githubusercontent.com/${IMAGE_MIRROR_REPOSITORY}/${IMAGE_MIRROR_REVISION}/${encodeURI(mirrorPath)}`;
}

function findOriginalPath(pick: PicturePick): string {
  return join(ORIGINAL_DIR, pick.path);
}

/// Named after the mirror file with its book code in front (`mm-dire-wolf.webp`), not after our
/// creature: aidedd names its files after the page slug, and «The Wretched» from 5etools would
/// otherwise land on the `the-wretched.webp` aidedd already holds for «Wretched Sorrowsworn».
function buildWebpName(pick: PicturePick): string {
  const slug = normalizeName(foldDiacritics(basename(pick.path, ".webp"))).replace(/ /g, "-");
  const prefix = pick.source.toLowerCase();
  return pick.kind === "token" ? `${prefix}-${slug}-token.webp` : `${prefix}-${slug}.webp`;
}

function readRuleset(): CreatureRuleset {
  const argument = process.argv.find((value) => value.startsWith("--ruleset="));
  const value = argument?.slice("--ruleset=".length);
  if (value === "RULES_2014" || value === "RULES_2024") return value;
  throw new Error("Вкажіть --ruleset=RULES_2014 або --ruleset=RULES_2024");
}

importCreatureImagesFrom5etools().catch((error) => {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
