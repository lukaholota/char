/**
 * KR33.8 — вхід для перекладу вступів до груп істот: по одному JSON на групу з англійським
 * markdown, істотами групи й згаданими сутностями з українськими формами з каталогу.
 *
 *   bunx tsx scripts/5etools/dump-bestiary-lore-inputs.ts --out <тека>
 *
 * Потрібне стягнуте дзеркало (`npx tsx scripts/5etools/fetch-source.ts`). Пише
 * `<тека>/<редакція>/<key>.json` і `<тека>/index.json` — список для воркфлоу
 * `.claude/workflows/bestiary-lore-translate.js`.
 */

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { readLoreGroups, renderLoreEntriesToMarkdown } from "./bestiary-lore";
import { decomposeMarkup } from "./markup";
import { findLooseNameKey, RulesEdition } from "./schema";
import creatures2014 from "../../src/lib/generated/creatures.json";
import creatures2024 from "../../src/lib/generated/creatures2024.json";

type CatalogRow = { nameEng: string; name: string; source: string; type: string };
type IndexRow = { key: string; edition: RulesEdition; engName: string; words: number; members: number; unmatched: number };

const outDir = readOutDir();
const catalogs: Record<RulesEdition, CatalogRow[]> = {
  RULES_2014: (creatures2014 as CatalogRow[]).filter((row) => row.source === "MM"),
  RULES_2024: (creatures2024 as CatalogRow[]).filter((row) => row.source === "MM_2024"),
};
const allRows = [...(creatures2014 as CatalogRow[]), ...(creatures2024 as CatalogRow[])];

const index: IndexRow[] = [];
for (const edition of ["RULES_2014", "RULES_2024"] as const) {
  mkdirSync(join(outDir, edition), { recursive: true });
  const byKey = new Map(catalogs[edition].map((row) => [findLooseNameKey(row.nameEng), row]));

  for (const group of readLoreGroups(edition)) {
    const members = group.memberNames.map((nameEng) => {
      const row = byKey.get(findLooseNameKey(nameEng));
      return { nameEng, uk: row?.name ?? null, type: row?.type ?? null };
    });
    const record = {
      key: group.key,
      engName: group.engName,
      source: group.source,
      edition,
      words: group.words,
      sourceSections: group.sourceSections,
      members,
      references: collectReferences(group.entries, group.engName, byKey),
      markdown: renderLoreEntriesToMarkdown(group.entries, group.engName),
    };
    writeFileSync(join(outDir, edition, `${group.key}.json`), JSON.stringify(record, null, 2));
    index.push({ key: group.key, edition, engName: group.engName, words: group.words, members: members.length, unmatched: members.filter((m) => !m.uk).length });
  }
}
writeFileSync(join(outDir, "index.json"), JSON.stringify(index, null, 2));
console.log(`✅ ${index.length} груп у ${outDir}; істот без відповідника в каталозі: ${index.reduce((total, row) => total + row.unmatched, 0)}`);

function readOutDir(): string {
  const flagIndex = process.argv.indexOf("--out");
  const value = flagIndex === -1 ? undefined : process.argv[flagIndex + 1];
  if (!value) throw new Error("Вкажіть теку: --out <тека>");
  return value;
}

function collectReferences(entries: unknown[], context: string, byKey: Map<string, CatalogRow>) {
  const references = new Map<string, { kind: string; nameEng: string; uk: string | null }>();
  for (const text of collectStrings(entries)) {
    for (const reference of decomposeMarkup(text, context).references) {
      const key = findLooseNameKey(reference.nameEng);
      const uk = byKey.get(key)?.name ?? allRows.find((row) => findLooseNameKey(row.nameEng) === key)?.name ?? null;
      references.set(`${reference.kind}:${reference.nameEng}`, { kind: reference.kind, nameEng: reference.nameEng, uk });
    }
  }
  return [...references.values()];
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([key]) => key !== "images")
    .flatMap(([, nested]) => collectStrings(nested));
}
