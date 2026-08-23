-- ЗАМІНЕНО СІДОМ. НЕ ЗАПУСКАТИ. Файл лишено як надгробок, бо початкова версія
-- розійшлася по чатах, і без цієї заглушки її колись застосують удруге.
--
-- Партія 01 O14 (30 предметів) переїхала у prisma/seed/magic-items/batch-01.json,
-- який читає prisma/seed/magicItemSeed.ts. Застосовується так:
--
--   bun run seed:magic-items:test    -- перевірка на клоні
--   bun run seed:magic-items:prod    -- застосовує ВЛАСНИК
--
-- Чому переїхало: db/changes/ за docs/DECISIONS.md Р2 — це журнал змін СХЕМИ,
-- не replayable і не для контенту. Разовий SQL не має ідемпотентності, не має
-- історії й не переживає наступну партію. Конвеєр для решти ~443 предметів
-- описано в prisma/seed/magic-items/README.md.
--
-- Що змінилося проти цього SQL при переїзді:
--   • Ammunition +1, +2, or +3 (id 1308) НЕ створюється. Каталог тримає три окремі
--     записи — Ammunition +1 (93, UNCOMMON), +2 (94, RARE), +3 (95, VERY_RARE) —
--     і злитий четвертий запис показав би на /magic-items дубль без вибору рівня.
--     Слуг aidedd ammunition-1-2-or-3 позначено покритим у magicItemBatches.ts.
--   • Unbreakable Arrow (id 1304) створюється, як і планувалося. Каталог 472 → 473.
--   • Текст 29 предметів перенесено дослівно, без правок.

DO $$
BEGIN
  RAISE EXCEPTION 'Цей файл замінено сідом prisma/seed/magic-items/batch-01.json. Дивись bun run seed:magic-items:prod.';
END $$;
