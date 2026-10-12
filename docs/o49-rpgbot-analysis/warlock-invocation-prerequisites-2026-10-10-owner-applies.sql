-- O49, 2026-10-10: два потойбічні виклики Чорнокнижника мали неправильні передумови (звірено з data/5etools/raw/optionalfeatures.json і PHB/XGtE).
--  · «Дари вічних» (Gift of the Ever-Living Ones, XGtE): потрібен лише Пакт ланцюга, а в БД було ще «рівень 5».
--  · «Один з тінями» (One with Shadows, PHB): потрібен 5-й рівень Чорнокнижника, а в БД було 7.
-- Сід (prisma/seed/choiceOptionSeed.ts) уже виправлено в робочому дереві. Після застосування: `bun run db:pull`.
BEGIN;
UPDATE choice_option
   SET prerequisites = '{"pact": "Pact of the Chain"}'::jsonb
 WHERE option_name_eng = 'Gift of the Ever-Living Ones' AND ruleset = 'RULES_2014';
UPDATE choice_option
   SET prerequisites = '{"level": 5}'::jsonb
 WHERE option_name_eng = 'One with Shadows' AND ruleset = 'RULES_2014';
COMMIT;
