/**
 * Партії перекладу O14: prisma/seed/magic-items/batch-NN.json накладаються на базовий
 * корпус із magic-items/baseline.json. Формат і конвеєр — prisma/seed/magic-items/README.md.
 */

import { ItemRarity, MagicItemType, Prisma } from "@prisma/client";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

/// Слуги aidedd, яким власного запису в каталозі не треба: текст уже стоїть на записах,
/// перелічених у значенні. Таких випадків два. Перший — сторінка ширша за наш запис:
/// вона об'єднує те, що в каталозі живе окремими варіантами (`weapon-1-2-or-3`). Другий —
/// сторінка вужча: Basic Rules друкують один варіант того, що SRD подає таблицею, і наш
/// запис уже містить його рядком (`ring-of-poison-resistance` ⊂ `Ring of Resistance`).
export const COVERED_BY_EXISTING_ENTRIES: Record<string, string[]> = {
  "ammunition-1-2-or-3": ["Ammunition +1", "Ammunition +2", "Ammunition +3"],
  "ring-of-poison-resistance": ["Ring of Resistance"],
  "rod-of-the-pact-keeper": [
    "Rod of the Pact Keeper +1",
    "Rod of the Pact Keeper +2",
    "Rod of the Pact Keeper +3",
  ],
  "armor-1-2-or-3": ["Armor +1", "Armor +2", "Armor +3"],
  "quaal-s-feather-token": [
    "Quaal's Feather Token (Anchor)",
    "Quaal's Feather Token (Bird)",
    "Quaal's Feather Token (Fan)",
    "Quaal's Feather Token (Swan Boat)",
    "Quaal's Feather Token (Tree)",
    "Quaal's Feather Token (Whip)",
  ],
  "shield-1-2-or-3": ["Shield +1", "Shield +2", "Shield +3"],
  "weapon-1-2-or-3": ["Weapon +1", "Weapon +2", "Weapon +3"],
  "wand-of-the-war-mage-1-2-or-3": [
    "Wand of the War Mage +1",
    "Wand of the War Mage +2",
    "Wand of the War Mage +3",
  ],
  "belt-of-giant-strength": [
    "Belt of Hill Giant Strength",
    "Belt of Stone Giant Strength",
    "Belt of Frost Giant Strength",
    "Belt of Fire Giant Strength",
    "Belt of Cloud Giant Strength",
    "Belt of Storm Giant Strength",
  ],
  "instrument-of-the-bards": [
    "Instrument of the Bards (Anstruth Harp)",
    "Instrument of the Bards (Canaith Mandolin)",
    "Instrument of the Bards (Cli Lyre)",
    "Instrument of the Bards (Doss Lute)",
    "Instrument of the Bards (Fochlucan Bandore)",
    "Instrument of the Bards (Mac-Fuirmidh Cittern)",
    "Instrument of the Bards (Ollamh Harp)",
  ],
  "ioun-stone": [
    "Ioun Stone (Absorption)",
    "Ioun Stone (Agility)",
    "Ioun Stone (Awareness)",
    "Ioun Stone (Fortitude)",
    "Ioun Stone (Greater Absorption)",
    "Ioun Stone (Insight)",
    "Ioun Stone (Intellect)",
    "Ioun Stone (Leadership)",
    "Ioun Stone (Mastery)",
    "Ioun Stone (Protection)",
    "Ioun Stone (Regeneration)",
    "Ioun Stone (Reserve)",
    "Ioun Stone (Strength)",
    "Ioun Stone (Sustenance)",
  ],
  "potion-of-giant-strength": [
    "Potion of Giant Strength (Hill)",
    "Potion of Giant Strength (Frost Giant)",
    "Potion of Giant Strength (Stone Giant)",
    "Potion of Giant Strength (Fire Giant)",
    "Potion of Giant Strength (Cloud Giant)",
    "Potion of Giant Strength (Storm Giant)",
  ],
  "potion-of-healing": [
    "Potion of Healing",
    "Potion of Greater Healing",
    "Potion of Superior Healing",
    "Potion of Supreme Healing",
  ],
  "spell-scroll": [
    "Spell Scroll (Cantrip)",
    "Spell Scroll (Level 1)",
    "Spell Scroll (Level 2)",
    "Spell Scroll (Level 3)",
    "Spell Scroll (Level 4)",
    "Spell Scroll (Level 5)",
    "Spell Scroll (Level 6)",
    "Spell Scroll (Level 7)",
    "Spell Scroll (Level 8)",
    "Spell Scroll (Level 9)",
  ],
};

/// Сторінки aidedd, які самі себе спростовують у рядку типу. Сюди потрапляє лише те, що
/// заперечує текст тієї самої сторінки: `Sword of Kas` підписано «Wondrous item», а перше
/// речення опису каже «a magic, sentient longsword», і каталог тримає його як зброю.
export const SOURCE_ITEM_TYPE_OVERRIDES: Record<string, string> = {
  "sword-of-kas": "WEAPON",
};

export type MagicItemBatchRow = {
  magicItemId: number;
  engName: string;
  slug: string;
  name: string;
  itemType: string;
  rarity: string;
  requiresAttunement: boolean;
  shortDescription: string;
  description: string;
  isNewToCatalog: boolean;
};

const BATCH_DIR = join(__dirname, "magic-items");

export function readMagicItemBatches(): MagicItemBatchRow[] {
  const rows: MagicItemBatchRow[] = [];

  for (const fileName of findBatchFileNames()) {
    const parsed = JSON.parse(readFileSync(join(BATCH_DIR, fileName), "utf-8")) as {
      items?: unknown;
    };
    if (!Array.isArray(parsed.items)) {
      throw new Error(`${fileName}: очікували масив items.`);
    }
    for (const item of parsed.items) rows.push(readBatchRow(item, fileName));
  }

  failOnDuplicates(rows);
  return rows;
}

export function applyBatchesToBaseline(
  baseline: Prisma.MagicItemUncheckedCreateInput[],
  batches: MagicItemBatchRow[],
): { items: Prisma.MagicItemUncheckedCreateInput[]; updated: number; added: number } {
  const byEngName = new Map(baseline.map((item) => [item.engName, item]));
  let updated = 0;
  let added = 0;

  for (const row of batches) {
    const translated = buildTranslatedItem(row);
    const existing = byEngName.get(row.engName);

    if (existing) {
      failOnIdDrift(row, existing);
      byEngName.set(row.engName, { ...existing, ...translated });
      updated += 1;
    } else {
      byEngName.set(row.engName, translated);
      added += 1;
    }
  }

  return { items: [...byEngName.values()], updated, added };
}

function buildTranslatedItem(row: MagicItemBatchRow): Prisma.MagicItemUncheckedCreateInput {
  return {
    magicItemId: row.magicItemId,
    engName: row.engName,
    name: row.name,
    itemType: row.itemType as MagicItemType,
    rarity: row.rarity as ItemRarity,
    requiresAttunement: row.requiresAttunement,
    shortDescription: row.shortDescription,
    description: row.description,
  };
}

function findBatchFileNames(): string[] {
  return readdirSync(BATCH_DIR)
    .filter((name) => /^batch-\d{2}\.json$/.test(name))
    .sort();
}

function readBatchRow(value: unknown, fileName: string): MagicItemBatchRow {
  const row = value as Partial<MagicItemBatchRow>;
  const missing = (["magicItemId", "engName", "slug", "name", "itemType", "rarity", "description"] as const)
    .filter((key) => row[key] === undefined || row[key] === "");

  if (missing.length > 0) {
    throw new Error(`${fileName}: у записі ${row.slug ?? "?"} бракує полів: ${missing.join(", ")}`);
  }
  if (!(row.itemType! in MagicItemType)) {
    throw new Error(`${fileName}: ${row.slug} має невідомий itemType «${row.itemType}».`);
  }
  if (!(row.rarity! in ItemRarity)) {
    throw new Error(`${fileName}: ${row.slug} має невідому rarity «${row.rarity}».`);
  }

  return {
    magicItemId: row.magicItemId!,
    engName: row.engName!,
    slug: row.slug!,
    name: row.name!,
    itemType: row.itemType!,
    rarity: row.rarity!,
    requiresAttunement: row.requiresAttunement === true,
    shortDescription: row.shortDescription ?? "",
    description: row.description!,
    isNewToCatalog: row.isNewToCatalog === true,
  };
}

function failOnDuplicates(rows: MagicItemBatchRow[]): void {
  const seenEngNames = new Set<string>();
  const seenIds = new Set<number>();

  for (const row of rows) {
    if (seenEngNames.has(row.engName)) {
      throw new Error(`Предмет «${row.engName}» трапляється у двох партіях.`);
    }
    if (seenIds.has(row.magicItemId)) {
      throw new Error(`magicItemId ${row.magicItemId} трапляється у двох партіях.`);
    }
    seenEngNames.add(row.engName);
    seenIds.add(row.magicItemId);
  }
}

function failOnIdDrift(row: MagicItemBatchRow, existing: Prisma.MagicItemUncheckedCreateInput): void {
  if (existing.magicItemId !== row.magicItemId) {
    throw new Error(
      `«${row.engName}»: партія каже magicItemId ${row.magicItemId}, каталог — ${existing.magicItemId}. ` +
        "Це публічна адреса /magic-items/NNNN, вона не перенумеровується.",
    );
  }
}
