/**
 * Owner-run: encode map objects for the «Базові обʼєкти» library, upload them to R2 and rewrite the catalog.
 *   tsx scripts/add-object-library.ts <manifest.json> [--dry-run --out <dir>]
 * Manifest: [{ "source": "/abs/path.webp", "slug": "chest-wood-a1", "category": "storage" }]
 * Source art is drawn at 200px per grid cell (Forgotten Adventures), so the width in cells comes from the pixels.
 * Each object is stored as library/objects/<slug>.webp (≤1024px edge) and library/objects/<slug>-96.webp.
 * Slugs already in the store are not uploaded again, so an interrupted run can be repeated.
 */
import dotenv from "dotenv";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { buildMediaObjectKey } from "@/lib/media-url";
import { buildLibraryObjectKey, OBJECT_LIBRARY_CATEGORIES, type LibraryObject } from "@/lib/refs/object-library";
import { OBJECT_LIBRARY } from "@/lib/refs/object-library-catalog";
import { detectImageType } from "@/server/media/image-processing";
import { hasMediaObject, isMediaStoreConfigured, putMediaObject } from "@/server/media/media-store";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const CATALOG_PATH = path.resolve(process.cwd(), "src/lib/refs/object-library-catalog.ts");
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SOURCE_PIXELS_PER_CELL = 200;
const FULL_EDGE = 1024;
const THUMBNAIL_EDGE = 96;
const UPLOAD_BATCH = 8;
const CATEGORY_IDS = new Set(OBJECT_LIBRARY_CATEGORIES.map((category) => category.id));

type ManifestEntry = { source: string; slug: string; category: string };

async function main() {
  const { manifestPath, isDryRun, outDir } = readArguments(process.argv.slice(2));
  const manifest = parseManifest(JSON.parse(await readFile(manifestPath, "utf8")));
  if (!isDryRun && !isMediaStoreConfigured()) throw new Error("Задайте R2_MEDIA_* у .env або запустіть з --dry-run --out <dir>");
  if (isDryRun) await mkdir(outDir, { recursive: true });
  const processed: LibraryObject[] = [];
  for (let start = 0; start < manifest.length; start += UPLOAD_BATCH) {
    const batch = manifest.slice(start, start + UPLOAD_BATCH);
    processed.push(...(await Promise.all(batch.map((entry) => retry(() => processEntry(entry, isDryRun, outDir))))));
    console.log(`${processed.length}/${manifest.length}`);
  }
  if (isDryRun) return console.log(`Dry run: ${processed.length} обʼєктів закодовано в ${outDir}, каталог не змінено`);
  await writeFile(CATALOG_PATH, renderCatalog(mergeCatalog(OBJECT_LIBRARY, processed)));
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
      typeof entry.category === "string" && CATEGORY_IDS.has(entry.category);
    if (!isValid) throw new Error(`Manifest, запис ${index}: перевірте source (абсолютний шлях), slug (унікальний, a-z0-9-), category (з OBJECT_LIBRARY_CATEGORIES)`);
    slugs.add(entry.slug!);
    return entry as ManifestEntry;
  });
}

async function processEntry(entry: ManifestEntry, isDryRun: boolean, outDir: string): Promise<LibraryObject> {
  const source = new Uint8Array(await readFile(entry.source));
  if (!detectImageType(source)) throw new Error(`${entry.source}: підходять лише JPEG, PNG або WebP`);
  const { width = 0 } = await sharp(source).metadata();
  if (!width) throw new Error(`${entry.source}: не вдалося прочитати розміри`);
  const key = buildLibraryObjectKey(entry.slug);
  const object = { slug: entry.slug, category: entry.category, widthCells: findWidthCells(width) };
  const fullKey = buildMediaObjectKey(key, "full");
  const thumbnailKey = buildMediaObjectKey(key, "thumbnail");
  if (!isDryRun && (await hasMediaObject(fullKey)) && (await hasMediaObject(thumbnailKey))) return object;
  const [full, thumbnail] = await Promise.all([encodeWebp(source, FULL_EDGE), encodeWebp(source, THUMBNAIL_EDGE)]);
  if (isDryRun) await Promise.all([writeFile(path.join(outDir, path.basename(fullKey)), full), writeFile(path.join(outDir, path.basename(thumbnailKey)), thumbnail)]);
  else await Promise.all([putMediaObject(fullKey, full, "image/webp"), putMediaObject(thumbnailKey, thumbnail, "image/webp")]);
  return object;
}

async function retry<T>(run: () => Promise<T>, attemptsLeft = 3): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (attemptsLeft <= 1) throw error;
    console.warn(`Повтор після помилки: ${String(error)}`);
    return retry(run, attemptsLeft - 1);
  }
}

const findWidthCells = (widthPixels: number) => Math.max(0.25, Math.round((widthPixels / SOURCE_PIXELS_PER_CELL) * 4) / 4);

async function encodeWebp(source: Uint8Array, edge: number): Promise<Uint8Array> {
  const encoded = await sharp(source, { failOn: "error" }).resize(edge, edge, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80, alphaQuality: 90 }).toBuffer();
  return new Uint8Array(encoded);
}

function mergeCatalog(existing: readonly LibraryObject[], added: readonly LibraryObject[]): LibraryObject[] {
  const addedSlugs = new Set(added.map((object) => object.slug));
  return [...existing.filter((object) => !addedSlugs.has(object.slug)), ...added];
}

function renderCatalog(objects: readonly LibraryObject[]): string {
  const rows = objects.map((object) => `  ${JSON.stringify(object)},`).join("\n");
  return `import type { LibraryObject } from "@/lib/refs/object-library";\n\n// Generated by scripts/add-object-library.ts. Do not edit by hand.\nexport const OBJECT_LIBRARY: readonly LibraryObject[] = [\n${rows}\n];\n`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
