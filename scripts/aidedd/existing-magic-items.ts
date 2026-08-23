import { existsSync, readFileSync } from "fs";
import { join } from "path";

const CATALOG_PATH = join(process.cwd(), "src/lib/generated/magicItems.json");
const BASELINE_PATH = join(process.cwd(), "prisma/seed/magic-items/baseline.json");

/// The catalog file is generated from the database and is NOT in git, while the database holds
/// only 248 of its 472 rows — so a stray `generate:content` shrinks it with no way back.
/// Anything that pins public ids to it has to notice that, not quietly renumber the catalog.
const EXPECTED_CATALOG_SIZE = 472;

export type ExistingMagicItem = {
  magicItemId: number;
  engName: string;
  name: string;
  itemType: string;
  rarity: string;
  requiresAttunement: boolean;
  shortDescription: string | null;
};

export function readExistingMagicItems(): ExistingMagicItem[] {
  const items = readCatalogFile();
  if (items.length >= EXPECTED_CATALOG_SIZE) return items;

  throw new Error(
    `У ${CATALOG_PATH} лише ${items.length} предметів, очікували щонайменше ${EXPECTED_CATALOG_SIZE}. ` +
      `Найімовірніше, файл перезібрано з бази (там 248 рядків). Відновіть його з ${BASELINE_PATH} ` +
      "перед тим, як пінити публічні id — інакше 224 адреси /magic-items/NNNN зміняться."
  );
}

function readCatalogFile(): ExistingMagicItem[] {
  if (!existsSync(CATALOG_PATH)) {
    throw new Error(`Немає ${CATALOG_PATH} — каталог предметів не зібрано.`);
  }
  return JSON.parse(readFileSync(CATALOG_PATH, "utf-8")) as ExistingMagicItem[];
}

/// aidedd slugs drop apostrophes to hyphens ("charlatan-s-die") where ours drop them entirely
/// ("charlatans-die"), so nothing weaker than "letters and digits only" matches both.
export function toMatchKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function indexExistingByMatchKey<T extends ExistingMagicItem>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [toMatchKey(item.engName), item]));
}
