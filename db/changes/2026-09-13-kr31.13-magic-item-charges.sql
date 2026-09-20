-- KR31.13 / L10-sheet-config-06 — ручний лічильник зарядів магічного предмета на листі.
--
-- Рішення власника 2026-09-13: «ручний лічильник». Максимум вписує гравець, витрачає й повертає
-- кнопками −/+; відновлення на світанку кидається за столом, автоматики немає. Обидва стовпці
-- порожні, поки гравець не задав максимум, — предмет без зарядів нічого не показує.
--
-- Порядок: власник застосовує файл до робочої бази ДО деплою коду, що їх читає, потім bun run db:pull.
-- Старий код на проді нових стовпців не помічає, тож вікна немає.

ALTER TABLE "pers_magic_item" ADD COLUMN IF NOT EXISTS "charges_max" INTEGER;
ALTER TABLE "pers_magic_item" ADD COLUMN IF NOT EXISTS "charges_current" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pers_magic_item_charges_within_max') THEN
    ALTER TABLE "pers_magic_item" ADD CONSTRAINT "pers_magic_item_charges_within_max" CHECK (
      ("charges_max" IS NULL AND "charges_current" IS NULL)
      OR ("charges_max" > 0 AND "charges_current" BETWEEN 0 AND "charges_max")
    );
  END IF;
END $$;
