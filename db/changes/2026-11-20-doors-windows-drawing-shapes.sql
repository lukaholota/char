-- Двері трьох видів, вікна й фігури малювання (O52).
-- door_lock: none — відчиняє будь-хто, locked — лише майстер, secret — гравцям це стіна.
-- Вікно: is_open — відчинене, is_curtained — штора закриває огляд.
-- shape: line — від руки, rect/circle — дві точки (кути / центр і край), polygon — вершини ламаної.
ALTER TABLE game_scene_wall ALTER COLUMN kind TYPE varchar(6);
ALTER TABLE game_scene_wall DROP CONSTRAINT IF EXISTS game_scene_wall_kind_check;
ALTER TABLE game_scene_wall ADD CONSTRAINT game_scene_wall_kind_check CHECK (kind IN ('wall', 'door', 'window'));
ALTER TABLE game_scene_wall ADD COLUMN IF NOT EXISTS door_lock varchar(6) NOT NULL DEFAULT 'none';
ALTER TABLE game_scene_wall DROP CONSTRAINT IF EXISTS game_scene_wall_door_lock_check;
ALTER TABLE game_scene_wall ADD CONSTRAINT game_scene_wall_door_lock_check CHECK (door_lock IN ('none', 'locked', 'secret'));
ALTER TABLE game_scene_wall ADD COLUMN IF NOT EXISTS is_curtained boolean NOT NULL DEFAULT false;

ALTER TABLE game_scene_drawing ADD COLUMN IF NOT EXISTS shape varchar(7) NOT NULL DEFAULT 'line';
ALTER TABLE game_scene_drawing DROP CONSTRAINT IF EXISTS game_scene_drawing_shape_check;
ALTER TABLE game_scene_drawing ADD CONSTRAINT game_scene_drawing_shape_check CHECK (shape IN ('line', 'rect', 'circle', 'polygon'));
ALTER TABLE game_scene_drawing ADD COLUMN IF NOT EXISTS is_filled boolean NOT NULL DEFAULT false;
ALTER TABLE game_scene_drawing DROP CONSTRAINT IF EXISTS game_scene_drawing_color_check;
ALTER TABLE game_scene_drawing ADD CONSTRAINT game_scene_drawing_color_check CHECK (color IN ('red', 'orange', 'amber', 'emerald', 'teal', 'sky', 'blue', 'violet', 'pink', 'stone', 'white', 'black'));
