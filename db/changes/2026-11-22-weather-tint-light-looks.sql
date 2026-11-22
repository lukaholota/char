-- Погода й світло (відгук майстра 21.11): швидкість і колір погоди, свій відтінок мапи
-- з інтенсивністю, колір світла зі спектру, конус із напрямком і мерехтіння чи пульс.
ALTER TABLE game_scene
  ADD COLUMN weather_speed smallint DEFAULT 100 NOT NULL,
  ADD COLUMN weather_color character varying(7),
  ADD COLUMN tint_color character varying(7),
  ADD COLUMN tint_strength smallint DEFAULT 100 NOT NULL,
  ADD CONSTRAINT game_scene_weather_speed_check CHECK (weather_speed >= 25 AND weather_speed <= 300),
  ADD CONSTRAINT game_scene_weather_color_check CHECK (weather_color IS NULL OR (weather_color)::text ~ '^#[0-9a-f]{6}$'),
  ADD CONSTRAINT game_scene_tint_color_check CHECK (tint_color IS NULL OR (tint_color)::text ~ '^#[0-9a-f]{6}$'),
  ADD CONSTRAINT game_scene_tint_strength_check CHECK (tint_strength >= 20 AND tint_strength <= 150);

ALTER TABLE game_scene_light
  ADD COLUMN color character varying(7),
  ADD COLUMN cone_degrees smallint DEFAULT 360 NOT NULL,
  ADD COLUMN direction_degrees smallint DEFAULT 0 NOT NULL,
  ADD COLUMN effect character varying(7) DEFAULT 'steady'::character varying NOT NULL,
  ADD CONSTRAINT game_scene_light_color_check CHECK (color IS NULL OR (color)::text ~ '^#[0-9a-f]{6}$'),
  ADD CONSTRAINT game_scene_light_cone_degrees_check CHECK (cone_degrees >= 15 AND cone_degrees <= 360),
  ADD CONSTRAINT game_scene_light_direction_degrees_check CHECK (direction_degrees >= 0 AND direction_degrees <= 359),
  ADD CONSTRAINT game_scene_light_effect_check CHECK ((effect)::text = ANY ((ARRAY['steady', 'flicker', 'pulse'])::text[]));
