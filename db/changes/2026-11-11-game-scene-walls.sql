-- O52 KR52.2: стіни й двері сцени — ламані, що закривають зір у сценах зі світлом.
-- Лише додавання таблиці. Застосувати ДО релізу: новий код читає стіни разом зі сценою.
BEGIN;

CREATE TABLE public.game_scene_wall (
  game_scene_wall_id serial PRIMARY KEY,
  game_scene_id integer NOT NULL REFERENCES public.game_scene(game_scene_id) ON DELETE CASCADE,
  kind varchar(4) NOT NULL CHECK (kind IN ('wall', 'door')),
  is_open boolean NOT NULL DEFAULT false,
  -- [[x, y], ...] у частках мапи: стіна 2–40 точок, двері рівно 2.
  points jsonb NOT NULL CHECK (jsonb_typeof(points) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX game_scene_wall_scene_idx ON public.game_scene_wall (game_scene_id);

COMMIT;
