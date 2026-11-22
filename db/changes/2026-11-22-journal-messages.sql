-- Гравці й майстер пишуть у журнал кампанії (відгук 21.11): повідомлення — подія журналу без кубиків.
ALTER TABLE game_roll_event ALTER COLUMN label TYPE character varying(300);
ALTER TABLE game_roll_event DROP CONSTRAINT game_roll_event_source_check;
ALTER TABLE game_roll_event ADD CONSTRAINT game_roll_event_source_check
  CHECK (((source)::text = ANY ((ARRAY['CHARACTER'::character varying, 'FREE'::character varying, 'CREATURE'::character varying, 'MESSAGE'::character varying])::text[])));
