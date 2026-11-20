-- Хоумбрю-предмети (O53 KR53.7): запис хоумбрю веде справжній рядок magic_item,
-- тож екіпірування, налаштування, заряди й бонуси листа працюють без окремої гілки.
ALTER TABLE homebrew_entry DROP CONSTRAINT IF EXISTS homebrew_entry_kind_check;
ALTER TABLE homebrew_entry ADD CONSTRAINT homebrew_entry_kind_check
  CHECK (kind IN ('SPELL', 'CREATURE', 'ITEM'));

ALTER TABLE magic_item ADD COLUMN IF NOT EXISTS homebrew_entry_id integer UNIQUE
  REFERENCES homebrew_entry(homebrew_entry_id) ON DELETE CASCADE;
ALTER TABLE magic_item ADD COLUMN IF NOT EXISTS image_key varchar(255);
ALTER TABLE magic_item ADD COLUMN IF NOT EXISTS weapon_bonus smallint;
