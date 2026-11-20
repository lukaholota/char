-- Магічна зброя +N (O53): предмет знає, до якої зброї листа додає свій бонус.
ALTER TABLE pers_magic_item ADD COLUMN IF NOT EXISTS pers_weapon_id integer
  REFERENCES pers_weapon(pers_weapon_id) ON DELETE SET NULL;
