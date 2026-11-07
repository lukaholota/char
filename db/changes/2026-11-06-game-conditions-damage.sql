-- O51: стани на токенах (істот і героїв) і кидок по цілі: влучання проти СК, шкода в хіти істоти зі скасуванням.
-- Лише додавання: розгорнутий код не знає про колонки й працює далі. Стани й ціль бачать усі, СК, хіти й скасування — лише майстер.
BEGIN;

ALTER TABLE public.game_map_creature
  ADD COLUMN conditions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN exhaustion_level smallint NOT NULL DEFAULT 0,
  ADD CONSTRAINT game_map_creature_exhaustion_check CHECK (exhaustion_level BETWEEN 0 AND 6);

ALTER TABLE public.game_session_member
  ADD COLUMN conditions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN exhaustion_level smallint NOT NULL DEFAULT 0,
  ADD CONSTRAINT game_session_member_exhaustion_check CHECK (exhaustion_level BETWEEN 0 AND 6);

-- Назва ціли зберігається в події: журнал читається й після того, як істоту прибрали.
-- hp_change — скільки хітів шкода справді забрала після обрізання на нулі; з нього скасування повертає рівно стільки.
ALTER TABLE public.game_roll_event
  ADD COLUMN target_creature_id integer REFERENCES public.game_map_creature (game_map_creature_id) ON DELETE SET NULL,
  ADD COLUMN target_name varchar(80),
  ADD COLUMN roll_kind varchar(8) CHECK (roll_kind IN ('attack', 'damage')),
  ADD COLUMN target_ac smallint,
  ADD COLUMN is_hit boolean,
  ADD COLUMN hp_before smallint,
  ADD COLUMN hp_change smallint CHECK (hp_change >= 0),
  ADD COLUMN hp_change_undone boolean NOT NULL DEFAULT false;

CREATE INDEX game_roll_event_target_creature_idx ON public.game_roll_event (target_creature_id) WHERE target_creature_id IS NOT NULL;

COMMIT;
