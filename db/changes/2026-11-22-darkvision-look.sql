-- Стиль темного зору для всієї кампанії: сірий (типово), тьмяний, тепловізор.
ALTER TABLE game_session
  ADD COLUMN darkvision_look varchar(5) DEFAULT 'grey' NOT NULL,
  ADD CONSTRAINT game_session_darkvision_look_check CHECK (darkvision_look IN ('grey', 'dim', 'heat'));
