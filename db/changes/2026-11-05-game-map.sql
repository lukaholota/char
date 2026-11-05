BEGIN;

ALTER TABLE public.game_session ADD COLUMN map_image_key varchar(200);

ALTER TABLE public.game_session_member
  ADD COLUMN token_x real,
  ADD COLUMN token_y real,
  ADD CONSTRAINT game_session_member_token_check CHECK (
    (token_x IS NULL) = (token_y IS NULL)
    AND (token_x IS NULL OR (token_x BETWEEN 0 AND 1 AND token_y BETWEEN 0 AND 1))
  );

COMMIT;
