/**
 * Кладе згенеровані ChatGPT картинки підкласів і портретів пресетів у `public/images/`
 * та оновлює мапу «ключ підкласу → картинка».
 *
 * Запуск: bunx tsx scripts/place-subclass-art.ts <тека з PNG>
 * Файли `preset-<назва>.png` ідуть у `public/images/presets/<назва>.webp`,
 * решта — у `public/images/subclasses/<назва>.webp`. Назви беруться з `data/subclass-art/*.json`.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import sharp from "sharp";

type PlanEntry = { file: string; subclassKeys?: string[] };

const ROOT = process.cwd();
const PLAN_DIR = join(ROOT, "data/subclass-art");
const SUBCLASS_DIR = join(ROOT, "public/images/subclasses");
const PRESET_DIR = join(ROOT, "public/images/presets");
const MANIFEST_PATH = join(ROOT, "src/lib/assets/subclass-art-manifest.json");
const PRESET_PREFIX = "preset-";
const WEBP_QUALITY = 82;

async function main() {
  const sourceDir = readSourceDir();
  const plannedFiles = new Set(readPlanEntries().map((entry) => entry.file));
  const unknown: string[] = [];
  const targets: string[] = [];

  for (const fileName of listPngFiles(sourceDir)) {
    const baseName = basename(fileName, extname(fileName));
    if (!plannedFiles.has(baseName)) {
      unknown.push(fileName);
      continue;
    }
    targets.push(await convertToWebp(join(sourceDir, fileName), baseName));
  }

  writeManifest();
  reportResult(targets, unknown, plannedFiles);
}

function readSourceDir(): string {
  const sourceDir = process.argv[2];
  if (!sourceDir) throw new Error("Вкажи теку з PNG: bunx tsx scripts/place-subclass-art.ts <тека>");
  return resolve(sourceDir);
}

function readPlanEntries(): PlanEntry[] {
  return readdirSync(PLAN_DIR)
    .filter((name) => name.endsWith(".json") && name !== "queue.json")
    .flatMap((name) => (JSON.parse(readFileSync(join(PLAN_DIR, name), "utf8")) as { entries: PlanEntry[] }).entries);
}

function listPngFiles(sourceDir: string): string[] {
  return readdirSync(sourceDir).filter((name) => extname(name).toLowerCase() === ".png").sort();
}

async function convertToWebp(sourcePath: string, baseName: string): Promise<string> {
  const isPortrait = baseName.startsWith(PRESET_PREFIX);
  const targetDir = isPortrait ? PRESET_DIR : SUBCLASS_DIR;
  const targetName = `${isPortrait ? baseName.slice(PRESET_PREFIX.length) : baseName}.webp`;
  mkdirSync(targetDir, { recursive: true });
  await sharp(sourcePath).webp({ quality: WEBP_QUALITY, effort: 5 }).toFile(join(targetDir, targetName));
  return join(targetDir, targetName);
}

function writeManifest() {
  const manifest: Record<string, string> = {};
  for (const entry of readPlanEntries()) {
    if (!existsSync(join(SUBCLASS_DIR, `${entry.file}.webp`))) continue;
    for (const key of entry.subclassKeys ?? []) manifest[key] = `/images/subclasses/${entry.file}.webp`;
  }
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
}

function reportResult(targets: string[], unknown: string[], plannedFiles: Set<string>) {
  const missing = [...plannedFiles].filter((file) => !isPlaced(file));
  console.log(`Розкладено: ${targets.length}`);
  if (unknown.length) console.log(`Немає в плані, пропущено: ${unknown.join(", ")}`);
  console.log(`Ще немає на диску: ${missing.length}${missing.length ? ` — ${missing.join(", ")}` : ""}`);
}

function isPlaced(file: string): boolean {
  const isPortrait = file.startsWith(PRESET_PREFIX);
  const targetPath = isPortrait
    ? join(PRESET_DIR, `${file.slice(PRESET_PREFIX.length)}.webp`)
    : join(SUBCLASS_DIR, `${file}.webp`);
  return existsSync(targetPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
