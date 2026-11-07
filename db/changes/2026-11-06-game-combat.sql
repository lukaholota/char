BEGIN;

CREATE TABLE public.game_combatant (
  game_combatant_id serial PRIMARY KEY,
  game_session_id integer NOT NULL REFERENCES public.game_session(game_session_id) ON DELETE CASCADE,
  pers_id integer REFERENCES public.pers(pers_id) ON DELETE CASCADE,
  game_map_creature_id integer REFERENCES public.game_map_creature(game_map_creature_id) ON DELETE CASCADE,
  initiative smallint NOT NULL,
  initiative_bonus smallint NOT NULL,
  sort_tiebreak real NOT NULL DEFAULT random(),
  CONSTRAINT game_combatant_source_check CHECK ((pers_id IS NULL) <> (game_map_creature_id IS NULL)),
  CONSTRAINT game_combatant_session_pers_key UNIQUE (game_session_id, pers_id),
  CONSTRAINT game_combatant_creature_key UNIQUE (game_map_creature_id)
);

CREATE INDEX game_combatant_session_idx ON public.game_combatant (game_session_id);

ALTER TABLE public.game_session
  ADD COLUMN combat_round smallint,
  ADD COLUMN combat_turn smallint,
  ADD COLUMN combat_current_combatant_id integer REFERENCES public.game_combatant(game_combatant_id) ON DELETE SET NULL,
  ADD CONSTRAINT game_session_combat_check CHECK (
    (combat_round IS NULL) = (combat_turn IS NULL)
    AND (combat_round IS NULL OR (combat_round >= 1 AND combat_turn >= 0))
  );

COMMIT;
