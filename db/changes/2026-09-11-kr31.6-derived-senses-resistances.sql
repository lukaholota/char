-- KR31.6 — похідні чуття й опори персонажа.
--
-- Риси вже збираються через `feature`, тож опір і Темнозір належать тому самому носію, а не
-- новій таблиці або парсеру прози. `damage_resistances` — точні значення чинного enum
-- `DamageType`; `darkvision_range` — дальність у футах. Калькулятор зводить усі дальності
-- максимумом, тому Темнозір ельфа 60 і родоводу дроу 120 дають один чинний результат 120.
--
-- Порядок:
--   1) власник застосовує файл до робочої бази;
--   2) bun run db:pull оновлює Prisma-клієнт, schema.prisma та db/schema.sql;
--   3) агент синкає spells_test через ./scripts/apply-db-change.sh;
--   4) сід записує дані фіч і додаються DB-гейти.

ALTER TABLE "feature"
  ADD COLUMN IF NOT EXISTS "damage_resistances" public."DamageType"[] NOT NULL DEFAULT ARRAY[]::public."DamageType"[];

ALTER TABLE "feature"
  ADD COLUMN IF NOT EXISTS "darkvision_range" INTEGER;

COMMENT ON COLUMN public.feature.damage_resistances IS
  'Типи шкоди, до яких активна риса дає опір. Порожній масив — опору немає.';

COMMENT ON COLUMN public.feature.darkvision_range IS
  'Дальність Темнозору, яку дає активна риса, у футах. NULL — Темнозір не надається.';
