import { writeFileSync } from "fs";
import { join } from "path";
import { MagicItemRecord } from "./build-magic-item-record";
import { buildRecords } from "./import-magic-items-2014";

const OUTPUT_PATH = join(process.cwd(), "db/changes/2026-08-22-o14-magic-items-batch-01.sql");

/// The owner applies SQL by hand (DECISIONS Р2, there are no migrations), so this writes a file and
/// never opens a connection. Matched items are UPDATEs — never DELETE + INSERT, because
/// `pers_magic_item` references `magic_item_id` and `magic_item_id` is a public URL.
function buildMagicItemsSql(): void {
  const records = buildRecords();
  const updates = records.filter((record) => !record.isNewToCatalog);
  const inserts = records.filter((record) => record.isNewToCatalog);

  const sql = [
    ...renderHeader(records.length, updates.length, inserts.length),
    "BEGIN;",
    "",
    ...updates.flatMap(renderUpdate),
    ...inserts.flatMap(renderInsert),
    ...renderSequenceFix(inserts),
    ...renderAssertions(records),
    "COMMIT;",
    "",
  ].join("\n");

  writeFileSync(OUTPUT_PATH, sql, "utf-8");
  console.log(`✅ ${OUTPUT_PATH}`);
  console.log(`   UPDATE ${updates.length}, INSERT ${inserts.length}`);
}

function renderHeader(total: number, updates: number, inserts: number): string[] {
  return [
    "-- O14 — магічні предмети з aidedd, партія 01. Applies by owner only.",
    "-- Не запускати через Prisma migrate / db push (docs/DECISIONS.md Р2).",
    "--",
    `-- ${total} предметів: ${updates} UPDATE наявних рядків, ${inserts} INSERT нових.`,
    "--",
    "-- ЩО ЦЕЙ СКРИПТ РОБИТЬ І ЧОГО НЕ РОБИТЬ:",
    "--   • переписує лише name, short_description, description, item_type, rarity,",
    "--     requires_attunement — тобто текст і класифікацію;",
    "--   • НЕ чіпає bonus_to_ac, bonus_to_saving_throws, weapon_proficiencies*,",
    "--     no_armor_or_shield_for_ac_bonus і звʼязок _MagicItemToSpell;",
    "--   • НЕ чіпає magic_item_id, бо це публічна адреса /magic-items/NNNN і на неї",
    "--     посилається pers_magic_item.",
    "--",
    "-- ПЕРЕД ЗАПУСКОМ: у базі зараз 248 рядків RULES_2014, а в каталозі 472. Рядки, яких",
    "-- у базі немає, цей скрипт НЕ створює — UPDATE по них просто не знайде рядка. Спершу",
    "-- має зійтися база й каталог (KR14.1), інакше частина партії мовчки не застосується.",
    "-- Перевірка внизу скрипта саме це й ловить: якщо оновилося менше за очікуване, транзакція падає.",
    "",
  ];
}

function renderUpdate(record: MagicItemRecord): string[] {
  return [
    `UPDATE public.magic_item SET`,
    `  name = ${quote(record.name)},`,
    `  short_description = ${quote(record.shortDescription)},`,
    `  description = ${quote(record.description)},`,
    `  item_type = ${quote(record.itemType)}::public."MagicItemType",`,
    `  rarity = ${quote(record.rarity)}::public."ItemRarity",`,
    `  requires_attunement = ${record.requiresAttunement}`,
    `WHERE magic_item_id = ${record.magicItemId} AND ruleset = 'RULES_2014'::public."Ruleset";`,
    "",
  ];
}

function renderInsert(record: MagicItemRecord): string[] {
  return [
    "INSERT INTO public.magic_item",
    "  (magic_item_id, name, eng_name, item_type, rarity, requires_attunement, description, short_description, ruleset)",
    "VALUES",
    `  (${record.magicItemId}, ${quote(record.name)}, ${quote(record.engName)},`,
    `   ${quote(record.itemType)}::public."MagicItemType", ${quote(record.rarity)}::public."ItemRarity",`,
    `   ${record.requiresAttunement}, ${quote(record.description)}, ${quote(record.shortDescription)},`,
    `   'RULES_2014'::public."Ruleset")`,
    "ON CONFLICT (magic_item_id) DO NOTHING;",
    "",
  ];
}

/// Explicit ids leave the sequence behind them, and the next autoincrement insert would collide.
function renderSequenceFix(inserts: MagicItemRecord[]): string[] {
  if (inserts.length === 0) return [];
  return [
    "SELECT setval('public.magic_item_magic_item_id_seq',",
    "  GREATEST((SELECT MAX(magic_item_id) FROM public.magic_item),",
    "           (SELECT last_value FROM public.magic_item_magic_item_id_seq)));",
    "",
  ];
}

function renderAssertions(records: MagicItemRecord[]): string[] {
  const ids = records.map((record) => record.magicItemId).join(", ");
  return [
    "DO $$",
    "DECLARE applied integer;",
    "BEGIN",
    `  SELECT count(*) INTO applied FROM public.magic_item`,
    `   WHERE magic_item_id IN (${ids}) AND ruleset = 'RULES_2014'::public."Ruleset";`,
    `  IF applied <> ${records.length} THEN`,
    `    RAISE EXCEPTION 'очікували % рядків партії, знайшли %', ${records.length}, applied;`,
    "  END IF;",
    "END $$;",
    "",
  ];
}

function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

buildMagicItemsSql();
