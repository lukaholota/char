-- KR27.6 — owner apply only. Не проганяти через Prisma migrate / db push.
-- ЗАСТОСОВАНО власником 2026-09-03. Перевірено читанням робочої бази: рівно два рядки 2024 —
-- ELDRITCH_KNIGHT і ARCANE_TRICKSTER, THIRD + INT.
--
-- Лицар-Чаклун і Таємний Пройдисвіт 2024 — третинні заклиначі з Інтелектом, як і їхні двійники
-- 2014 (ELDRITCH_KNIGHT / ARCANE_TRICKSTER 2014 несуть THIRD + INT). Усі 48 підкласів 2024 були
-- засіяні з `spellcasting_type = NONE`, тож `getEffectiveSpellcastingKind` давав NONE і підклас
-- додавав до рівня заклинача нуль, а не третину: №17 (Воїн 3 / Чарівник 5) отримував 5 замість 6,
-- №18 (Пройдисвіт 4 / Бард 4) — 4 замість 5 (виміряно в KR27.1).
--
-- Джерело виправлено у файлі (Р33): data/2024/normalized/subclasses.json, поля `spellcastingType`
-- і `primaryCastingStat` у двох записах; сід (prisma/seed/subclassSeed2024.ts) тепер їх читає.
-- `spells_test` перелито `bun run seed:2024:test --only subclasses`.
--
-- Решта 46 підкласів 2024 лишаються NONE: чаклування в них дає клас (`class.spellcasting_type`),
-- і рушій читає підклас лише тоді, коли клас не заклинач.
--
-- Персонажів 2024 у робочій базі нуль, тож рядки `pers` не зачіпаються. Повторний запуск
-- ідемпотентний. Після застосування — регенерація `src/lib/generated/creator-content-2024.json`
-- (`bun run generate:creator-content`): левелап бере підклас із файлу під час вибору, з бази —
-- коли підклас уже стоїть.

UPDATE public.subclass
SET spellcasting_type = 'THIRD', primary_casting_stat = 'INT'
WHERE ruleset = 'RULES_2024' AND name IN ('ELDRITCH_KNIGHT', 'ARCANE_TRICKSTER');

-- Перевірка: рівно два рядки 2024 з чаклуванням підкласу.
SELECT name, spellcasting_type, primary_casting_stat
FROM public.subclass
WHERE ruleset = 'RULES_2024' AND spellcasting_type <> 'NONE'
ORDER BY name;
