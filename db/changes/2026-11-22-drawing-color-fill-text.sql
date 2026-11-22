-- Малювання (відгук майстра 21.11): колір зі спектру (#rrggbb; старі назви лишаються),
-- непрозора заливка як типова (старі фігури зберігають 0.35) і текст на мапі.
ALTER TABLE game_scene_drawing DROP CONSTRAINT game_scene_drawing_color_check;
ALTER TABLE game_scene_drawing ADD CONSTRAINT game_scene_drawing_color_check CHECK (
  (color)::text = ANY ((ARRAY['red', 'orange', 'amber', 'emerald', 'teal', 'sky', 'blue', 'violet', 'pink', 'stone', 'white', 'black'])::text[])
  OR (color)::text ~ '^#[0-9a-f]{6}$'
);

ALTER TABLE game_scene_drawing DROP CONSTRAINT game_scene_drawing_shape_check;
ALTER TABLE game_scene_drawing ADD CONSTRAINT game_scene_drawing_shape_check CHECK (
  (shape)::text = ANY ((ARRAY['line', 'rect', 'circle', 'polygon', 'text'])::text[])
);

ALTER TABLE game_scene_drawing
  ADD COLUMN fill_opacity real DEFAULT 0.35 NOT NULL,
  ADD COLUMN text character varying(200),
  ADD COLUMN font character varying(8),
  ADD COLUMN text_effect character varying(7),
  ADD CONSTRAINT game_scene_drawing_fill_opacity_check CHECK (fill_opacity >= 0.1 AND fill_opacity <= 1),
  ADD CONSTRAINT game_scene_drawing_text_check CHECK (
    ((shape)::text = 'text') = (text IS NOT NULL AND font IS NOT NULL AND text_effect IS NOT NULL)
  ),
  ADD CONSTRAINT game_scene_drawing_font_check CHECK (font IS NULL OR (font)::text = ANY ((ARRAY['plain', 'antique', 'hand', 'ornate'])::text[])),
  ADD CONSTRAINT game_scene_drawing_text_effect_check CHECK (text_effect IS NULL OR (text_effect)::text = ANY ((ARRAY['none', 'outline', 'shadow', 'glow'])::text[]));
