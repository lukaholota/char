-- KR16.5 — owner apply only. Do not run through Prisma migrate/db push.
-- Підготовлено агентом, НЕ застосовано. Рішення власника: 2026-08-24.
--
-- ArmorCategory повторюється між RULES_2014 і RULES_2024, тому глобальна
-- унікальність `armor.name` не дає двом редакціям співіснувати. Усі FK
-- посилаються на armor_id, тож зміна індексу їх не зачіпає.

BEGIN;

DROP INDEX IF EXISTS public.armor_name_key;
DROP INDEX IF EXISTS public.armor_name_ruleset_key;

CREATE UNIQUE INDEX armor_name_ruleset_key
  ON public.armor USING btree (name, ruleset);

COMMIT;

-- Після застосування власником:
--   1. bun run db:pull
--   2. перевірити diff prisma/schema.prisma і db/schema.sql
--   3. відновити RULES_2014 PADDED та ідемпотентно засіяти 13 обладунків RULES_2024
--      окремим KR16.5 seed-прогоном спочатку на spells_test
