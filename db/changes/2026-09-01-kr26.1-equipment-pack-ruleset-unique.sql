-- KR26.1 — ЗАСТОСОВАНО 2026-09-01 до spells_test і до робочої бази.
-- Ніякого prisma migrate / db push (Р2).
--
-- Виняток із правила «SQL до прода застосовує тільки власник»: власник попросив агента
-- застосувати цей файл сам і підтвердив після того, як йому назвали правило й наслідки.
-- scripts/apply-db-change.sh прод не бере (guard на суфікс), тож ішло прямим psql по
-- DATABASE_URL з .env — саме цим файлом, щоб db/changes/ лишався правдивим логом.
-- Спека: docs/o26-starting-equipment-2024/kr26.1-equipment-packs-by-ruleset.md
--
-- EquipmentPackCategory повторюється між RULES_2014 і RULES_2024, а вміст набору книга 2024
-- переписала: у наборі мандрівника зникло приладдя кухаря й додалися дві фляги олії, у
-- підземному — шипи-часник. При глобальній унікальності `equipment_pack.name` другий рядок
-- тієї самої категорії не вставиться, тож колонка `ruleset` там сьогодні марна.
--
-- Це та сама зміна, яку KR16.5 зробила для `armor`, і робиться так само.
--
-- Що це НЕ чіпає: жодного рядка даних. Усі десять наявних наборів уже мають
-- ruleset = RULES_2014 (дефолт колонки), тож нова унікальна пара для них виконується
-- без єдиного UPDATE. FK `class_starting_equipment_option.equipment_pack_id` дивиться на
-- equipment_pack_id, а не на name, — зміна індексу його не зачіпає.
--
-- Увага: `equipment_pack_name_key` — це UNIQUE INDEX, а не CONSTRAINT (db/schema.sql:5006),
-- тому DROP INDEX, а не DROP CONSTRAINT.

BEGIN;

DROP INDEX IF EXISTS public.equipment_pack_name_key;
DROP INDEX IF EXISTS public.equipment_pack_name_ruleset_key;

CREATE UNIQUE INDEX equipment_pack_name_ruleset_key
  ON public.equipment_pack USING btree (name, ruleset);

COMMIT;

-- Що зроблено слідом, тим самим заходом:
--   1. bun run db:pull — на EquipmentPack зник `name @unique`, зʼявився
--      @@unique([name, ruleset]), як уже стоїть на Armor
--   2. prisma/seed/classEquipmentSeed.ts: 27 звʼязків
--      `equipmentPack: { connect: { name: … } }` переведені на
--      `{ name_ruleset: { name: …, ruleset: ACTIVE_RULESET } }` — без bare-unique `name` цей
--      вхід зникає з клієнта, і сід 2014 інакше не компілюється (27 помилок TS2322).
--
-- Набори 2024 в робочу базу цим KR НЕ сіялися — тільки структура. Рядки приїдуть у KR26.2.
