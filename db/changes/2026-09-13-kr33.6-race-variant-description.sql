-- KR33.6 — проза варіантів раси.
--
-- KR33.3 свідомо лишив `race_variant` без колонки: варіант у книзі здебільшого — модифікація
-- раси без власного тексту. Вимір 2026-09-13 показав виняток: 9 родоводів тифлінга MTF
-- (Asmodeus … Zariel) мають власну прозу. Власник 2026-09-13 погодив колонку.
-- Драконячі мітки ERLW, варіанти тифлінга SCAG і Human Variant лишаються NULL — прози в джерелі немає.
--
-- Порядок:
--   1) власник застосовує файл до робочої бази;
--   2) агент синкає spells_test через ./scripts/apply-db-change.sh;
--   3) bun run db:pull оновлює Prisma-клієнт, schema.prisma та db/schema.sql;
--   4) seed:catalog-prose-2014 і generate:races віддають поле в каталог.

ALTER TABLE "race_variant" ADD COLUMN IF NOT EXISTS "description" TEXT;

COMMENT ON COLUMN public.race_variant.description IS
  'Коротка проза варіанта раси для каталогу. NULL — опису немає.';
