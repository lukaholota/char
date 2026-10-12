-- O49 хвиля 2, 2026-10-10: навички підкласів Клірика 1-го рівня, яких немає в каталозі 2014.
-- Файл для власника: SQL → власник застосовує → `bun run db:pull` → перегенерація каталогу.
-- Перевірено лише на локальній spells_test у BEGIN … ROLLBACK (у цьому файлі транзакція завершується COMMIT). Сід (prisma/seed/*.ts) не змінювали: після застосування потрібна відповідна правка сіда.

BEGIN;
-- Домен природи, «Послідовник природи» (PHB p.62): одна навичка на вибір із Поводження з тваринами, Природи, Виживання.
UPDATE feature
   SET skill_proficiencies = '{"options":["ANIMAL_HANDLING","NATURE","SURVIVAL"],"choiceCount":1}'::jsonb
 WHERE feature_id = 8495 AND eng_name = 'Acolyte of Nature' AND ruleset = 'RULES_2014' AND skill_proficiencies IS NULL;

-- Домен магії, «Арканний адепт» (SCAG p.125): володіння навичкою Магія.
UPDATE feature
   SET skill_proficiencies = '["ARCANA"]'::jsonb
 WHERE feature_id = 8447 AND eng_name = 'Arcane Initiate (Arcana Domain)' AND ruleset = 'RULES_2014' AND skill_proficiencies IS NULL;
COMMIT;
