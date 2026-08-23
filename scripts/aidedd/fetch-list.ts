import { mkdirSync, writeFileSync } from "fs";
import { DEFAULT_PAUSE_MS, encodeFormFields, fetchTextPolitely, pause } from "../lib/polite-http";
import { AIDEDD_CATALOGS, AIDEDD_LIST_DIR, AideddCatalog, findCatalog, findListPath } from "./aidedd-catalogs";

async function fetchAllLists(): Promise<void> {
  const catalogs = readRequestedCatalogs();
  mkdirSync(AIDEDD_LIST_DIR, { recursive: true });

  const failures: string[] = [];

  for (const [index, catalog] of catalogs.entries()) {
    if (index > 0) await pause(DEFAULT_PAUSE_MS);
    try {
      await fetchCatalogList(catalog);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (failures.length > 0) {
    throw new Error(`Переліки не збіглися з очікуваними:\n  - ${failures.join("\n  - ")}`);
  }
}

async function fetchCatalogList(catalog: AideddCatalog): Promise<void> {
  const html = await fetchTextPolitely(catalog.listUrl, {
    body: encodeFormFields(catalog.fields),
  });

  const slugs = findSlugs(html);
  assertExpectedCount(catalog, slugs);

  writeFileSync(
    findListPath(catalog.key),
    `${JSON.stringify({ catalog: catalog.key, count: slugs.length, slugs }, null, 2)}\n`,
    "utf-8"
  );
  console.log(`  ✅ ${catalog.label}: ${slugs.length} слагів → ${findListPath(catalog.key)}`);
}

function findSlugs(html: string): string[] {
  const found = [...html.matchAll(/name=['"]select_item\[\]['"]\s+value=['"]'([^']+)'['"]/g)].map(
    (match) => match[1]
  );
  return [...new Set(found)];
}

function assertExpectedCount(catalog: AideddCatalog, slugs: string[]): void {
  if (slugs.length === catalog.expectedCount) return;

  throw new Error(
    `${catalog.label}: очікували ${catalog.expectedCount}, отримали ${slugs.length}. ` +
      "Перевірте, чи не змінилися значення селектів на сторінці фільтра — " +
      "мовчазний недобір тут найдорожча помилка."
  );
}

function readRequestedCatalogs(): AideddCatalog[] {
  const requested = process.argv
    .filter((argument) => argument.startsWith("--catalog="))
    .map((argument) => argument.slice("--catalog=".length));

  return requested.length > 0 ? requested.map(findCatalog) : AIDEDD_CATALOGS;
}

console.log("📋 Переліки aidedd — усі значення селектів перелічені явно");
fetchAllLists().catch((error) => {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
