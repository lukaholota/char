-- Звʼязок хоумбрю-предмета перевернуто: FK magic_item → homebrew_entry затягував увесь каталог
-- предметів у «дані користувача» (tests/user-data.ts, scripts/db-clone.sh) — скидання тестів і клон
-- проду лишали базу без жодного предмета. Колонку додано того ж дня, у ній лише NULL.
ALTER TABLE homebrew_entry ADD COLUMN IF NOT EXISTS magic_item_id integer UNIQUE
  REFERENCES magic_item(magic_item_id);
ALTER TABLE magic_item DROP COLUMN IF EXISTS homebrew_entry_id;
