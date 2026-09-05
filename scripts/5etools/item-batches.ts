import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { MagicItemKind, MagicItemRarity } from "../aidedd/magic-item-schema";
import { MagicItemBatchRow } from "../../prisma/seed/magicItemBatches";
import { SourceItemVariant, readSourceItemVariant } from "./source-item";
import { SourceItem, findLooseNameKey, readItems, readMagicVariants } from "./schema";

export const ITEM_PLAN_PATH = join(process.cwd(), "data/5etools/item-batches.json");
export const ITEM_TRANSLATIONS_DIR = join(
  process.cwd(),
  "data/5etools/translations/magic-items-2014"
);

export type ItemBatchRowStatus = "ready" | "blocked-term";

/// Один рядок каталогу. `pinned` — записи корпусу, з яких він складається: зазвичай один,
/// але родина `+1/+2/+3` і татуювання за рівнем дають три-шість. Книга друкує таку родину
/// одним записом із таблицею рідкості, і маніфест тримає на неї один `magicItemId`, тож
/// каталог теж лишається одним рядком.
export type ItemBatchRow = {
  nameEng: string;
  slug: string;
  magicItemId: number;
  isNewToCatalog: boolean;
  pinned: Array<{ nameEng: string; source: string }>;
  /// Порожньо — рідкість береться з джерела. Заповнюється лише там, де джерело каже
  /// «varies» або де записів кілька й вони різної рідкості; причина обовʼязкова.
  rarity: MagicItemRarity | "";
  rarityReason: string;
  status: ItemBatchRowStatus;
  /// Названий словниковий blocker. Порожньо для `ready`; для `blocked-term` — обовʼязковий.
  blocker: string;
};

export type ItemBatchPlan = {
  batchSize: number;
  revision: string;
  batches: Array<{ batch: number; items: ItemBatchRow[] }>;
};

export type ItemTranslation = {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
};

export function readItemPlan(): ItemBatchPlan {
  return JSON.parse(readFileSync(ITEM_PLAN_PATH, "utf-8")) as ItemBatchPlan;
}

export function readItemBatchRows(batch: number): ItemBatchRow[] {
  const found = readItemPlan().batches.find((entry) => entry.batch === batch);
  if (!found) throw new Error(`У плані немає партії ${batch}`);
  return found.items;
}

export function findItemTranslationPath(batch: number): string {
  return join(ITEM_TRANSLATIONS_DIR, `batch-${String(batch).padStart(2, "0")}.json`);
}

export function readItemTranslations(batch: number): ItemTranslation[] {
  const path = findItemTranslationPath(batch);
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf-8")) as ItemTranslation[];
}

/// Корпус 2014 одним читанням: `items.json` і `magicvariants.json` разом, бо рядок плану не
/// знає й не має знати, у якому з двох файлів лежить його предмет.
export function readItemCorpus(): SourceItem[] {
  return [...readItems(), ...readMagicVariants()].filter((item) => item.edition === "RULES_2014");
}

/// Назва **і** книга: `Armor of Gleaming` існує в XGE і в XDMG з різними сторінками, а
/// `Perfume of Bewitching` — у XGE і XDMG з різним текстом.
export function findPinnedVariants(row: ItemBatchRow, corpus: SourceItem[]): SourceItemVariant[] {
  return row.pinned.map((reference) => {
    const found = corpus.filter(
      (item) =>
        item.source === reference.source &&
        findLooseNameKey(item.nameEng) === findLooseNameKey(reference.nameEng)
    );
    if (found.length !== 1) {
      throw new Error(
        `${row.nameEng} › ${reference.nameEng} (${reference.source}): знайдено ${found.length} записів корпусу замість одного`
      );
    }
    return readSourceItemVariant(found[0]);
  });
}

/// Машинні поля рядка каталогу. Тип і налаштування беруться з першого пінованого запису —
/// у родині вони однакові, і розбіжність тут не гаситься мовчки, а валить збірку.
export function findItemFacts(row: ItemBatchRow, variants: SourceItemVariant[]): {
  itemType: MagicItemKind;
  rarity: MagicItemRarity;
  requiresAttunement: boolean;
} {
  failOnMixedFacts(row, variants);

  return {
    itemType: variants[0].itemType,
    rarity: findRarity(row, variants),
    requiresAttunement: variants[0].requiresAttunement,
  };
}

function failOnMixedFacts(row: ItemBatchRow, variants: SourceItemVariant[]): void {
  if (variants.length === 0) throw new Error(`${row.nameEng}: у плані немає жодного джерела`);

  const types = new Set(variants.map((variant) => variant.itemType));
  if (types.size !== 1) throw new Error(`${row.nameEng}: джерела дають різний тип (${[...types].join(", ")})`);

  const attunement = new Set(variants.map((variant) => variant.requiresAttunement));
  if (attunement.size !== 1) throw new Error(`${row.nameEng}: джерела розходяться в налаштуванні`);
}

function findRarity(row: ItemBatchRow, variants: SourceItemVariant[]): MagicItemRarity {
  const fromSource = new Set(variants.map((variant) => variant.rarity));

  if (row.rarity === "") {
    const only = [...fromSource][0];
    if (fromSource.size !== 1 || only === null) {
      throw new Error(
        `${row.nameEng}: джерело не дає однієї рідкості — впишіть її в план разом із причиною`
      );
    }
    return only;
  }

  if (!fromSource.has(row.rarity) && !fromSource.has(null)) {
    throw new Error(
      `${row.nameEng}: план каже рідкість ${row.rarity}, а джерело — ${[...fromSource].join("/")}`
    );
  }
  if (row.rarityReason.trim() === "") {
    throw new Error(`${row.nameEng}: рідкість задана планом без причини`);
  }
  return row.rarity;
}

/// Партія плану плюс партія перекладу → рядки, які читає сідер. Тут і тільки тут машинні поля
/// зустрічаються з текстом; переклад не може перебити ні тип, ні рідкість, ні налаштування.
export function buildItemSeedRows(batch: number, corpus: SourceItem[]): MagicItemBatchRow[] {
  const translations = readItemTranslations(batch);

  return readItemBatchRows(batch)
    .filter((row) => row.status === "ready")
    .map((row) => {
      const translation = translations.find((entry) => entry.slug === row.slug);
      if (!translation) throw new Error(`${row.nameEng}: у партії ${batch} немає перекладу «${row.slug}»`);

      const facts = findItemFacts(row, findPinnedVariants(row, corpus));

      return {
        magicItemId: row.magicItemId,
        engName: row.nameEng,
        slug: row.slug,
        name: translation.name,
        itemType: facts.itemType,
        rarity: facts.rarity,
        requiresAttunement: facts.requiresAttunement,
        shortDescription: translation.shortDescription,
        description: translation.description,
        isNewToCatalog: row.isNewToCatalog,
      };
    });
}
