-- Юань-ті (MPMM, 2014): Загальна й ОДНА мова на вибір, а не дві (MPMM, «Мови»).
-- Сід (prisma/seed/raceSeed.ts) і згенеровані каталоги вже виправлені; ця правка вирівнює базу.
-- Лише дані, DDL немає; після застосування — `bun run db:pull`, щоб оновився дамп.
-- Очікування: перший SELECT — 1 рядок із 2; UPDATE 1; другий SELECT — 1 рядок з 1. Повторний запуск дає UPDATE 0.
-- Уже створених юань-ті не чіпає: їхні мови лишаються, як обрано.
-- Перевірено в BEGIN…ROLLBACK на локальній тестовій базі.

BEGIN;

SELECT race_id, name::text AS race_name, ruleset::text AS ruleset, languages_to_choose_count
FROM race
WHERE name::text = 'YUAN_TI_MPMM' AND ruleset = 'RULES_2014';

UPDATE race
SET languages_to_choose_count = 1
WHERE name::text = 'YUAN_TI_MPMM' AND ruleset = 'RULES_2014' AND languages_to_choose_count = 2;

SELECT race_id, name::text AS race_name, ruleset::text AS ruleset, languages_to_choose_count
FROM race
WHERE name::text = 'YUAN_TI_MPMM' AND ruleset = 'RULES_2014';

COMMIT;
