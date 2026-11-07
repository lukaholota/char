-- O51: сітка й масштаб сцени, ручний туман війни й області заклинань на мапі.
-- Лише додавання: розгорнутий код про колонки й таблицю не знає й працює далі.
BEGIN;

-- Сітка — накладна координатна система поверх будь-якої картинки: скільки клітинок завширшки мапа
-- і зсув першої лінії в частках клітинки. NULL — масштаб ще не задано, відстаней і областей немає.
ALTER TABLE public.game_scene
  ADD COLUMN grid_columns real CHECK (grid_columns BETWEEN 2 AND 300),
  ADD COLUMN grid_offset_x real NOT NULL DEFAULT 0 CHECK (grid_offset_x >= 0 AND grid_offset_x < 1),
  ADD COLUMN grid_offset_y real NOT NULL DEFAULT 0 CHECK (grid_offset_y >= 0 AND grid_offset_y < 1),
  ADD COLUMN is_grid_visible boolean NOT NULL DEFAULT true,
  -- {"areas":[{"r":true,"x":0.1,"y":0.2,"w":0.3,"h":0.1}, ...]}: усе сховано, далі прямокутники по черзі відкривають або ховають.
  -- NULL — туману немає.
  ADD COLUMN fog jsonb;

CREATE TABLE public.game_scene_area (
  game_scene_area_id serial PRIMARY KEY,
  game_scene_id integer NOT NULL REFERENCES public.game_scene(game_scene_id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES public."user"(user_id) ON DELETE CASCADE,
  shape varchar(8) NOT NULL CHECK (shape IN ('circle', 'cone', 'line', 'square')),
  size_feet smallint NOT NULL CHECK (size_feet BETWEEN 5 AND 500),
  origin_x real NOT NULL CHECK (origin_x BETWEEN 0 AND 1),
  origin_y real NOT NULL CHECK (origin_y BETWEEN 0 AND 1),
  angle real NOT NULL DEFAULT 0 CHECK (angle >= 0 AND angle < 360),
  label varchar(80),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX game_scene_area_scene_idx ON public.game_scene_area (game_scene_id);

COMMIT;
