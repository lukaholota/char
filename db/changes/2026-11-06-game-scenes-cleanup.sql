-- Застосувати ЛИШЕ ПІСЛЯ деплою коду зі сценами (старий код ще пише в game_session.map_image_key,
-- game_session_member.token_x/token_y і створює істот без сцени). Нічого з цього новий код не читає.
-- Спершу той самий ідемпотентний backfill: підхоплює кімнати й істот, створені старим кодом між SQL і деплоєм.
BEGIN;

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

-- Істоти без сцени після backfill — сироти (кімната без сцен), новий код їх не показує.
DELETE FROM public.game_map_creature WHERE game_scene_id IS NULL;

ALTER TABLE public.game_map_creature ALTER COLUMN game_scene_id SET NOT NULL;

ALTER TABLE public.game_session DROP COLUMN map_image_key;

ALTER TABLE public.game_session_member
  DROP COLUMN token_x,
  DROP COLUMN token_y;

COMMIT;
