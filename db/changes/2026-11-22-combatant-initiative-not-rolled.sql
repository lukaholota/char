-- Гравці кидають ініціативу самі (відгук майстра 21.11): герой у бою до свого кидка — без ініціативи (null).
ALTER TABLE game_combatant ALTER COLUMN initiative DROP NOT NULL;
