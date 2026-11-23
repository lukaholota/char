BEGIN;

ALTER TABLE game_map_creature
  ADD COLUMN border_color varchar(5) CHECK (border_color IN ('green', 'red'));

UPDATE game_map_creature
SET border_color = CASE WHEN is_ally THEN 'green' ELSE 'red' END;

COMMIT;
