BEGIN;

ALTER TABLE public.game_roll_event DROP CONSTRAINT game_roll_event_visibility_check;
ALTER TABLE public.game_roll_event ADD CONSTRAINT game_roll_event_visibility_check
  CHECK (visibility IN ('PUBLIC', 'GM', 'SELF', 'SECRET'));

COMMIT;
