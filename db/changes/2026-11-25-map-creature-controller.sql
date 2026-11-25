-- Фамільяр чи прикликана істота: героєві, що нею керує, повертається керування. Гравця вигнали — істота знову в майстра.
BEGIN;

ALTER TABLE game_map_creature
  ADD COLUMN controller_member_id integer REFERENCES game_session_member(game_session_member_id) ON DELETE SET NULL;

CREATE INDEX game_map_creature_controller_member_id_idx ON game_map_creature (controller_member_id) WHERE controller_member_id IS NOT NULL;

COMMIT;
