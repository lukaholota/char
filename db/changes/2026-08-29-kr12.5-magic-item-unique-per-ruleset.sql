-- KR12.5 — owner apply only. Do not run through Prisma migrate/db push.
-- Підготовлено агентом 2026-08-29, НЕ застосовано до робочої бази. `spells_test` синкає агент.
--
-- Навіщо. Каталог 2024 показує 445 магічних предметів
-- (`data/2024/normalized/magic-items.json`), а в таблиці `magic_item` рядків RULES_2024 нуль —
-- виміряно `bun tsx scripts/measure-catalog-parity.ts --target test`. Наслідок не косметичний:
-- `pers_magic_item.magic_item_id` посилається на `magic_item` (FK, ON DELETE RESTRICT після
-- KR22.1), тобто персонаж 2024 не може вдягнути ЖОДНОГО предмета зі свого каталогу.
--
-- Чому сід сам цього не полагодить. Усі 445 назв 2024 збігаються з назвами 2014 — перетин
-- рівно 445 із 445, виміряно за нормалізованим `engName`. Індекс `magic_item_eng_name_key`
-- унікальний на всю таблицю, тому перший же `Adamantine Armor` редакції 2024 падає на
-- дублікаті. Це та сама форма дефекту, що D-001 (`Feature.engName` унікальний глобально) і
-- що KR16.5 в обладунках — і лікується так само.
--
-- Прецедент: db/changes/2026-08-24-kr16.5-armor-ruleset-unique.sql. Усі зовнішні ключі
-- дивляться на `magic_item_id`, а не на `eng_name`, тож зміна індексу їх не зачіпає і
-- жодного рядка `pers_magic_item` не рухає.

BEGIN;

DROP INDEX IF EXISTS public.magic_item_eng_name_key;
DROP INDEX IF EXISTS public.magic_item_eng_name_ruleset_key;

CREATE UNIQUE INDEX magic_item_eng_name_ruleset_key
  ON public.magic_item USING btree (eng_name, ruleset);

COMMIT;

-- Після застосування власником:
--   1. bun run db:pull
--   2. перевірити в prisma/schema.prisma, що на моделі MagicItem замість `@unique` на engName
--      стоїть `@@unique([engName, ruleset])`
--   3. bun run seed:magic-items-2024:prod — доливає 445 рядків RULES_2024 з
--      data/2024/normalized/magic-items.json. Сід тільки додає й оновлює: жодного DELETE,
--      жодного TRUNCATE ([Р28](../../docs/DECISIONS.md#р28))
--
-- `spells_test` синкає агент сам:
--   ./scripts/apply-db-change.sh db/changes/2026-08-29-kr12.5-magic-item-unique-per-ruleset.sql
