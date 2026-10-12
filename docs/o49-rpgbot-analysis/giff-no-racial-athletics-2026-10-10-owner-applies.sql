-- O49, 2026-10-10: Гіфф (AAG p.12) не має расового володіння Атлетикою; у каталозі 2014 воно зайве.
-- Це §1 з catalog-data-gaps-2026-10-09-owner-applies.sql окремим файлом. Перевірено на локальній spells_test у BEGIN … ROLLBACK (UPDATE 1).
-- Після застосування: `bun run db:pull`, перегенерація каталогів. Сід (prisma/seed/raceSeed.ts) уже виправлено в робочому дереві (Prisma.DbNull).
BEGIN;
UPDATE race
   SET skill_proficiencies = NULL
 WHERE name::text = 'GIFF_SPELLJAMMER' AND ruleset = 'RULES_2014' AND skill_proficiencies IS NOT NULL;
COMMIT;
