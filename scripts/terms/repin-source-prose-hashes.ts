/**
 * Перепінити `descriptionHash` у KR17.6-маніфесті для записів, чий український опис
 * змінила термінологічна партія.
 *
 *   bunx tsx scripts/terms/repin-source-prose-hashes.ts
 *
 * Чіпає ТІЛЬКИ ті записи, де розійшовся саме description hash. Якщо маніфест має будь-яку
 * іншу розбіжність — класифікацію, source hash, незавершений запис — скрипт відмовляється
 * писати: такий дрейф означає змістову зміну, і його не можна гасити перепіном.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { findLooseNameKey } from "../5etools/schema";
import { buildSourceProseAudit } from "../5etools/source-prose-audit";
import {
  hashDescription,
  validateSourceProseManifest,
  type SourceProseAuditManifest,
} from "../5etools/source-prose-audit-manifest";

const MANIFEST_PATH = join(process.cwd(), "data/2024/audit/spell-source-prose-2024.json");
const CATALOG_PATH = join(process.cwd(), "data/2024/normalized/spells.json");
const STALE_HASH = /^(.+): застарілий description hash$/u;

function main(): void {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as SourceProseAuditManifest;
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf-8")) as {
    engName: string;
    description: string;
  }[];

  const issues = validateSourceProseManifest(manifest, buildSourceProseAudit(), catalog);
  const stale = collectStaleNames(issues);
  if (stale.length !== issues.length) {
    throw new Error(
      "Маніфест має розбіжності, які не є застарілим description hash — перепін заборонено:\n" +
        issues.filter((issue) => !STALE_HASH.test(issue)).map((issue) => `  ${issue}`).join("\n")
    );
  }

  const descriptions = new Map(
    catalog.map((spell) => [findLooseNameKey(spell.engName), spell.description])
  );
  for (const entry of manifest.entries) {
    if (!stale.includes(entry.engName)) continue;
    const description = descriptions.get(findLooseNameKey(entry.engName));
    if (description === undefined) throw new Error(`${entry.engName}: немає в каталозі 2024`);
    entry.descriptionHash = hashDescription(description);
  }

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  console.log(`✅ перепінено ${stale.length} description hash: ${stale.join(", ")}`);
}

function collectStaleNames(issues: string[]): string[] {
  return issues.flatMap((issue) => STALE_HASH.exec(issue)?.[1] ?? []);
}

main();
