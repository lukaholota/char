import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSpecSchema, formatSchemaProblems, type BuildSpec } from "../../src/lib/optimization/build-spec";
import { BuildSpecError, buildBuildId } from "../../src/lib/optimization/build-spec-compiler";
import { parseArticleDocument } from "../../src/lib/optimization/document";
import { buildRecipeSchema } from "../../src/lib/optimization/schema";
import { readyPresetSchema } from "../../src/lib/optimization/ready-preset";
import type { BuildRecipe } from "../../src/lib/optimization/types";
import type { ReadyPreset } from "../../src/lib/optimization/ready-preset";

export const DATA_ROOT = fileURLToPath(new URL("../../data/rpgbot", import.meta.url));
const SPECS_DIRECTORY = join(DATA_ROOT, "build-specs");
const INDEX_PATH = join(DATA_ROOT, "builds.json");
const LOCK_PATH = `${INDEX_PATH}.lock`;
const LOCK_WAIT_MS = 50;
const LOCK_STALE_MS = 30_000;
const LOCK_TIMEOUT_MS = 60_000;

export function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function recipePath(buildId: string): string {
  return join(DATA_ROOT, "builds", `${buildId}.json`);
}

export function presetPath(slug: string): string {
  return join(DATA_ROOT, "ready-builds", `${slug}.json`);
}

export function listBuildSpecSlugs(): string[] {
  if (!existsSync(SPECS_DIRECTORY)) return [];
  return readdirSync(SPECS_DIRECTORY).filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -5)).sort();
}

export function listReadyPresetSlugs(): string[] {
  return readdirSync(join(DATA_ROOT, "ready-builds")).filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -5)).sort();
}

export function readBuildSpec(slug: string): BuildSpec {
  const path = join(SPECS_DIRECTORY, `${slug}.json`);
  if (!existsSync(path)) throw new BuildSpecError([`Немає специфікації ${path}`]);
  const parsed = buildSpecSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
  if (!parsed.success) throw new BuildSpecError(formatSchemaProblems(parsed.error));
  return parsed.data;
}

export function readArticleDocument(articleSlug: string) {
  const path = join(DATA_ROOT, "uk", `rpgbot-${articleSlug}.json`);
  if (!existsSync(path)) throw new BuildSpecError([`Немає статті ${path} (articleSlug «${articleSlug}»)`]);
  return parseArticleDocument(JSON.parse(readFileSync(path, "utf8")));
}

export function readStoredRecipe(slug: string): BuildRecipe | null {
  return readStoredJson(recipePath(buildBuildId(slug)), (value) => buildRecipeSchema.parse(value));
}

export function readStoredBuild(slug: string): { recipe: BuildRecipe; preset: ReadyPreset } | null {
  const preset = readStoredJson(presetPath(slug), (value) => readyPresetSchema.parse(value));
  if (!preset) return null;
  const recipe = readStoredJson(recipePath(preset.buildId), (value) => buildRecipeSchema.parse(value));
  return recipe ? { recipe, preset } : null;
}

function readStoredJson<T>(path: string, parse: (value: unknown) => T): T | null {
  return existsSync(path) ? parse(JSON.parse(readFileSync(path, "utf8"))) : null;
}

export function findStoredBuildDifferences(slug: string, recipe: BuildRecipe, preset: ReadyPreset): string[] {
  return [
    ...describeDifference(recipePath(buildBuildId(slug)), serializeJson(recipe)),
    ...describeDifference(presetPath(slug), serializeJson(preset)),
  ];
}

function describeDifference(path: string, expected: string): string[] {
  if (!existsSync(path)) return [`${path}: файлу немає`];
  const actualLines = readFileSync(path, "utf8").split("\n");
  const expectedLines = expected.split("\n");
  const line = expectedLines.findIndex((text, index) => text !== actualLines[index]);
  if (line === -1 && expectedLines.length === actualLines.length) return [];
  const at = line === -1 ? expectedLines.length : line;
  return [`${path}, рядок ${at + 1}: на диску «${actualLines[at] ?? "(кінець)"}», з компіляції «${expectedLines[at] ?? "(кінець)"}»`];
}

export function writeBuildFiles(slug: string, recipe: BuildRecipe, preset: ReadyPreset): void {
  writeFileSync(recipePath(recipe.buildId), serializeJson(recipe));
  writeFileSync(presetPath(slug), serializeJson(preset));
  updateBuildsIndex(recipe);
}

function updateBuildsIndex(recipe: BuildRecipe): void {
  withIndexLock(() => {
    const index: BuildRecipe[] = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
    const position = index.findIndex((entry) => entry.buildId === recipe.buildId);
    const next = position === -1 ? [...index, recipe] : index.map((entry, at) => (at === position ? recipe : entry));
    const temporaryPath = `${INDEX_PATH}.${process.pid}.tmp`;
    writeFileSync(temporaryPath, serializeJson(next));
    renameSync(temporaryPath, INDEX_PATH);
  });
}

function withIndexLock(action: () => void): void {
  acquireIndexLock();
  try {
    action();
  } finally {
    rmSync(LOCK_PATH, { recursive: true, force: true });
  }
}

function acquireIndexLock(): void {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  for (;;) {
    try {
      mkdirSync(LOCK_PATH);
      return;
    } catch {
      const lock = statSync(LOCK_PATH, { throwIfNoEntry: false });
      if (lock && Date.now() - lock.mtimeMs > LOCK_STALE_MS) rmSync(LOCK_PATH, { recursive: true, force: true });
      if (Date.now() > deadline) throw new Error(`Не вдалося взяти блокування ${LOCK_PATH}: його тримає інший процес`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, LOCK_WAIT_MS);
    }
  }
}
