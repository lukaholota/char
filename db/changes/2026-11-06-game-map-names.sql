-- O51: імʼя істоти для гравців, її розмір на мапі (null — як у статблоці) і показ імен істот у кімнаті.
-- Усе обирає майстер, бачать усі.
BEGIN;
ALTER TABLE public.game_map_creature
  ADD COLUMN custom_name varchar(40) CHECK (custom_name IS NULL OR length(btrim(custom_name)) BETWEEN 1 AND 40),
  ADD COLUMN token_size varchar(10) CHECK (token_size IN ('tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'));
ALTER TABLE public.game_session
  ADD COLUMN creature_name_mode varchar(8) NOT NULL DEFAULT 'short' CHECK (creature_name_mode IN ('short', 'wrap', 'full'));
COMMIT;
