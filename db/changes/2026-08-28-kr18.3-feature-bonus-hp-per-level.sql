-- KR18.3 — owner apply only. Do not run through Prisma migrate/db push.
-- Підготовлено агентом, НЕ застосовано до робочої бази. Рішення власника: 2026-08-28.
--
-- «Максимум хітів зростає на N за кожен рівень» — механіка, якої в схемі немає взагалі.
-- Єдиний такий бонус, риса Здоровань [Tough], зашитий у код як `feat.name === Feats.TOUGH`;
-- Dwarven Toughness не реалізований ні у 2014, ні у 2024. KR18.3 закрив 2024 таблицею
-- правил у `src/rules/hit-points.ts` за `feature.eng_name` — це працює, але правильне місце
-- для числа — стовпець на самій фічі.
--
-- Стовпець nullable, як решта числових бонусів на `feature` (gives_ac, bonus_to_attack_roll):
-- NULL означає «фіча хітів не додає». Дані не чіпаються — значення розставляють сіди
-- (raceSeed2024 для DWARF_2024, subraceFeatureSeed для DWARF_HILL_2014).

BEGIN;

ALTER TABLE public.feature
  ADD COLUMN IF NOT EXISTS bonus_hit_points_per_level integer;

COMMENT ON COLUMN public.feature.bonus_hit_points_per_level IS
  'Скільки максимальних хітів фіча додає за кожен рівень персонажа. NULL — не додає.';

COMMIT;

-- Після застосування власником:
--   1. bun run db:pull
--   2. перевірити, що в prisma/schema.prisma з'явилося `bonusHitPointsPerLevel Int?`
--   3. агент замінює таблицю правил у src/rules/hit-points.ts на читання стовпця
--      і засіває значення: Dwarf: Dwarven Toughness (2024) = 1,
--      Dwarven Toughness (Hill Dwarf Subrace) = 1
--
-- УВАГА, це зміна поведінки 2014. Hill Dwarf зараз недодає 1 хіт за рівень; після
-- заповнення стовпця нові й підвищені персонажі рахуватимуться інакше, тож golden-файли
-- 2014 доведеться перезняти з UPDATE_GOLDEN. Уже створені 8 344 персонажі не зміняться —
-- їхній max_hp лежить у `pers` як число і заднім числом не перераховується.
