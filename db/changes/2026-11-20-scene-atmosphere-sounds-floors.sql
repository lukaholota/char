-- Атмосфера, звуки й поверхи сцени (O52, KR52.12–52.14).
-- weather/tint — пресети, перелік тримає застосунок; ambience — [{key, volume}] шарів фонового звуку.
-- floors — [{id, name}], id поверху — його рівень (1 — над основною мапою, -1 — підвал); null — основна мапа.
ALTER TABLE game_scene ADD COLUMN IF NOT EXISTS weather varchar(12) NOT NULL DEFAULT 'none';
ALTER TABLE game_scene ADD COLUMN IF NOT EXISTS tint varchar(12) NOT NULL DEFAULT 'none';
ALTER TABLE game_scene ADD COLUMN IF NOT EXISTS ambience jsonb;
ALTER TABLE game_scene ADD COLUMN IF NOT EXISTS floors jsonb;
ALTER TABLE game_scene ADD COLUMN IF NOT EXISTS shown_floor smallint;

ALTER TABLE game_scene_object ADD COLUMN IF NOT EXISTS floor smallint;
ALTER TABLE game_scene_object ADD COLUMN IF NOT EXISTS aspect real NOT NULL DEFAULT 1;
ALTER TABLE game_scene_object DROP CONSTRAINT IF EXISTS game_scene_object_aspect_check;
ALTER TABLE game_scene_object ADD CONSTRAINT game_scene_object_aspect_check CHECK (aspect >= 0.05 AND aspect <= 20);
ALTER TABLE game_scene_object DROP CONSTRAINT IF EXISTS game_scene_object_width_cells_check;
ALTER TABLE game_scene_object ADD CONSTRAINT game_scene_object_width_cells_check CHECK (width_cells >= 0.25 AND width_cells <= 300);

ALTER TABLE game_scene_hero_token ADD COLUMN IF NOT EXISTS floor smallint;
ALTER TABLE game_map_creature ADD COLUMN IF NOT EXISTS floor smallint;

CREATE TABLE IF NOT EXISTS user_sound (
  user_sound_id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
  name varchar(40) NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 40),
  audio_key varchar(200) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_sound_user_id_idx ON user_sound (user_id);
