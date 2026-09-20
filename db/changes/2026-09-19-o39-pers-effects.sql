-- O39 — стани персонажа поза рисами: виснаження, концентрація, бафи на себе.
-- Застосовано власником на робочій базі 2026-09-19; далі bun run db:pull.

ALTER TABLE pers ADD COLUMN exhaustion_level smallint NOT NULL DEFAULT 0
  CONSTRAINT pers_exhaustion_level_range CHECK (exhaustion_level BETWEEN 0 AND 6);

-- Один рядок на ефект: 'CONCENTRATION' (на чому концентрується персонаж) або ключ бафа
-- ('SHIELD_OF_FAITH', 'HASTE', …). Баф, накладений самим персонажем із концентрацією,
-- гасне разом із нею (ends_with_concentration); накладений союзником — ні.
CREATE TABLE pers_effect (
  pers_effect_id serial PRIMARY KEY,
  pers_id integer NOT NULL REFERENCES pers(pers_id) ON DELETE CASCADE,
  effect_key varchar(40) NOT NULL,
  spell_id integer REFERENCES spell(spell_id) ON DELETE SET NULL,
  homebrew_entry_id integer REFERENCES homebrew_entry(homebrew_entry_id) ON DELETE SET NULL,
  ends_with_concentration boolean NOT NULL DEFAULT false,
  created_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pers_effect_one_per_key UNIQUE (pers_id, effect_key)
);
