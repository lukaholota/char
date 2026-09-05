-- KR27.8 — owner apply only. Не проганяти через Prisma migrate / db push.
-- Драконяча живучість 2024 — це альтернативна формула базового КЗ («10 + СПР + ХАР»), а такі
-- формули в цій схемі змодельовані рядком `armor`, як беззбройний захист монаха й варвара.
-- Формули 2014 із цим значенням не збігаються: там Драконяча живучість дає «13 + СПР», і її
-- вже несе NATURAL_ARMOR_13_DEX.
--
-- ALTER TYPE ... ADD VALUE не виконується всередині транзакції, тому файл іде окремим кроком,
-- а сам рядок `armor` доливає сід: bun run seed:armor-2024:prod.

ALTER TYPE public."ArmorCategory" ADD VALUE IF NOT EXISTS 'DRACONIC_RESILIENCE';

-- Перевірка: значення є в переліку.
SELECT unnest(enum_range(NULL::public."ArmorCategory")) AS value;
