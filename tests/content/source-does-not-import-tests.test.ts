import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const SCANNED = ["src", "scripts"];

/// `.dockerignore` не пускає `tests/` в образ, а `next build` перевіряє типи і в `scripts/`.
/// Тому імпорт із `tests/` у будь-якому іншому дереві збирається локально й падає в збірці
/// образу — «Cannot find module '../../tests/…'». Спіймано 2026-09-20: `corpus-term-occurrences.ts`
/// брав звідти зняті форми термінів, і реліз, який лікував лежачий прод, не проїхав.
///
/// Спільне визначення для гейта й інструмента живе в `src/lib/refs/`, як `glossary-marker.ts`.
const IMPORT_FROM_TESTS = /from\s*["']([^"']*\btests\/[^"']*)["']/g;

function collectSourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(path, found);
    else if (/\.tsx?$/.test(entry.name)) found.push(path);
  }
  return found;
}

describe("код поза tests/ не імпортує з tests/", () => {
  const files = SCANNED.flatMap((dir) => collectSourceFiles(join(ROOT, dir)));

  it("їх узагалі видно — інакше гейт зелений через порожній список", () => {
    expect(files.length).toBeGreaterThan(500);
  });

  it("жоден не тягне модуль із tests/ — в образі його немає", () => {
    const offenders = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      IMPORT_FROM_TESTS.lastIndex = 0;
      const hits: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = IMPORT_FROM_TESTS.exec(source))) {
        hits.push(`${relative(ROOT, file)} → ${match[1]}`);
      }
      return hits;
    });

    expect(offenders).toEqual([]);
  });
});
