import { readFileSync } from "fs";
import { join } from "path";
import { ItemRarity, MagicItemType, PrismaClient, Ruleset } from "@prisma/client";
import { MAGIC_ITEM_SEQUENCE_RESET_SQL, isReserved2024Id } from "./magicItemIds";

/**
 * Магічні предмети 2024: файл каталогу → таблиця `magic_item`.
 *
 * Джерело істини — `data/2024/normalized/magic-items.json` ([Р28]); таблиця йому відповідає,
 * а не навпаки. Сід тільки ДОДАЄ й ОНОВЛЮЄ: жодного DELETE, жодного TRUNCATE. Предмет,
 * вдягнений персонажем, зникнути не може — це умова готовності, а не побажання.
 *
 * Ключ — пара (engName, ruleset). `updateMany` + `createMany` замість `upsert` свідомо:
 * складений унікальний ключ зʼявиться в `prisma/schema.prisma` лише після того, як власник
 * накладе db/changes/2026-08-29-kr12.5-magic-item-unique-per-ruleset.sql і хтось прожене
 * `db:pull`. Сід, який до того не компілюється, не можна ні прогнати на клоні, ні покрити тестом.
 */

const CATALOG_PATH = join(process.cwd(), "data", "2024", "normalized", "magic-items.json");
const RULESET: Ruleset = "RULES_2024";

export type CatalogMagicItem2024 = {
  magicItemId: number;
  engName: string;
  name: string;
  itemType: MagicItemType;
  rarity: ItemRarity;
  requiresAttunement: boolean;
  description: string;
  shortDescription: string | null;
};

type MagicItemColumns = Omit<CatalogMagicItem2024, "magicItemId" | "engName">;

export type MagicItemSeedReport = {
  created: number;
  updated: number;
  unchanged: number;
};

export const seedMagicItems2024 = async (prisma: PrismaClient): Promise<MagicItemSeedReport> => {
  const items = buildMagicItemCorpus2024();
  console.log(`🧪 Магічні предмети 2024: ${items.length} записів каталогу...`);

  const stored = await findStoredItems(prisma);
  const created = await addMissingItems(prisma, items, stored);
  const updated = await updateChangedItems(prisma, items, stored);

  await prisma.$executeRawUnsafe(MAGIC_ITEM_SEQUENCE_RESET_SQL);

  const report = { created, updated, unchanged: items.length - created - updated };
  console.log(`✅ Магічні предмети 2024: додано ${created}, оновлено ${updated}, без змін ${report.unchanged}.`);
  return report;
};

async function findStoredItems(prisma: PrismaClient): Promise<Map<string, CatalogMagicItem2024>> {
  const rows = await prisma.magicItem.findMany({
    where: { ruleset: RULESET },
    select: {
      magicItemId: true,
      engName: true,
      name: true,
      itemType: true,
      rarity: true,
      requiresAttunement: true,
      description: true,
      shortDescription: true,
    },
  });

  return new Map(rows.map((row) => [row.engName, row]));
}

/// `createMany` замість 445 окремих вставок: прогін по одному рядку через тунель до робочої
/// бази вже падав на середині з відкатом транзакції, лишивши каталог половинним.
async function addMissingItems(
  prisma: PrismaClient,
  items: readonly CatalogMagicItem2024[],
  stored: ReadonlyMap<string, CatalogMagicItem2024>,
): Promise<number> {
  const missing = items.filter((item) => !stored.has(item.engName));
  if (missing.length === 0) return 0;

  await prisma.magicItem.createMany({
    data: missing.map((item) => ({
      magicItemId: item.magicItemId,
      engName: item.engName,
      ruleset: RULESET,
      ...readColumns(item),
    })),
    skipDuplicates: true,
  });

  return missing.length;
}

/// Оновлюється тільки те, що справді розійшлося. Через це другий прогін поспіль не робить
/// жодного запису — саме це й означає «ідемпотентний», і саме це перевіряє тест.
async function updateChangedItems(
  prisma: PrismaClient,
  items: readonly CatalogMagicItem2024[],
  stored: ReadonlyMap<string, CatalogMagicItem2024>,
): Promise<number> {
  const changed = items.filter((item) => {
    const existing = stored.get(item.engName);
    return existing !== undefined && hasDifferentColumns(existing, item);
  });

  for (const item of changed) {
    await prisma.magicItem.updateMany({
      where: { engName: item.engName, ruleset: RULESET },
      data: readColumns(item),
    });
  }

  return changed.length;
}

function readColumns(item: CatalogMagicItem2024): MagicItemColumns {
  return {
    name: item.name,
    itemType: item.itemType,
    rarity: item.rarity,
    requiresAttunement: item.requiresAttunement,
    description: item.description,
    shortDescription: item.shortDescription,
  };
}

function hasDifferentColumns(stored: CatalogMagicItem2024, item: CatalogMagicItem2024): boolean {
  return (
    stored.name !== item.name ||
    stored.itemType !== item.itemType ||
    stored.rarity !== item.rarity ||
    stored.requiresAttunement !== item.requiresAttunement ||
    stored.description !== item.description ||
    (stored.shortDescription ?? null) !== item.shortDescription
  );
}

export const buildMagicItemCorpus2024 = (): CatalogMagicItem2024[] => {
  const rows = JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as Record<string, unknown>[];
  const items = rows.map(readCatalogRow);

  failOnIdOutsideReservedBlock(items);
  failOnRepeatedId(items);
  failOnRepeatedEngName(items);

  return items;
};

/// Значень за замовчуванням тут немає навмисно: предмет без типу, який тихо став
/// «Чудесним предметом», знайдеться не в сіді, а в персонажі через місяць.
function readCatalogRow(row: Record<string, unknown>): CatalogMagicItem2024 {
  const engName = readRequiredText(row.engName, "engName", "<без назви>");

  return {
    magicItemId: readRequiredId(row.magicItemId, engName),
    engName,
    name: readRequiredText(row.name, "name", engName),
    itemType: readEnumValue(row.itemType, MagicItemType, "itemType", engName),
    rarity: readEnumValue(row.rarity, ItemRarity, "rarity", engName),
    requiresAttunement: Boolean(row.requiresAttunement),
    description: readRequiredText(row.description, "description", engName),
    shortDescription: typeof row.shortDescription === "string" ? row.shortDescription : null,
  };
}

function readRequiredText(raw: unknown, field: string, itemLabel: string): string {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new Error(`${itemLabel}: у каталозі 2024 порожнє поле "${field}".`);
  }
  return raw;
}

function readRequiredId(raw: unknown, itemLabel: string): number {
  if (!Number.isInteger(raw)) throw new Error(`${itemLabel}: у каталозі 2024 немає magicItemId.`);
  return raw as number;
}

function readEnumValue<T extends Record<string, string>>(
  raw: unknown,
  allowed: T,
  field: string,
  itemLabel: string,
): T[keyof T] {
  if (typeof raw !== "string" || !Object.values<string>(allowed).includes(raw)) {
    throw new Error(`${itemLabel}: "${String(raw)}" — не значення енаму ${field}.`);
  }
  return raw as T[keyof T];
}

/// Id поза зарезервованим блоком сів би на предмет 2014 і перевісив би чужу річ на персонажі.
function failOnIdOutsideReservedBlock(items: readonly CatalogMagicItem2024[]): void {
  const intruders = items.filter((item) => !isReserved2024Id(item.magicItemId));
  if (intruders.length > 0) {
    throw new Error(`Поза блоком 2024: ${intruders.map(describeItem).join(", ")}`);
  }
}

function failOnRepeatedId(items: readonly CatalogMagicItem2024[]): void {
  const takenBy = new Map<number, string>();
  for (const item of items) {
    const owner = takenBy.get(item.magicItemId);
    if (owner) throw new Error(`magicItemId ${item.magicItemId} стоїть двічі: ${owner} і ${item.engName}.`);
    takenBy.set(item.magicItemId, item.engName);
  }
}

function failOnRepeatedEngName(items: readonly CatalogMagicItem2024[]): void {
  const seen = new Set<string>();
  const repeated = new Set(items.map((item) => item.engName).filter((engName) => !seen.add(engName)));
  if (repeated.size > 0) {
    throw new Error(`engName повторюється в каталозі 2024: ${[...repeated].join(", ")}`);
  }
}

function describeItem(item: CatalogMagicItem2024): string {
  return `${item.magicItemId} ${item.engName}`;
}
