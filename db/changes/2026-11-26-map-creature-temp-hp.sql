-- Тимчасові хіти істоти на мапі: шкода спершу знімає їх, потім звичайні хіти.
BEGIN;

ALTER TABLE game_map_creature
  ADD COLUMN hp_temp smallint DEFAULT 0 NOT NULL,
  ADD CONSTRAINT game_map_creature_hp_temp_check CHECK (hp_temp >= 0 AND hp_temp <= 9999);

COMMIT;
