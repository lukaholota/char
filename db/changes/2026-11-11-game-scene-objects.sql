-- O52 KR52.4: обʼєкти на мапі сцени — картинки з бібліотеки майстра, без хітів і ініціативи.
-- Лише додавання таблиці. Застосувати ДО релізу: новий код читає обʼєкти разом зі сценою.
-- image_key без зовнішнього ключа: згодом він вказуватиме й на базовий набір; видалення
-- зображення з бібліотеки майстра прибирає його обʼєкти в коді (deleteTokenImage).
BEGIN;

CREATE TABLE public.game_scene_object (
  game_scene_object_id serial PRIMARY KEY,
  game_scene_id integer NOT NULL REFERENCES public.game_scene(game_scene_id) ON DELETE CASCADE,
  image_key varchar(200) NOT NULL,
  name varchar(40),
  x real NOT NULL CHECK (x BETWEEN 0 AND 1),
  y real NOT NULL CHECK (y BETWEEN 0 AND 1),
  -- Ширина в клітинках; без сітки — в умовних клітинках по 1/20 ширини мапи.
  width_cells real NOT NULL DEFAULT 1 CHECK (width_cells BETWEEN 0.25 AND 40),
  rotation smallint NOT NULL DEFAULT 0 CHECK (rotation BETWEEN 0 AND 359),
  is_hidden boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX game_scene_object_scene_idx ON public.game_scene_object (game_scene_id);
CREATE INDEX game_scene_object_image_idx ON public.game_scene_object (image_key);

COMMIT;
