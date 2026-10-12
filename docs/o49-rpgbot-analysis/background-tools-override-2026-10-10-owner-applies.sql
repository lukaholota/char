-- O49, 2026-10-10: пропозиція для BUG-O49-BACKGROUND-TOOLS-DERIVED. Файл для власника: SQL → власник застосовує → `bun run db:pull`.
-- Агент у production нічого не виконував; перевірено лише на локальній spells_test (127.0.0.1:5433) у BEGIN … ROLLBACK.
-- NULL означає "інструменти передісторії беруться з каталогу" (поточна поведінка); масив рядків перекриває каталог для цього персонажа.
-- Код, що пише й читає колонку (collectOriginSources у pers-proficiencies.ts, createCharacter), ще не написаний: застосовувати SQL можна, поки код його не використовує, ніщо не зміниться.

BEGIN;
ALTER TABLE pers ADD COLUMN IF NOT EXISTS background_tool_proficiencies jsonb;
COMMENT ON COLUMN pers.background_tool_proficiencies IS 'Інструменти налаштованої передісторії (PHB Customizing a Background); NULL — брати з каталогу передісторії.';
COMMIT;
