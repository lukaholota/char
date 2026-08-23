/**
 * KR16.2 — прибирає підкласи з переліку класів каталогу 2024.
 *
 *   npx tsx scripts/5etools/strip-subclasses-from-2024-classes.ts          # показати
 *   npx tsx scripts/5etools/strip-subclasses-from-2024-classes.ts --write   # записати
 *
 * Рішення власника 2026-08-23: у переліку класів 2024 лишаються тільки класи. Підкласові
 * розширені списки заклинань — механізм 2014 (TCE/XGE); у правилах 2024 його немає, і запис
 * «Коло землі» серед класів показував користувачу правило, якого в його редакції не існує.
 *
 * Заразом зводяться однакові рядки: 14 записів тримали той самий клас двічі.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { isBaseClass } from "./spell-facts";

const CATALOG_PATH = "data/2024/normalized/spells.json";

type CatalogRow = Record<string, unknown> & { engName: string; classes?: string[] };

function stripSubclasses(): void {
  const path = join(process.cwd(), CATALOG_PATH);
  const catalog: CatalogRow[] = JSON.parse(readFileSync(path, "utf-8"));

  const removed = new Map<string, number>();
  let touchedRows = 0;
  let deduped = 0;

  for (const row of catalog) {
    const before = row.classes ?? [];
    const kept = [...new Set(before.filter((name) => isBaseClass(name)))];
    if (kept.length === before.length) continue;

    deduped += before.filter((name) => isBaseClass(name)).length - kept.length;
    for (const name of before.filter((name) => !isBaseClass(name))) {
      removed.set(name, (removed.get(name) ?? 0) + 1);
    }

    row.classes = kept;
    touchedRows += 1;
  }

  const emptied = catalog.filter((row) => (row.classes ?? []).length === 0).map((r) => r.engName);

  console.log(`Записів зачеплено: ${touchedRows}`);
  console.log(`Прибрано підкласів: ${[...removed.values()].reduce((a, b) => a + b, 0)} (${removed.size} різних)`);
  console.log(`Прибрано повторів того самого класу: ${deduped}`);
  console.log(`Лишилося без класів: ${emptied.length}${emptied.length ? ` — ${emptied.join(", ")}` : ""}`);

  if (emptied.length > 0) {
    throw new Error("Запис не може лишитися без жодного класу — це втрата даних, а не чистка");
  }

  if (!process.argv.includes("--write")) {
    console.log("\nЗапису не було. Додайте --write.");
    return;
  }

  writeFileSync(path, JSON.stringify(catalog, null, 2), "utf-8");
  console.log(`\n✅ ${CATALOG_PATH} перезаписано.`);
}

try {
  stripSubclasses();
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
