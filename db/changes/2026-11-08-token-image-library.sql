-- O51: бібліотека власних зображень майстра й заміна зображення істоти на мапі (статблок лишається).
-- Лише додавання: розгорнутий код про таблицю й колонку не знає й працює далі.
-- Видалення зображення з бібліотеки повертає істотам стандартне зображення.
BEGIN;

CREATE TABLE public.user_token_image (
  user_token_image_id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES public."user"(user_id) ON DELETE CASCADE ON UPDATE NO ACTION,
  image_key varchar(200) NOT NULL UNIQUE,
  created_at timestamptz(6) NOT NULL DEFAULT now()
);

CREATE INDEX user_token_image_user_idx ON public.user_token_image (user_id, created_at DESC);

ALTER TABLE public.game_map_creature
  ADD COLUMN custom_image_key varchar(200) REFERENCES public.user_token_image(image_key) ON DELETE SET NULL ON UPDATE NO ACTION;

COMMIT;
