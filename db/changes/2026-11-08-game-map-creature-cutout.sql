-- O51: майстер вибирає вигляд істоти з прозорою картинкою: токен у кружечку чи вирізана.
-- Лише додавання: розгорнутий код про колонку не знає й працює далі. false — нинішній вигляд.
BEGIN;

ALTER TABLE public.game_map_creature
  ADD COLUMN is_cutout boolean NOT NULL DEFAULT false;

COMMIT;
