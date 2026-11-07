-- Кілька сцен у кімнаті. Лише додавання: старі колонки лишаються й далі працюють для поточного коду.
-- Застосувати ДО деплою нового коду; після деплою — 2026-11-06-game-scenes-cleanup.sql.
BEGIN;

CREATE TABLE public.game_scene (
  game_scene_id serial PRIMARY KEY,
  game_session_id integer NOT NULL REFERENCES public.game_session(game_session_id) ON DELETE CASCADE,
  name varchar(60) NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 60),
  map_image_key varchar(200),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX game_scene_session_idx ON public.game_scene (game_session_id);

CREATE TABLE public.game_scene_token (
  game_scene_id integer NOT NULL REFERENCES public.game_scene(game_scene_id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES public."user"(user_id) ON DELETE CASCADE,
  token_x real NOT NULL CHECK (token_x BETWEEN 0 AND 1),
  token_y real NOT NULL CHECK (token_y BETWEEN 0 AND 1),
  PRIMARY KEY (game_scene_id, user_id)
);

ALTER TABLE public.game_session
  ADD COLUMN active_scene_id integer REFERENCES public.game_scene(game_scene_id) ON DELETE SET NULL;

ALTER TABLE public.game_session_member
  ADD COLUMN open_scene_id integer REFERENCES public.game_scene(game_scene_id) ON DELETE SET NULL;

ALTER TABLE public.game_map_creature
  ADD COLUMN game_scene_id integer REFERENCES public.game_scene(game_scene_id) ON DELETE CASCADE;

CREATE INDEX game_map_creature_scene_idx ON public.game_map_creature (game_scene_id);

-- backfill:start
WITH created AS (
  INSERT INTO public.game_scene (game_session_id, name, map_image_key, created_at)
  SELECT gs.game_session_id, 'Сцена 1', gs.map_image_key, gs.created_at
  FROM public.game_session gs
  WHERE NOT EXISTS (SELECT 1 FROM public.game_scene scene WHERE scene.game_session_id = gs.game_session_id)
    AND (gs.map_image_key IS NOT NULL OR EXISTS (SELECT 1 FROM public.game_map_creature creature WHERE creature.game_session_id = gs.game_session_id))
  RETURNING game_scene_id, game_session_id
), activated AS (
  UPDATE public.game_session gs SET active_scene_id = created.game_scene_id
  FROM created
  WHERE gs.game_session_id = created.game_session_id
  RETURNING gs.game_session_id
), placed_heroes AS (
  INSERT INTO public.game_scene_token (game_scene_id, user_id, token_x, token_y)
  SELECT created.game_scene_id, member.user_id, member.token_x, member.token_y
  FROM created
  JOIN public.game_session_member member ON member.game_session_id = created.game_session_id
  WHERE member.token_x IS NOT NULL AND member.token_y IS NOT NULL
  RETURNING 1
)
SELECT (SELECT count(*) FROM activated) AS activated_sessions, (SELECT count(*) FROM placed_heroes) AS placed_heroes;

UPDATE public.game_map_creature creature SET game_scene_id = gs.active_scene_id
FROM public.game_session gs
WHERE creature.game_session_id = gs.game_session_id AND creature.game_scene_id IS NULL AND gs.active_scene_id IS NOT NULL;
-- backfill:end

COMMIT;
