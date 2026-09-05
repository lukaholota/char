import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import sharp from "sharp";
import { DEFAULT_PAUSE_MS, fetchBinaryPolitely, pause } from "../lib/polite-http";
import { AIDEDD_RAW_DIR, findRawDir } from "./aidedd-catalogs";
import { findHeadingText, findPictureUrl } from "./html-statblock";
import {
  CREATURE_IMAGE_MANIFEST_PATH,
  CreatureImage,
  CreatureRuleset,
  buildPublicImagePath,
  findImageDir,
  readCreatureImageManifest,
} from "./creature-images";

const MAX_WIDTH = 640;
const WEBP_QUALITY = 78;

type ImageCatalog = {
  key: string;
  label: string;
  ruleset: CreatureRuleset;
  baseUrl: string;
};

type PictureRef = {
  nameEng: string;
  url: string;
};

const IMAGE_CATALOGS: ImageCatalog[] = [
  {
    key: "monsters-2014",
    label: "Монстри 2014",
    ruleset: "RULES_2014",
    baseUrl: "https://www.aidedd.org/dnd/",
  },
  {
    key: "monsters-2024",
    label: "Монстри 2024",
    ruleset: "RULES_2024",
    baseUrl: "https://www.aidedd.org/monster/",
  },
];

async function importCreatureImages(): Promise<void> {
  const catalog = findImageCatalog(readCatalogKey());
  const refs = collectPictureRefs(catalog);
  console.log(`🖼  ${catalog.label}: ${refs.length} істот із картинкою, ${countUnique(refs)} унікальних файлів`);

  const downloaded = await downloadOriginals(catalog, refs);
  const converted = await convertToWebp(catalog, downloaded);
  writeManifest(catalog, refs, converted);

  console.log(
    `✅ ${catalog.label}: ${converted.size} webp у ${findImageDir(catalog.ruleset)}, ` +
      `маніфест ${CREATURE_IMAGE_MANIFEST_PATH}`
  );
}

/// The pictures came down with the pages in KR12.1 — the `<img>` is already in the cached HTML,
/// so no second pass over the site is needed, only over the cache.
function collectPictureRefs(catalog: ImageCatalog): PictureRef[] {
  const rawDir = findRawDir(catalog.key);
  if (!existsSync(rawDir)) {
    throw new Error(`Немає кешу ${rawDir}. Спершу запустіть fetch-pages.ts --catalog=${catalog.key}`);
  }

  const refs: PictureRef[] = [];

  for (const file of readdirSync(rawDir).filter((name) => name.endsWith(".html"))) {
    const html = readFileSync(join(rawDir, file), "utf-8");
    const url = findPictureUrl(html, catalog.baseUrl);
    if (url === "") continue;

    const nameEng = findHeadingText(html);
    if (nameEng === "") continue;

    refs.push({ nameEng, url });
  }

  return refs;
}

async function downloadOriginals(catalog: ImageCatalog, refs: PictureRef[]): Promise<Map<string, string>> {
  const originalDir = join(AIDEDD_RAW_DIR, "images", catalog.key);
  mkdirSync(originalDir, { recursive: true });

  const paths = new Map<string, string>();
  const urls = [...new Set(refs.map((ref) => ref.url))];
  let fetched = 0;
  let cached = 0;

  for (const url of urls) {
    const path = join(originalDir, findOriginalName(url));
    paths.set(url, path);

    if (existsSync(path) && statSync(path).size > 0) {
      cached += 1;
      continue;
    }

    if (fetched > 0) await pause(DEFAULT_PAUSE_MS);
    writeFileSync(path, await fetchBinaryPolitely(url));
    fetched += 1;

    if (fetched % 25 === 0) console.log(`  … ${fetched} завантажено, ${cached} з кешу`);
  }

  console.log(`  ⬇  ${fetched} завантажено, ${cached} уже було в кеші`);
  return paths;
}

/// aidedd answers a missing picture with a 200 and an HTML page, so a file that sharp cannot read
/// is a soft 404, not a bug here: it is reported and left out of the manifest.
async function convertToWebp(
  catalog: ImageCatalog,
  originals: Map<string, string>
): Promise<Map<string, CreatureImage>> {
  const targetDir = findImageDir(catalog.ruleset);
  mkdirSync(targetDir, { recursive: true });

  const force = process.argv.includes("--force");
  const converted = new Map<string, CreatureImage>();
  const broken: string[] = [];
  let written = 0;

  for (const [url, originalPath] of originals) {
    const file = buildWebpName(url);
    const targetPath = join(targetDir, file);

    try {
      if (!force && existsSync(targetPath)) {
        converted.set(url, await measureImage(targetPath, file));
        continue;
      }

      const info = await sharp(originalPath)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(targetPath);
      converted.set(url, { file, width: info.width, height: info.height });
      written += 1;
    } catch {
      broken.push(url);
    }
  }

  console.log(`  🗜  ${written} стиснуто у webp, ${converted.size - written} вже було`);
  if (broken.length > 0) {
    console.log(`  ⚠️  ${broken.length} без картинки на сервері: ${broken.slice(0, 5).join(", ")}`);
  }

  return converted;
}

function writeManifest(catalog: ImageCatalog, refs: PictureRef[], converted: Map<string, CreatureImage>): void {
  const manifest = readCreatureImageManifest();
  const entries: Record<string, CreatureImage> = {};

  for (const ref of refs.sort((left, right) => left.nameEng.localeCompare(right.nameEng))) {
    const image = converted.get(ref.url);
    if (image) entries[ref.nameEng] = image;
  }

  manifest[catalog.ruleset] = entries;
  writeFileSync(CREATURE_IMAGE_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  console.log(`  📒 ${Object.keys(entries).length} істот у маніфесті (${buildPublicImagePath(catalog.ruleset, "…")})`);
}

async function measureImage(path: string, file: string): Promise<CreatureImage> {
  const { width, height } = await sharp(path).metadata();
  if (!width || !height) throw new Error(`Не читається як картинка: ${path}`);
  return { file, width, height };
}

function buildWebpName(url: string): string {
  return `${findOriginalName(url).replace(/\.[a-z0-9]+$/i, "")}.webp`;
}

function findOriginalName(url: string): string {
  const name = url.split("/").pop() ?? "";
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function countUnique(refs: PictureRef[]): number {
  return new Set(refs.map((ref) => ref.url)).size;
}

function findImageCatalog(key: string): ImageCatalog {
  const catalog = IMAGE_CATALOGS.find((entry) => entry.key === key);
  if (!catalog) {
    throw new Error(`Невідомий каталог «${key}». Доступні: ${IMAGE_CATALOGS.map((entry) => entry.key).join(", ")}`);
  }
  return catalog;
}

function readCatalogKey(): string {
  const argument = process.argv.find((value) => value.startsWith("--catalog="));
  if (!argument) throw new Error("Вкажіть --catalog=<ключ>, наприклад --catalog=monsters-2024");
  return argument.slice("--catalog=".length);
}

importCreatureImages().catch((error) => {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
