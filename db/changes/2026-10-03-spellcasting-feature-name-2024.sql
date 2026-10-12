-- Рішення власника 2026-10-03: риса Spellcasting називається «Чаротворство» в обох редакціях (у класів 2024 було «Чаклування»).
--   Статблоки істот лишаються з «Чаротворення» (KR12.8), це окремий термін.
-- Джерела data/2024/normalized, data/blood-hunter і src/lib/generated уже виправлені тим самим текстом.
-- Власник застосовує; після цього bun run generate:content має дати ті самі generated-файли.

UPDATE public.feature
SET name = 'Чаротворство', short_description = 'Чаротворство'
WHERE name = 'Чаклування'
  AND eng_name IN (
    'Artificer: Spellcasting (2024)',
    'Bard: Spellcasting (2024)',
    'Cleric: Spellcasting (2024)',
    'Druid: Spellcasting (2024)',
    'Eldritch Knight: Spellcasting (2024)',
    'Paladin: Spellcasting (2024)',
    'Ranger: Spellcasting (2024)',
    'Sorcerer: Spellcasting (2024)',
    'Warrior of the Mystic Arts: Spellcasting (2024)',
    'Wizard: Spellcasting (2024)'
  );

UPDATE public.feature
SET description = REPLACE(description, 'із фічі Чаклування цього класу', 'із фічі Чаротворства цього класу')
WHERE eng_name IN ('Cleric: Channel Divinity (2024)', 'Paladin: Channel Divinity (2024)');

UPDATE public.feature
SET description = REPLACE(description, 'Якщо маєте Чаклування з кількох класів', 'Якщо маєте Чаротворство з кількох класів')
WHERE eng_name = 'Warrior of the Mystic Arts: Spellcasting (2024)';

UPDATE public.feature
SET description = REPLACE(description, 'підготовлених для фічі Чаклування,', 'підготовлених для фічі Чаротворства,')
WHERE eng_name = 'Wizard: Memorize Spell (2024)';

UPDATE public.feature
SET description = REPLACE(description, '«Чаклування нечестивої душі»', '«Чаротворство нечестивої душі»')
WHERE eng_name IN ('Pact Magic (Order of the Profane Soul)', 'Order of the Profane Soul: Pact Magic (2024)');
