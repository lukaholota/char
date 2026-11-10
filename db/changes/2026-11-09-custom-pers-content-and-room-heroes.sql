-- Побажання гравців: власні навички, здібності з формулами й ресурси, кілька героїв на гравця, прозорі токени героїв.
-- Сумісно з розгорнутим кодом: нові таблиці й колонки не помітні старим запитам, а UNIQUE (сесія, користувач, слот)
-- для слота 0 забороняє те саме, що старий UNIQUE. Prisma шукає учасника через WHERE, ON CONFLICT по ньому немає.
-- Три короткі транзакції, щоб блокування не накладались. Якщо чекати lock довше 3 с, частина відкотиться: перезапустити її.
-- Тригер дзеркалить старий game_scene_token у нову таблицю, тож рухи токенів до деплою не губляться; прибрати разом зі старою таблицею.
SET lock_timeout = '3s';
SET statement_timeout = '15s';

BEGIN;

CREATE TABLE public.pers_custom_skill (
  pers_custom_skill_id serial PRIMARY KEY,
  pers_id integer NOT NULL REFERENCES public.pers(pers_id) ON DELETE CASCADE,
  name varchar(60) NOT NULL CHECK (btrim(name) <> ''),
  ability public."Ability" NOT NULL,
  proficiency_type public."SkillProficiencyType" NOT NULL DEFAULT 'NONE',
  bonus smallint NOT NULL DEFAULT 0 CHECK (bonus BETWEEN -30 AND 30),
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  UNIQUE (pers_id, name)
);

CREATE TABLE public.pers_custom_feature (
  pers_custom_feature_id serial PRIMARY KEY,
  pers_id integer NOT NULL REFERENCES public.pers(pers_id) ON DELETE CASCADE,
  name varchar(100) NOT NULL CHECK (btrim(name) <> ''),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 4000),
  roll_formula varchar(200),
  uses_max smallint CHECK (uses_max BETWEEN 1 AND 999),
  uses_remaining smallint CHECK (uses_remaining BETWEEN 0 AND 999),
  restored_on public."RestType",
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  CHECK ((uses_max IS NULL) = (uses_remaining IS NULL)),
  CHECK (uses_remaining <= uses_max),
  CHECK (restored_on IS NULL OR uses_max IS NOT NULL)
);

CREATE INDEX pers_custom_feature_pers_idx ON public.pers_custom_feature (pers_id, pers_custom_feature_id);

COMMIT;

BEGIN;

ALTER TABLE public.game_session_member
  ADD COLUMN hero_slot smallint NOT NULL DEFAULT 0 CHECK (hero_slot BETWEEN 0 AND 5),
  ADD COLUMN is_cutout boolean NOT NULL DEFAULT false,
  DROP CONSTRAINT game_session_member_game_session_id_user_id_key,
  ADD CONSTRAINT game_session_member_session_user_slot_key UNIQUE (game_session_id, user_id, hero_slot);

COMMIT;

BEGIN;

CREATE TABLE public.game_scene_hero_token (
  game_scene_id integer NOT NULL REFERENCES public.game_scene(game_scene_id) ON DELETE CASCADE,
  game_session_member_id integer NOT NULL REFERENCES public.game_session_member(game_session_member_id) ON DELETE CASCADE,
  token_x real NOT NULL CHECK (token_x BETWEEN 0 AND 1),
  token_y real NOT NULL CHECK (token_y BETWEEN 0 AND 1),
  PRIMARY KEY (game_scene_id, game_session_member_id)
);

CREATE FUNCTION public.mirror_scene_token_to_hero_token() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.game_scene_hero_token hero
    USING public.game_session_member member
    WHERE hero.game_scene_id = OLD.game_scene_id
      AND member.game_session_member_id = hero.game_session_member_id
      AND member.user_id = OLD.user_id
      AND member.hero_slot = 0;
    RETURN OLD;
  END IF;
  INSERT INTO public.game_scene_hero_token (game_scene_id, game_session_member_id, token_x, token_y)
  SELECT NEW.game_scene_id, member.game_session_member_id, NEW.token_x, NEW.token_y
  FROM public.game_scene scene
  JOIN public.game_session_member member ON member.game_session_id = scene.game_session_id AND member.user_id = NEW.user_id AND member.hero_slot = 0
  WHERE scene.game_scene_id = NEW.game_scene_id
  ON CONFLICT (game_scene_id, game_session_member_id) DO UPDATE SET token_x = EXCLUDED.token_x, token_y = EXCLUDED.token_y;
  RETURN NEW;
END $$;

CREATE TRIGGER game_scene_token_mirror
AFTER INSERT OR UPDATE OR DELETE ON public.game_scene_token
FOR EACH ROW EXECUTE FUNCTION public.mirror_scene_token_to_hero_token();

INSERT INTO public.game_scene_hero_token (game_scene_id, game_session_member_id, token_x, token_y)
SELECT token.game_scene_id, member.game_session_member_id, token.token_x, token.token_y
FROM public.game_scene_token token
JOIN public.game_scene scene ON scene.game_scene_id = token.game_scene_id
JOIN public.game_session_member member ON member.game_session_id = scene.game_session_id AND member.user_id = token.user_id AND member.hero_slot = 0;

COMMIT;
