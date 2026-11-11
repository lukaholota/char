-- O51: поворот і вільний масштаб токена прямо на мапі — для героя на сцені й для істоти.
-- Масштаб у відсотках множить розмір токена (клітинки й області лишаються за розміром істоти).
-- Лише додавання зі сталими типовими значеннями: розгорнутий код про колонки не знає й працює далі.
BEGIN;

ALTER TABLE public.game_map_creature
  ADD COLUMN token_rotation smallint NOT NULL DEFAULT 0
    CONSTRAINT game_map_creature_token_rotation_check CHECK (token_rotation BETWEEN 0 AND 359),
  ADD COLUMN token_scale_percent smallint NOT NULL DEFAULT 100
    CONSTRAINT game_map_creature_token_scale_percent_check CHECK (token_scale_percent BETWEEN 10 AND 1000);

ALTER TABLE public.game_scene_hero_token
  ADD COLUMN token_rotation smallint NOT NULL DEFAULT 0
    CONSTRAINT game_scene_hero_token_token_rotation_check CHECK (token_rotation BETWEEN 0 AND 359),
  ADD COLUMN token_scale_percent smallint NOT NULL DEFAULT 100
    CONSTRAINT game_scene_hero_token_token_scale_percent_check CHECK (token_scale_percent BETWEEN 10 AND 1000);

COMMIT;
