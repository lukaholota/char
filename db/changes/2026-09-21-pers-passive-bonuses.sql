-- Ручний бонус гравця до пасивних значень: { "PERCEPTION": 2, "INVESTIGATION": 0, "INSIGHT": -1 }.
-- Бонуси від рис (Спостережливий 2014) сюди не пишуться — вони рахуються з самої риси.
ALTER TABLE pers ADD COLUMN IF NOT EXISTS passive_bonuses jsonb;
