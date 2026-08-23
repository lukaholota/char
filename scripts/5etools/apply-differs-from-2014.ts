/**
 * KR16.2 — переписує `differsFrom2014` у data/2024/normalized/spells.json на обчислене значення.
 *
 *   npx tsx scripts/5etools/apply-differs-from-2014.ts          # показати, що зміниться
 *   npx tsx scripts/5etools/apply-differs-from-2014.ts --write   # записати
 *
 * `kind` не чіпається. З `note` знімається лише машинно згенерований рядок «Механічна зміна
 * проти 2014: …» там, де обчислення каже, що зміни не було: такий рядок описував не 2024, а
 * дефект нашого ж запису 2014. Ручні висновки (Greyhawk проти Forgotten Realms, «Divine Smite
 * у 2014 — фіча, а не заклинання») лишаються недоторканими.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { deriveDiffersFrom2014 } from "./differs-from-2014";

const CATALOG_PATH = "data/2024/normalized/spells.json";

type CatalogRow = Record<string, unknown> & {
  engName: string;
  differsFrom2014?: boolean;
  note?: string | null;
};

const GENERATED_NOTE_PREFIX = "Механічна зміна проти 2014:";

function applyDerivedFlags(): void {
  const path = join(process.cwd(), CATALOG_PATH);
  const catalog: CatalogRow[] = JSON.parse(readFileSync(path, "utf-8"));
  const derived = deriveDiffersFrom2014(catalog.map((row) => row.engName));

  const changes = derived.filter(
    (row, index) => catalog[index].differsFrom2014 !== row.differsFrom2014
  );

  console.log(`Записів: ${catalog.length}`);
  console.log(`Обчислено «змінилося»: ${derived.filter((row) => row.differsFrom2014).length}`);
  console.log(`Прапорець розходиться з обчисленим: ${changes.length}`);

  for (const change of changes) {
    const fields = change.isNewIn2024
      ? "нове в 2024"
      : change.mismatches.map((mismatch) => mismatch.field).join(", ") || "збігається";
    console.log(`  ${change.engName}: → ${change.differsFrom2014} (${fields})`);
  }

  const staleNotes = catalog.filter(
    (row, index) =>
      !derived[index].differsFrom2014 && (row.note ?? "").startsWith(GENERATED_NOTE_PREFIX)
  );
  console.log(`Нотаток про неіснуючу зміну: ${staleNotes.length}`);
  for (const row of staleNotes) console.log(`  ${row.engName}: «${row.note}» → знято`);

  if (!process.argv.includes("--write")) {
    console.log("\nЗапису не було. Додайте --write.");
    return;
  }

  derived.forEach((row, index) => {
    catalog[index].differsFrom2014 = row.differsFrom2014;
    if (!row.differsFrom2014 && (catalog[index].note ?? "").startsWith(GENERATED_NOTE_PREFIX)) {
      catalog[index].note = null;
    }
  });

  /// Без завершального переносу — так файл лежить у репозиторії, і його не варто «поліпшувати»
  /// заразом із виправленням прапорця.
  writeFileSync(path, JSON.stringify(catalog, null, 2), "utf-8");
  console.log(`\n✅ ${CATALOG_PATH} перезаписано.`);
}

try {
  applyDerivedFlags();
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
