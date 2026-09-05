-- KR27.5 — owner apply only. Не проганяти через Prisma migrate / db push.
-- Р38 (docs/DECISIONS.md): безкоштовне застосування заклинання 1-го рівня від «Посвяченого у
-- магію» — це одне використання фічі «список X» на довгий відпочинок, а не другий рядок
-- заклинання. Сід `bun run seed:feat-mechanics-2024:prod` зробив би те саме; цей файл — лише
-- ці три рядки, без пересіву всієї механіки рис. Ідемпотентно.

UPDATE public.feature
SET limited_uses_per = 'LONG_REST',
    uses_count = 1,
    description = description || ' Заклинання 1-го рівня завжди підготоване; раз на довгий відпочинок його можна накласти без слоту — це і є одне використання цієї риси.'
WHERE ruleset = 'RULES_2024'
  AND eng_name IN ('Magic Initiate: Cleric list (2024)', 'Magic Initiate: Druid list (2024)', 'Magic Initiate: Wizard list (2024)')
  AND uses_count IS NULL;

-- Перевірка: три рядки, кожен LONG_REST / 1.
SELECT eng_name, limited_uses_per, uses_count FROM public.feature
WHERE ruleset = 'RULES_2024' AND eng_name LIKE 'Magic Initiate: % list (2024)' ORDER BY eng_name;
