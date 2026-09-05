import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/// Ратифіковано 2026-09-02, і маркер лишається — див. `tests/content/unusual-nature-term.test.ts`.
/// Гола форма — та, за якою **не** йде маркер: саме вона розколола корпус на 39 і 15.
const UNMARKED = /Незвичайна природа(?!\{\{Unusual Nature\}\})/gu;
const MARKED = /Незвичайна природа\{\{Unusual Nature\}\}/gu;

export type TermCount = { marked: number; bare: number };

/// Гейт стоїть і на джерелах, і на каталозі: правити термін дозволено лише у файлі
/// ([Р33](../../docs/DECISIONS.md#р33)), а каталог доводить, що збірка правку донесла.
/// Обидва конвеєри разом — розкол пройшов саме по межі між ними.
const CATALOGS = [
  "src/lib/generated/creatures.json",
  "src/lib/generated/creatures2024.json",
] as const;

const BATCH_DIRECTORIES = [
  "data/aidedd/translations/monsters-2014",
  "data/aidedd/translations/monsters-2024",
  "data/5etools/translations/monsters-2014",
  "data/5etools/translations/monsters-2024",
] as const;

export function findUnmarkedUnusualNature(text: string): string[] {
  return text.match(UNMARKED) ?? [];
}

export function countUnusualNatureByCarrier(): Record<string, TermCount> {
  const counted: Record<string, TermCount> = {};
  for (const carrier of listCarriers()) counted[carrier] = countInCarrier(carrier);
  return counted;
}

function listCarriers(): string[] {
  return [...CATALOGS, ...BATCH_DIRECTORIES.flatMap(listBatchFiles)];
}

function listBatchFiles(directory: string): string[] {
  return readdirSync(join(process.cwd(), directory))
    .filter((entry) => entry.endsWith(".json"))
    .sort()
    .map((entry) => `${directory}/${entry}`);
}

function countInCarrier(carrier: string): TermCount {
  const text = readFileSync(join(process.cwd(), carrier), "utf-8");
  return {
    marked: (text.match(MARKED) ?? []).length,
    bare: findUnmarkedUnusualNature(text).length,
  };
}
