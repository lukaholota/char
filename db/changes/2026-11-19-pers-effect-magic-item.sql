-- Стан від магічного предмета (O53): зілля діє й після того, як його випили й прибрали зі спорядження.
ALTER TABLE pers_effect ADD COLUMN IF NOT EXISTS magic_item_id integer
  REFERENCES magic_item(magic_item_id) ON DELETE CASCADE;
