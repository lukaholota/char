-- O51: чорний колір і п'ять товщин олівця. Застосувати ДО релізу: новий код зберігає 'black', 'fine', 'medium', 'heavy'.
-- Старі значення лишаються дозволеними, тож уже намальовані лінії не ламаються.
BEGIN;

ALTER TABLE public.game_scene_drawing
  DROP CONSTRAINT game_scene_drawing_color_check,
  DROP CONSTRAINT game_scene_drawing_width_check;

ALTER TABLE public.game_scene_drawing ALTER COLUMN width TYPE varchar(6);

ALTER TABLE public.game_scene_drawing
  ADD CONSTRAINT game_scene_drawing_color_check CHECK (color IN ('red', 'amber', 'emerald', 'sky', 'violet', 'white', 'black')),
  ADD CONSTRAINT game_scene_drawing_width_check CHECK (width IN ('fine', 'thin', 'medium', 'bold', 'heavy'));

COMMIT;
