-- Натхнення стає лічильником із налаштуванням «стакається» — рішення власника 2026-09-13.
--
-- Правила обох редакцій кажуть «або є, або немає» (див. 2026-09-08-kr31.3-heroic-inspiration.sql),
-- але білдер навмисно гнучкий: столи, що дозволяють кілька натхнень, вмикають
-- `can_stack_heroic_inspiration` на персонажі. Вимкнене — лічильник тримається в 0..1, як у книзі.
-- Увімкнене — «+» на листі й кожен довгий відпочинок носія риси додають по одному.
--
-- Булева колонка з KR31.3 на прод так і не доїхала (main не деплоївся з 2026-08-16), тож
-- переносити нема чого і вікна між SQL і деплоєм немає: нові колонки й видалення старої — одним кроком.
-- Застосовано власником до робочої бази 2026-09-13, потім bun run db:pull.

ALTER TABLE "pers" ADD COLUMN IF NOT EXISTS "heroic_inspiration_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "pers" ADD COLUMN IF NOT EXISTS "can_stack_heroic_inspiration" BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pers_heroic_inspiration_count_non_negative') THEN
    ALTER TABLE "pers" ADD CONSTRAINT "pers_heroic_inspiration_count_non_negative" CHECK ("heroic_inspiration_count" >= 0);
  END IF;
END $$;

UPDATE "pers" SET "heroic_inspiration_count" = 1 WHERE "has_heroic_inspiration" AND "heroic_inspiration_count" = 0;

ALTER TABLE "pers" DROP COLUMN IF EXISTS "has_heroic_inspiration";
