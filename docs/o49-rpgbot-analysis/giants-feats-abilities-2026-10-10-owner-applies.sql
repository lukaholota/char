-- O49, 2026-10-10: у двох рисах велетнів (BGG) варіанти характеристик не збігалися з книгою (звірено з 5etools feats.json):
--  · Guile of the Cloud Giant: Сила, Статура або Харизма (було Сила, Статура, Мудрість);
--  · Soul of the Storm Giant: Сила, Мудрість або Харизма (було Сила, Статура, Мудрість).
-- Рядки змінюються на місці (ті самі option_id): персонажі, що вже взяли «Мудрість» у Guile чи «Статуру» в Soul, побачать інший підпис; їхні числа не перераховуються.
-- Сід (prisma/seed/featChoiceOptions2014.ts) уже виправлено. Після застосування: `bun run db:pull`.
BEGIN;
UPDATE choice_option
   SET option_name = 'Харизма', option_name_eng = 'GUILE_OF_GIANTS Ability (Charisma)', effect_ability = 'CHA'
 WHERE option_name_eng = 'GUILE_OF_GIANTS Ability (Wisdom)' AND ruleset = 'RULES_2014';
UPDATE choice_option
   SET option_name = 'Харизма', option_name_eng = 'SOUL_OF_GIANTS Ability (Charisma)', effect_ability = 'CHA'
 WHERE option_name_eng = 'SOUL_OF_GIANTS Ability (Constitution)' AND ruleset = 'RULES_2014';
COMMIT;
