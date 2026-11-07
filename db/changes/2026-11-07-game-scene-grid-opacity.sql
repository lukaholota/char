-- O51: майстер задає непрозорість ліній сітки, гравці бачать ту саму.
-- Лише додавання: розгорнутий код про колонку не знає й працює далі. 0.35 — нинішній вигляд ліній.
BEGIN;

ALTER TABLE public.game_scene
  ADD COLUMN grid_opacity real NOT NULL DEFAULT 0.35 CHECK (grid_opacity BETWEEN 0.1 AND 1);

COMMIT;
