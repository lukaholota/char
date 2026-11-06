BEGIN;

CREATE TABLE public.game_map_creature (
  game_map_creature_id serial PRIMARY KEY,
  game_session_id integer NOT NULL REFERENCES public.game_session(game_session_id) ON DELETE CASCADE,
  creature_key varchar(120) NOT NULL,
  ruleset public."Ruleset" NOT NULL,
  number smallint NOT NULL CHECK (number BETWEEN 1 AND 999),
  is_ally boolean NOT NULL DEFAULT false,
  token_x real,
  token_y real,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT game_map_creature_token_check CHECK (
    (token_x IS NULL) = (token_y IS NULL)
    AND (token_x IS NULL OR (token_x BETWEEN 0 AND 1 AND token_y BETWEEN 0 AND 1))
  )
);

CREATE INDEX game_map_creature_session_idx ON public.game_map_creature (game_session_id);

COMMIT;
