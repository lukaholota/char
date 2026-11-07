/**
 * Owner-run: encode battle maps for the «Базові мапи» library, upload them to R2 and rewrite the catalog.
 *   tsx scripts/add-map-library.ts <manifest.json> [--dry-run --out <dir>]
 * Manifest: [{ "source": "/abs/path.jpg", "slug": "forest-road", "name": "Лісова дорога", "originalName": "Forest Road", "pack": "dndavid", "grid": { "columns": 32, "rows": 20 } | null }]
 * Each map is stored as library/maps/<slug>.webp (1600px edge) and library/maps/<slug>-96.webp (320px edge).
 * Slugs already in the store are not uploaded again, so an interrupted run can be repeated.
 * --dry-run encodes into --out and touches neither the store nor the catalog file.
 */
import dotenv from "dotenv";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MAP_LIBRARY_KEY_PREFIX, type LibraryMap } from "@/lib/refs/map-library";
import { MAP_LIBRARY } from "@/lib/refs/map-library-catalog";
import { buildMediaObjectKey } from "@/lib/media-url";
import { MAX_INPUT_PIXELS, buildMapThumbnailWebp, buildScreenshotWebp, detectImageType } from "@/server/media/image-processing";
import { hasMediaObject, isMediaStoreConfigured, putMediaObject } from "@/server/media/media-store";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const CATALOG_PATH = path.resolve(process.cwd(), "src/lib/refs/map-library-catalog.ts");
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const OVERSIZED_SOURCE_EDGE = 4096;

type ManifestEntry = { source: string; slug: string; name: string; originalName: string; pack: string; grid: LibraryMap["grid"] };

async function main() {
  const { manifestPath, isDryRun, outDir } = readArguments(process.argv.slice(2));
  const manifest = parseManifest(JSON.parse(await readFile(manifestPath, "utf8")));
  if (!isDryRun && !isMediaStoreConfigured()) throw new Error("Задайте R2_MEDIA_* у .env або запустіть з --dry-run --out <dir>");
  if (isDryRun) await mkdir(outDir, { recursive: true });
  const processed: LibraryMap[] = [];
  for (const [index, entry] of manifest.entries()) {
    processed.push(await processEntry(entry, isDryRun, outDir));
    console.log(`${index + 1}/${manifest.length} ${entry.slug}`);
  }
  if (isDryRun) return console.log(`Dry run: ${processed.length} мап закодовано в ${outDir}, каталог не змінено`);
  await writeFile(CATALOG_PATH, renderCatalog(mergeCatalog(MAP_LIBRARY, processed)));
  console.log(`Каталог оновлено: ${CATALOG_PATH}`);
}

function readArguments(args: string[]) {
  const outIndex = args.indexOf("--out");
  const manifestPath = args.find((arg, index) => !arg.startsWith("--") && (outIndex === -1 || index !== outIndex + 1));
  if (!manifestPath) throw new Error("Вкажіть шлях до manifest.json");
  const isDryRun = args.includes("--dry-run");
  const outDir = isDryRun && outIndex !== -1 ? (args[outIndex + 1] ?? "") : "";
  if (isDryRun && !outDir) throw new Error("--dry-run потребує --out <dir>");
  return { manifestPath, isDryRun, outDir };
}

function parseManifest(raw: unknown): ManifestEntry[] {
  if (!Array.isArray(raw)) throw new Error("Manifest має бути масивом");
  const slugs = new Set<string>();
  return raw.map((item, index) => {
    const entry = item as Partial<ManifestEntry>;
    const isValid =
      typeof entry.source === "string" && path.isAbsolute(entry.source) && typeof entry.slug === "string" && SLUG_PATTERN.test(entry.slug) && !slugs.has(entry.slug) &&
      typeof entry.name === "string" && entry.name.trim() !== "" && typeof entry.originalName === "string" && entry.originalName.trim() !== "" &&
      typeof entry.pack === "string" && SLUG_PATTERN.test(entry.pack) && (entry.grid === null || (Number.isInteger(entry.grid?.columns) && Number.isInteger(entry.grid?.rows)));
    if (!isValid) throw new Error(`Manifest, запис ${index}: перевірте source (абсолютний шлях), slug (унікальний, a-z0-9-), name, originalName, pack, grid`);
    slugs.add(entry.slug!);
    return entry as ManifestEntry;
  });
}

async function processEntry(entry: ManifestEntry, isDryRun: boolean, outDir: string): Promise<LibraryMap> {
  const original = new Uint8Array(await readFile(entry.source));
  if (!detectImageType(original)) throw new Error(`${entry.source}: підходять лише JPEG, PNG або WebP`);
  const source = await shrinkOversizedSource(original);
  const [full, thumbnail] = [await buildScreenshotWebp(source), await buildMapThumbnailWebp(source)];
  const { width, height } = await sharp(full).metadata();
  if (!width || !height) throw new Error(`${entry.source}: не вдалося прочитати розміри`);
  const key = `${MAP_LIBRARY_KEY_PREFIX}${entry.slug}`;
  const objects = [
    { key: buildMediaObjectKey(key, "full"), body: full },
    { key: buildMediaObjectKey(key, "thumbnail"), body: thumbnail },
  ];
  if (isDryRun) await Promise.all(objects.map((object) => writeFile(path.join(outDir, path.basename(object.key)), object.body)));
  else if (!(await hasMediaObject(objects[0].key)) || !(await hasMediaObject(objects[1].key))) await Promise.all(objects.map((object) => putMediaObject(object.key, object.body, "image/webp")));
  return { slug: entry.slug, name: entry.name.trim(), originalName: entry.originalName.trim(), pack: entry.pack, key, width, height, grid: entry.grid };
}

// Мапи з Patreon бувають до 64 Мп, а ліміт сервера для завантажень — 40 Мп: скрипт власника спершу зменшує їх локально.
async function shrinkOversizedSource(source: Uint8Array): Promise<Uint8Array> {
  const { width = 0, height = 0 } = await sharp(source, { limitInputPixels: false }).metadata();
  if (width * height <= MAX_INPUT_PIXELS) return source;
  const shrunk = await sharp(source, { limitInputPixels: false }).rotate().resize(OVERSIZED_SOURCE_EDGE, OVERSIZED_SOURCE_EDGE, { fit: "inside" }).jpeg({ quality: 95 }).toBuffer();
  return new Uint8Array(shrunk);
}

function mergeCatalog(existing: readonly LibraryMap[], added: readonly LibraryMap[]): LibraryMap[] {
  const addedSlugs = new Set(added.map((map) => map.slug));
  return [...existing.filter((map) => !addedSlugs.has(map.slug)), ...added];
}

function renderCatalog(maps: readonly LibraryMap[]): string {
  const rows = maps.map((map) => `  ${JSON.stringify(map)},`).join("\n");
  return `import type { LibraryMap } from "@/lib/refs/map-library";\n\n// Generated by scripts/add-map-library.ts. Do not edit by hand.\nexport const MAP_LIBRARY: readonly LibraryMap[] = [\n${rows}\n];\n`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
