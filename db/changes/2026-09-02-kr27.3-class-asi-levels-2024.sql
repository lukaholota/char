-- KR27.3 — owner apply only. Не проганяти через Prisma migrate / db push.
-- ЗАСТОСОВАНО власником 2026-09-02, `bun run db:pull` прогнано того ж дня. Перевірено читанням
-- робочої бази: рівно два рядки відрізняються від [4, 8, 12, 16] — FIGHTER_2024 і ROGUE_2024.
--
-- Рівні підвищення характеристик (ASI) Воїна й Пройдисвіта 2024. Усі тринадцять класів 2024
-- були засіяні з `[4, 8, 12, 16]`, а SRD 5.2.1 (data/2024/srd/classes.md) каже:
--
--   Fighter  «You gain this feature again at Fighter levels 6, 8, 12, 14, and 16»  → 4, 6, 8, 12, 14, 16
--   Rogue    «You gain this feature again at Rogue levels 8, 10, 12, and 16»       → 4, 8, 10, 12, 16
--
-- Решта одинадцять класів 2024 — «levels 8, 12, and 16», тобто `[4, 8, 12, 16]`, як і було.
-- 19-й рівень у 2024 — Епічний дар (`epic_boon_level`), не ASI, тому в масиві його немає;
-- у класів 2014 він є, і їх цей файл не чіпає.
--
-- Джерело виправлено у файлі (Р33): data/2024/normalized/classes.json, поле
-- `abilityScoreImprovementLevels`; `spells_test` перелито `bun run seed:2024:test --only classes`.
-- Для робочої бази — цей UPDATE замість повного пересіву класів: сід у брудному дереві несе ще й
-- `weapon_mastery_progression` та `weapon_proficiencies_special` (KR18.6), і його запуск проти
-- робочої бази — окреме рішення, не частина цього KR.
--
-- Персонажів 2024 у робочій базі нуль (виміряно 2026-09-01), тож рядки `pers` не зачіпаються.
-- Повторний запуск ідемпотентний. Після застосування — `bun run db:pull` не потрібен (схема не
-- змінюється), але потрібна регенерація `src/lib/generated/creator-content-2024.json`
-- (`bun run generate:creator-content`), бо левелап читає класи з файлу, а не з бази.

UPDATE public.class
SET ability_score_up_levels = ARRAY[4, 6, 8, 12, 14, 16]
WHERE eng_name = 'FIGHTER_2024' AND ruleset = 'RULES_2024';

UPDATE public.class
SET ability_score_up_levels = ARRAY[4, 8, 10, 12, 16]
WHERE eng_name = 'ROGUE_2024' AND ruleset = 'RULES_2024';

-- Перевірка: рівно два рядки відрізняються від [4, 8, 12, 16], і це воїн та пройдисвіт.
SELECT eng_name, ability_score_up_levels
FROM public.class
WHERE ruleset = 'RULES_2024' AND ability_score_up_levels <> ARRAY[4, 8, 12, 16]
ORDER BY eng_name;
