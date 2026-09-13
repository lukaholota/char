-- KR31.4 — механіка рис 2024: три числа, яким досі не було куди лягти.
--
-- Кожна колонка живе на `feature`, бо саме фічі збирає `collectActiveFeatures` у
-- `src/lib/logic/bonus-calculator.ts` — тим самим шляхом уже їдуть КЗ (`gives_ac`) і шкода
-- (`bonus_to_melee_damage`). Риса дає фічу, фіча несе число: нового каналу не заводиться.
--
-- speed_bonus            Speedy «Your Speed increases by 10 feet», Boon of Speed «by 30 feet».
-- initiative_proficiency Alert «When you roll Initiative, you can add your Proficiency Bonus».
--                        Булеве, а не число: у 2024 жодне інше джерело ініціативу не змінює —
--                        Feral Instinct і Remarkable Athlete дають перевагу, а не бонус.
-- bonus_hit_points       Boon of Fortitude «Your Hit Point maximum increases by 40». Плоске
--                        число поруч із наявним `bonus_hit_points_per_level` (Дворфська витривалість).
--
-- Порядок кроків:
--   1) власник застосовує цей файл до робочої бази;
--   2) bun run db:pull  → оновлює prisma/schema.prisma, клієнт і db/schema.sql;
--   3) bun run seed:feat-mechanics-2024:prod  → заповнює колонки даними 2024.
-- Клон spells_test синкає агент через ./scripts/apply-db-change.sh.

ALTER TABLE "feature" ADD COLUMN IF NOT EXISTS "speed_bonus" INTEGER;
ALTER TABLE "feature" ADD COLUMN IF NOT EXISTS "initiative_proficiency" BOOLEAN;
ALTER TABLE "feature" ADD COLUMN IF NOT EXISTS "bonus_hit_points" INTEGER;
