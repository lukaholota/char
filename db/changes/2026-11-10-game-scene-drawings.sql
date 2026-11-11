-- O51: малюнки на мапі сцени — майстер і гравці малюють лінії пальцем.
-- Лише додавання таблиці. Застосувати ДО релізу: новий код читає малюнки разом зі сценою.
BEGIN;

CREATE TABLE public.game_scene_drawing (
  game_scene_drawing_id serial PRIMARY KEY,
  game_scene_id integer NOT NULL REFERENCES public.game_scene(game_scene_id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES public."user"(user_id) ON DELETE CASCADE,
  color varchar(8) NOT NULL CHECK (color IN ('red', 'amber', 'emerald', 'sky', 'violet', 'white')),
  width varchar(5) NOT NULL CHECK (width IN ('thin', 'bold')),
  -- [[x, y], ...] у частках ширини й висоти мапи, до 400 точок.
  points jsonb NOT NULL CHECK (jsonb_typeof(points) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX game_scene_drawing_scene_idx ON public.game_scene_drawing (game_scene_id);

COMMIT;
