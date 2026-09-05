/**
 * KR26.2 — стартове спорядження 13 класів 2024.
 *
 * Рядки не набиваються руками: їх будує розбір книжкового тексту
 * (`scripts/parse-2024-class-equipment.ts`), а цей модуль лише перекладає розібране в рядки
 * бази. Той самий розбір читає гейт-тест, тому «сід розійшовся з книгою» ловиться, а не
 * тримається на уважності того, хто набирав.
 */

import { PrismaClient, Prisma, Ruleset, ArmorCategory, WeaponCategory, EquipmentPackCategory, Classes } from "@prisma/client";
import { parseClassEquipment2024, type BookEntry } from "../../scripts/parse-2024-class-equipment";

const RULESET: Ruleset = "RULES_2024";

/// 2014 займає seed_index 1…113. Нумерація 2024 починається з 1001, а не зі 114: розрив лишає
/// місце дописати рядок 2014, не зіштовхнувши його з чужою редакцією по унікальному ключу.
const FIRST_SEED_INDEX = 1001;

export const seedClassEquipment2024 = async (prisma: PrismaClient) => {
  const rows = buildRowsFromBook();

  console.log(`🎒 Класове спорядження 2024: ${rows.length} рядків…`);
  await writeRows(prisma, rows);
  await verifyRowsMatchBook(prisma);
  console.log(`✅ Класове спорядження 2024: ${rows.length} рядків`);
};

export const buildRowsFromBook = (): Prisma.ClassStartingEquipmentOptionCreateInput[] => {
  let seedIndex = FIRST_SEED_INDEX;

  return parseClassEquipment2024().flatMap((cls) =>
    cls.options.flatMap((option) =>
      option.entries.map((entry) => ({
        seedIndex: seedIndex++,
        choiceGroup: 1,
        option: option.letter,
        ruleset: RULESET,
        class: { connect: { name_ruleset: { name: toClassEnum(cls.engName), ruleset: RULESET } } },
        ...toEquipmentFields(entry, cls.engName),
      }))
    )
  );
};

const writeRows = async (
  prisma: PrismaClient,
  rows: Prisma.ClassStartingEquipmentOptionCreateInput[]
) => {
  for (const row of rows) {
    await prisma.classStartingEquipmentOption.upsert({
      where: { seedIndex: row.seedIndex! },
      update: row,
      create: row,
    });
  }
};

/// Сід перевіряє себе сам: перечитує написане й звіряє з книгою ще раз. Без цього «запити не
/// впали» читалося б як «у базі те, що треба» — урок KR16.5.
const verifyRowsMatchBook = async (prisma: PrismaClient) => {
  const written = await prisma.classStartingEquipmentOption.findMany({
    where: { ruleset: RULESET },
    select: {
      option: true, quantity: true, item: true,
      class: { select: { name: true } },
      weapon: { select: { name: true } },
      armor: { select: { name: true } },
      equipmentPack: { select: { name: true, ruleset: true } },
    },
  });

  const wrong: string[] = [];
  const seen = new Map<string, number>();
  for (const row of written) {
    const key = `${row.class.name}|${row.option}|${describeRow(row)}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
    if (row.equipmentPack && row.equipmentPack.ruleset !== RULESET) {
      wrong.push(`${row.class.name}: набір ${row.equipmentPack.name} із редакції ${row.equipmentPack.ruleset}`);
    }
  }

  for (const cls of parseClassEquipment2024()) {
    for (const option of cls.options) {
      for (const entry of option.entries) {
        const fields = toEquipmentFields(entry, cls.engName);
        const key = `${toClassEnum(cls.engName)}|${option.letter}|${describeFields(fields)}`;
        const left = seen.get(key) ?? 0;
        if (left === 0) wrong.push(`${cls.engName} (${option.letter}): у базі немає «${entry.name}»`);
        else seen.set(key, left - 1);
      }
    }
  }

  for (const [key, extra] of seen) {
    if (extra > 0) wrong.push(`зайвий рядок у базі: ${key} ×${extra}`);
  }

  if (wrong.length > 0) {
    throw new Error(`Класове спорядження 2024 розійшлося з книгою:\n  ${wrong.join("\n  ")}`);
  }
};

type EquipmentFields = Partial<Prisma.ClassStartingEquipmentOptionCreateInput>;

const toEquipmentFields = (entry: BookEntry, engName: string): EquipmentFields => {
  const armor = ARMOR_IN_BOOK[entry.name];
  if (armor) return { armor: { connect: { name_ruleset: { name: armor, ruleset: RULESET } } }, quantity: entry.quantity };

  const weapon = WEAPON_IN_BOOK[entry.name];
  if (weapon) return { weapon: { connect: { name_ruleset: { name: weapon, ruleset: RULESET } } }, quantity: entry.quantity };

  const pack = PACK_IN_BOOK[entry.name];
  if (pack) return { equipmentPack: { connect: { name_ruleset: { name: pack, ruleset: RULESET } } }, quantity: entry.quantity };

  return { item: toItemName(entry, engName), quantity: entry.quantity };
};

/// Примітка в дужках звужує предмет до конкретного («Arcane Focus (crystal)»), тож вона
/// лишається в назві — інакше гравець не знає, що саме отримав.
const toItemName = (entry: BookEntry, engName: string): string => {
  const base = ITEM_IN_BOOK[entry.name];
  if (!base) throw new Error(`${engName}: немає перекладу для «${entry.name}»`);

  const note = entry.note ? NOTE_IN_BOOK[entry.note] : null;
  if (entry.note && !note) throw new Error(`${engName}: немає перекладу для примітки «${entry.note}»`);

  return note ? `${base} (${note})` : base;
};

const toClassEnum = (engName: string): Classes => {
  const name = `${engName.toUpperCase()}_2024`;
  if (!(name in Classes)) throw new Error(`немає класу ${name} в enum`);
  return name as Classes;
};

const describeRow = (row: {
  quantity: number; item: string | null;
  weapon: { name: string } | null; armor: { name: string } | null;
  equipmentPack: { name: string } | null;
}): string =>
  `${row.weapon?.name ?? row.armor?.name ?? row.equipmentPack?.name ?? row.item}×${row.quantity}`;

const describeFields = (fields: EquipmentFields): string => {
  const connected =
    (fields.weapon as { connect: { name_ruleset: { name: string } } } | undefined)?.connect.name_ruleset.name ??
    (fields.armor as { connect: { name_ruleset: { name: string } } } | undefined)?.connect.name_ruleset.name ??
    (fields.equipmentPack as { connect: { name_ruleset: { name: string } } } | undefined)?.connect.name_ruleset.name ??
    fields.item;
  return `${connected}×${fields.quantity}`;
};

const ARMOR_IN_BOOK: Record<string, ArmorCategory> = {
  "Leather Armor": "LEATHER",
  "Studded Leather Armor": "STUDDED_LEATHER",
  "Chain Shirt": "CHAIN_SHIRT",
  "Chain Mail": "CHAIN_MAIL",
  "Shield": "SHIELD",
};

const WEAPON_IN_BOOK: Record<string, WeaponCategory> = {
  "Greataxe": "GREATAXE",
  "Handaxes": "HANDAXE",
  "Dagger": "DAGGER",
  "Daggers": "DAGGER",
  "Mace": "MACE",
  "Sickle": "SICKLE",
  "Greatsword": "GREATSWORD",
  "Flail": "FLAIL",
  "Javelins": "JAVELIN",
  "Scimitar": "SCIMITAR",
  "Shortsword": "SHORTSWORD",
  "Longbow": "LONGBOW",
  "Shortbow": "SHORTBOW",
  "Longsword": "LONGSWORD",
  "Spear": "SPEAR",
};

const PACK_IN_BOOK: Record<string, EquipmentPackCategory> = {
  "Explorer's Pack": "EXPLORERS_PACK",
  "Entertainer's Pack": "ENTERTAINERS_PACK",
  "Priest's Pack": "PRIESTS_PACK",
  "Dungeoneer's Pack": "DUNGEONEERS_PACK",
  "Burglar's Pack": "BURGLARS_PACK",
  "Scholar's Pack": "SCHOLARS_PACK",
};

/// Українські форми — з ратифікованого перекладу глави спорядження
/// (`data/2024/rules-uk/`) і `dictionary.json`. Нових термінів тут не заводять.
const ITEM_IN_BOOK: Record<string, string> = {
  "GP": "зм",
  "Arrows": "Стріли",
  "Quiver": "Сагайдак",
  "Holy Symbol": "Священний символ",
  "Herbalism Kit": "Набір травника",
  "Thieves' Tools": "Інструменти злодія",
  "Tinker's Tools": "Інструменти лудильника",
  "Arcane Focus": "Містичне фокусування",
  "Druidic Focus": "Друїдське фокусування",
  "Book": "Книга",
  "Robe": "Мантія",
  "Spellbook": "Книга заклять",
  "Musical Instrument of your choice": "Музичний інструмент",
  "Artisan's Tools or Musical Instrument chosen for the tool proficiency above":
    "Інструменти ремісника або Музичний інструмент",
};

const NOTE_IN_BOOK: Record<string, string> = {
  "Quarterstaff": "палиця",
  "crystal": "кристал",
  "orb": "сфера",
  "sprig of mistletoe": "гілочка омели",
  "occult lore": "окультні знання",
};
