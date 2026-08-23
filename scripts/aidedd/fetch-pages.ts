import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { DEFAULT_PAUSE_MS, fetchTextPolitely, pause } from "../lib/polite-http";
import { AideddCatalog, findCatalog, findListPath, findRawDir } from "./aidedd-catalogs";

const MIN_PAGE_BYTES = 1500;

async function fetchCatalogPages(): Promise<void> {
  const catalog = findCatalog(readCatalogKey());
  const targets = pickTargets(readSlugs(catalog));

  mkdirSync(findRawDir(catalog.key), { recursive: true });
  console.log(`🌐 ${catalog.label}: ${targets.length} сторінок, один потік, пауза ${DEFAULT_PAUSE_MS} мс`);

  let downloaded = 0;
  let cached = 0;

  for (const slug of targets) {
    if (hasCachedPage(catalog, slug)) {
      cached += 1;
      continue;
    }

    if (downloaded > 0) await pause(DEFAULT_PAUSE_MS);
    const html = await fetchTextPolitely(catalog.buildPageUrl(slug));
    writeFileSync(findPagePath(catalog, slug), html, "utf-8");
    downloaded += 1;

    if (downloaded % 25 === 0) {
      console.log(`  … ${downloaded} завантажено, ${cached} з кешу`);
    }
  }

  console.log(`✅ ${catalog.label}: ${downloaded} завантажено, ${cached} уже було в кеші`);
}

function readSlugs(catalog: AideddCatalog): string[] {
  const path = findListPath(catalog.key);
  if (!existsSync(path)) {
    throw new Error(`Немає ${path}. Спершу запустіть fetch-list.ts --catalog=${catalog.key}`);
  }

  const parsed = JSON.parse(readFileSync(path, "utf-8")) as { slugs?: string[] };
  if (!Array.isArray(parsed.slugs) || parsed.slugs.length === 0) {
    throw new Error(`Порожній перелік у ${path}`);
  }

  return parsed.slugs;
}

function hasCachedPage(catalog: AideddCatalog, slug: string): boolean {
  const path = findPagePath(catalog, slug);
  return existsSync(path) && statSync(path).size >= MIN_PAGE_BYTES;
}

function findPagePath(catalog: AideddCatalog, slug: string): string {
  return join(findRawDir(catalog.key), `${slug}.html`);
}

function readCatalogKey(): string {
  const argument = process.argv.find((value) => value.startsWith("--catalog="));
  if (!argument) throw new Error("Вкажіть --catalog=<ключ>, наприклад --catalog=monsters-2024");
  return argument.slice("--catalog=".length);
}

function pickTargets(slugs: string[]): string[] {
  const only = readListArgument("--only=");
  if (only.length > 0) {
    const missing = only.filter((slug) => !slugs.includes(slug));
    if (missing.length > 0) throw new Error(`Немає в переліку: ${missing.join(", ")}`);
    return only;
  }

  const limit = readLimit();
  return limit === null ? slugs : slugs.slice(0, limit);
}

function readListArgument(prefix: string): string[] {
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument
    ? argument
        .slice(prefix.length)
        .split(",")
        .map((slug) => slug.trim())
        .filter((slug) => slug !== "")
    : [];
}

function readLimit(): number | null {
  const argument = process.argv.find((value) => value.startsWith("--limit="));
  if (!argument) return null;

  const limit = Number(argument.slice("--limit=".length));
  if (!Number.isInteger(limit) || limit <= 0) throw new Error(`Некоректний --limit: ${argument}`);
  return limit;
}

fetchCatalogPages().catch((error) => {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
