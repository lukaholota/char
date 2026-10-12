-- Рішення власника 2026-10-03: дві назви рис у каталозі.
--   Improved Divine Smite: описка «Покращене божественна кара» → «Покращена божественна кара».
--   Countercharm (Бард 2014 і 2024): «Контрчари» → «Контрпричарування»; назвою заклинання Counterspell лишається «Контрчари».
-- Сид 2014 (prisma/seed/classFeatureSeed.ts) і src/lib/generated уже виправлені тим самим текстом.
-- Власник застосовує; після цього bun run generate:content має дати ті самі файли.

UPDATE public.feature SET name = 'Покращена божественна кара' WHERE eng_name = 'Improved Divine Smite';

UPDATE public.feature SET name = 'Контрпричарування' WHERE eng_name IN ('Countercharm', 'Bard: Countercharm (2024)');
