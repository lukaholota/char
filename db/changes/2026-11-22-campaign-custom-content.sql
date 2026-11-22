-- Навички й здібності кампанії: майстер задає їх один раз, кожен герой кампанії отримує свою копію
-- в pers_custom_skill / pers_custom_feature (зі своїм лічильником). Видалення шаблону прибирає копії.
CREATE TABLE game_session_custom_skill (
  game_session_custom_skill_id serial PRIMARY KEY,
  game_session_id integer NOT NULL REFERENCES game_session (game_session_id) ON DELETE CASCADE,
  name varchar(60) NOT NULL CHECK (btrim(name) <> ''),
  ability public."Ability" NOT NULL,
  proficiency_type public."SkillProficiencyType" DEFAULT 'NONE' NOT NULL,
  bonus smallint DEFAULT 0 NOT NULL CHECK (bonus BETWEEN -30 AND 30),
  created_at timestamptz(6) DEFAULT now() NOT NULL,
  UNIQUE (game_session_id, name)
);

CREATE TABLE game_session_custom_feature (
  game_session_custom_feature_id serial PRIMARY KEY,
  game_session_id integer NOT NULL REFERENCES game_session (game_session_id) ON DELETE CASCADE,
  name varchar(100) NOT NULL CHECK (btrim(name) <> ''),
  description text DEFAULT '' NOT NULL,
  roll_formula varchar(200),
  uses_max smallint CHECK (uses_max BETWEEN 1 AND 999),
  restored_on public."RestType" CHECK (restored_on IS NULL OR uses_max IS NOT NULL),
  created_at timestamptz(6) DEFAULT now() NOT NULL
);
CREATE INDEX game_session_custom_feature_session_idx ON game_session_custom_feature (game_session_id);

ALTER TABLE pers_custom_skill
  ADD COLUMN campaign_skill_id integer REFERENCES game_session_custom_skill (game_session_custom_skill_id) ON DELETE CASCADE,
  ADD CONSTRAINT pers_custom_skill_campaign_unique UNIQUE (pers_id, campaign_skill_id);
ALTER TABLE pers_custom_feature
  ADD COLUMN campaign_feature_id integer REFERENCES game_session_custom_feature (game_session_custom_feature_id) ON DELETE CASCADE,
  ADD CONSTRAINT pers_custom_feature_campaign_unique UNIQUE (pers_id, campaign_feature_id);
