-- Зброя з кількома типами шкоди в листі й хомбрю-зброя, обладунки та звичайні речі.
-- extra_damage / weapon_profile.extraDamage: [{"count":1,"sides":6,"damageType":"FIRE"}].
-- weapon_profile: {"attackAbility":"DEX","damage":"1к8+СПР","damageType":"PIERCING","extraDamage":[...],"normalRange":100,"longRange":400}.
ALTER TABLE pers_weapon ADD COLUMN extra_damage jsonb;

ALTER TABLE magic_item
  ADD COLUMN is_mundane boolean DEFAULT false NOT NULL,
  ADD COLUMN weapon_profile jsonb,
  ADD COLUMN base_weapon_id integer REFERENCES weapon (weapon_id) ON DELETE SET NULL,
  ADD COLUMN base_armor_id integer REFERENCES armor (armor_id) ON DELETE SET NULL,
  ADD COLUMN armor_base_ac smallint CHECK (armor_base_ac BETWEEN 0 AND 30);
