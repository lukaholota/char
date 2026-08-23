/**
 * Дзеркалить перекладні мапи з src/lib/refs/translation.ts у src/lib/refs/dictionary.json.
 *
 *   npx tsx scripts/sync-dictionary-from-translation.ts
 *
 * Причина: словник рекламувався як єдине джерело термінів, але половина перекладів жила
 * тільки в translation.ts — і сесія, яка шукала «Monster Manual» у dictionary.json, його
 * не знаходила. Тепер одне місце для grep, а розбіжність ловить тест
 * tests/content/dictionary-mirrors-translation.test.ts.
 *
 * translation.ts лишається джерелом істини для UI: скрипт тільки копіює з нього.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import * as translation from "../src/lib/refs/translation";

const DICTIONARY_PATH = join(process.cwd(), "src/lib/refs/dictionary.json");

/// Зворотні мапи (`*Eng`) — це інверсія прямих, масиви `skills`/`engEnumSkills` не є перекладом,
/// а `itemRarityTranslations` — псевдонім `rarityTranslations`. Дзеркалити їх означало б тримати
/// одні й ті самі рядки двічі в одному файлі.
const SKIPPED = new Set(["skills", "engEnumSkills", "itemRarityTranslations"]);

export function collectMirroredMaps(): Record<string, Record<string, string>> {
  const maps: Record<string, Record<string, string>> = {};

  for (const [name, value] of Object.entries(translation)) {
    if (name.endsWith("Eng") || SKIPPED.has(name)) continue;
    if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
    maps[name] = value as Record<string, string>;
  }

  return Object.fromEntries(Object.entries(maps).sort(([left], [right]) => left.localeCompare(right)));
}

function syncDictionary(): void {
  const dictionary = JSON.parse(readFileSync(DICTIONARY_PATH, "utf-8")) as Record<string, unknown>;
  const mirrored = collectMirroredMaps();
  const before = JSON.stringify(dictionary.CONTENT_TRANSLATIONS ?? null);

  dictionary.CONTENT_TRANSLATIONS = mirrored;
  writeFileSync(DICTIONARY_PATH, `${JSON.stringify(dictionary, null, 2)}\n`, "utf-8");

  const entries = Object.values(mirrored).reduce((sum, map) => sum + Object.keys(map).length, 0);
  const verb = before === JSON.stringify(mirrored) ? "без змін" : "оновлено";
  console.log(`✅ CONTENT_TRANSLATIONS ${verb}: ${Object.keys(mirrored).length} мап, ${entries} термінів`);
}

if (process.argv[1]?.endsWith("sync-dictionary-from-translation.ts")) syncDictionary();
