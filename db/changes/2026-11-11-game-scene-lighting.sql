-- O52 KR52.3: освітлення сцени, джерела світла, світло токенів і темний зір героя.
-- Лише додавання зі сталими типовими значеннями. Застосувати ДО релізу: новий код читає ці
-- колонки разом зі сценою й токенами. Нічого не прибирає, тож старий код працює й після SQL.
BEGIN;

ALTER TABLE public.game_scene
  ADD COLUMN lighting varchar(6) NOT NULL DEFAULT 'off'
    CONSTRAINT game_scene_lighting_check CHECK (lighting IN ('off', 'bright', 'dim', 'dark'));

CREATE TABLE public.game_scene_light (
  game_scene_light_id serial PRIMARY KEY,
  game_scene_id integer NOT NULL REFERENCES public.game_scene(game_scene_id) ON DELETE CASCADE,
  x real NOT NULL CHECK (x BETWEEN 0 AND 1),
  y real NOT NULL CHECK (y BETWEEN 0 AND 1),
  bright_feet smallint NOT NULL CHECK (bright_feet BETWEEN 0 AND 300),
  dim_feet smallint NOT NULL CHECK (dim_feet BETWEEN 0 AND 300),
  is_on boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX game_scene_light_scene_idx ON public.game_scene_light (game_scene_id);

-- Світло, яке несе токен, і ручна поправка темного зору героя (null — з листа).
ALTER TABLE public.game_scene_hero_token
  ADD COLUMN light_bright_feet smallint NOT NULL DEFAULT 0 CHECK (light_bright_feet BETWEEN 0 AND 300),
  ADD COLUMN light_dim_feet smallint NOT NULL DEFAULT 0 CHECK (light_dim_feet BETWEEN 0 AND 300),
  ADD COLUMN darkvision_feet smallint CHECK (darkvision_feet BETWEEN 0 AND 300);

ALTER TABLE public.game_map_creature
  ADD COLUMN light_bright_feet smallint NOT NULL DEFAULT 0 CHECK (light_bright_feet BETWEEN 0 AND 300),
  ADD COLUMN light_dim_feet smallint NOT NULL DEFAULT 0 CHECK (light_dim_feet BETWEEN 0 AND 300);

COMMIT;
