BEGIN;

CREATE TABLE public.game_session (
  game_session_id serial PRIMARY KEY,
  owner_user_id integer NOT NULL REFERENCES public."user"(user_id) ON DELETE CASCADE,
  name varchar(80) NOT NULL,
  invite_token varchar(64) UNIQUE,
  last_event_seq bigint NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX game_session_owner_idx ON public.game_session (owner_user_id);

CREATE TABLE public.game_session_member (
  game_session_member_id serial PRIMARY KEY,
  game_session_id integer NOT NULL REFERENCES public.game_session(game_session_id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES public."user"(user_id) ON DELETE CASCADE,
  role varchar(8) NOT NULL CHECK (role IN ('GM', 'PLAYER')),
  pers_id integer REFERENCES public.pers(pers_id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  UNIQUE (game_session_id, user_id)
);

CREATE INDEX game_session_member_user_idx ON public.game_session_member (user_id);

CREATE TABLE public.game_roll_event (
  game_roll_event_id bigserial PRIMARY KEY,
  game_session_id integer NOT NULL REFERENCES public.game_session(game_session_id) ON DELETE CASCADE,
  seq bigint NOT NULL,
  author_user_id integer REFERENCES public."user"(user_id) ON DELETE SET NULL,
  pers_id integer REFERENCES public.pers(pers_id) ON DELETE SET NULL,
  idempotency_key uuid NOT NULL,
  visibility varchar(8) NOT NULL CHECK (visibility IN ('PUBLIC', 'GM', 'SELF')),
  source varchar(16) NOT NULL CHECK (source IN ('CHARACTER', 'FREE', 'CREATURE')),
  author_name varchar(100) NOT NULL,
  pers_name varchar(100),
  label varchar(120) NOT NULL,
  roll jsonb NOT NULL,
  total integer NOT NULL,
  rolled_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_session_id, seq),
  UNIQUE (game_session_id, author_user_id, idempotency_key)
);

COMMIT;
