-- Майстер ховає імʼя істоти від гравців (відгук 21.11): гравці бачать «Невідома істота».
ALTER TABLE game_map_creature ADD COLUMN is_name_hidden boolean DEFAULT false NOT NULL;
