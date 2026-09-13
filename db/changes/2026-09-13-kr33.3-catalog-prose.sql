-- KR33.3 — носій прози каталогів: опис класу, раси й підраси.
--
-- Колонка одна, без пари «коротко + повно»: власник 2026-09-09 обрав коротку прозу
-- (≈ 145 слів, два–три абзаци) як єдину форму. Порожнє значення — лише NULL, не "".
-- `race_variant` не чіпаємо: варіант у книзі — модифікація раси, а не стаття з прозою.
--
-- Порядок:
--   1) власник застосовує файл до робочої бази;
--   2) агент синкає spells_test через ./scripts/apply-db-change.sh;
--   3) bun run db:pull оновлює Prisma-клієнт, schema.prisma та db/schema.sql;
--   4) generate:classes і generate:races віддають поле в каталоги.

ALTER TABLE "class"   ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "race"    ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "subrace" ADD COLUMN IF NOT EXISTS "description" TEXT;

COMMENT ON COLUMN public.class.description IS
  'Коротка вступна проза класу для каталогу (≈145 слів). NULL — опису немає.';
COMMENT ON COLUMN public.race.description IS
  'Коротка вступна проза раси/виду для каталогу (≈145 слів). NULL — опису немає.';
COMMENT ON COLUMN public.subrace.description IS
  'Коротка проза підраси для каталогу. NULL — опису немає.';
