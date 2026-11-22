-- Хоумбрю-правила кампанії й героя: ліміт налаштованих предметів, очки чар замість комірок, власні типи шкоди.
-- game_session.house_rules: {"attunementLimit":5,"magicSystem":"POINTS","damageTypes":["Світло"]}.
-- pers.house_rules: {"attunementLimit":4,"magicSystem":"SLOTS"} — значення героя переважає кампанію.
ALTER TABLE game_session ADD COLUMN house_rules jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE pers ADD COLUMN house_rules jsonb DEFAULT '{}'::jsonb NOT NULL;
