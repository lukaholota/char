-- Реліз 2026-10-12 (коміт 8dfc95e0): усі SQL власнику, які лишились після деплою, одним файлом.
-- Лише дані, DDL немає; схема Prisma не змінювалась, тож `bun run db:pull` не потрібен.
-- Кожен блок — окрема транзакція, повторний запуск нічого не ламає (WHERE ловить лише старі значення).
-- НЕ входять: catalog-data-gaps §2 (шабля, ALTER TYPE — потребує коду), detective-*, background-tools-override.
-- Після застосування агент перегенеровує каталоги (адепт метамагії й навички клірика 2014 потрапляють
-- у creator-content лише так), звіряє diff і викочує окремим комітом.

-- ===== db/changes/2026-10-03-bard-paladin-feature-names.sql
BEGIN;
-- Рішення власника 2026-10-03: дві назви рис у каталозі.
--   Improved Divine Smite: описка «Покращене божественна кара» → «Покращена божественна кара».
--   Countercharm (Бард 2014 і 2024): «Контрчари» → «Контрпричарування»; назвою заклинання Counterspell лишається «Контрчари».
-- Сид 2014 (prisma/seed/classFeatureSeed.ts) і src/lib/generated уже виправлені тим самим текстом.
-- Власник застосовує; після цього bun run generate:content має дати ті самі файли.

UPDATE public.feature SET name = 'Покращена божественна кара' WHERE eng_name = 'Improved Divine Smite';

UPDATE public.feature SET name = 'Контрпричарування' WHERE eng_name IN ('Countercharm', 'Bard: Countercharm (2024)');
COMMIT;

-- ===== db/changes/2026-10-03-spellcasting-feature-name-2024.sql
BEGIN;
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
COMMIT;

-- ===== docs/o49-rpgbot-analysis/kobold-craftiness-skill-2026-10-10-owner-applies.sql
-- O49, 2026-10-10: кобольд MPMM, «Драконяча винахідливість» не давала вибору навички (BUG-015): skill_proficiencies порожнє.
-- Правило MPMM: Arcana, Investigation, Medicine, Sleight of Hand або Survival. Також виправлено тексти (Спритність рук замість Історії; список чаклуна замість чарівника).
-- Сід (prisma/seed/raceChoiceOptionSeed.ts, raceFeatureSeed.ts) уже виправлено в робочому дереві. Після застосування: `bun run db:pull`.
BEGIN;
UPDATE race_choice_option o
   SET skill_proficiencies = '{"choiceCount":1,"options":["ARCANA","INVESTIGATION","MEDICINE","SLEIGHT_OF_HAND","SURVIVAL"]}'::jsonb,
       description = $d$Ви отримуєте володіння однією з навичок: Магія, Розслідування, Медицина, Спритність рук або Виживання.$d$
  FROM race r
 WHERE o.race_id = r.race_id AND r.name::text = 'KOBOLD_MPMM' AND r.ruleset = 'RULES_2014'
   AND o.option_name = 'Драконяча винахідливість' AND o.ruleset = 'RULES_2014';
UPDATE race_choice_option o
   SET description = $d$Ви знаєте одне замовляння на ваш вибір зі списку заклинань чаклуна.$d$
  FROM race r
 WHERE o.race_id = r.race_id AND r.name::text = 'KOBOLD_MPMM' AND r.ruleset = 'RULES_2014'
   AND o.option_name = 'Драконяче чаклунство' AND o.ruleset = 'RULES_2014';
UPDATE feature
   SET description = $d$Ви успадкували частину драконячої магії. Оберіть один із наступних варіантів:

• Драконяча винахідливість (Craftiness): Ви отримуєте володіння однією з навичок: Магія, Розслідування, Медицина, Спритність рук або Виживання.

• Непокора (Defiance): Ви маєте <a href="/rules/abilities#advantage-and-disadvantage--advantage-and-disadvantage">перевагу</a> на ряткидки для уникнення або завершення стану Переляканості на собі.

• Драконяче чаклунство (Draconic Sorcery): Ви знаєте одне замовляння на ваш вибір зі списку заклинань Чародія. Інтелект, Мудрість або Харизма є вашою характеристикою для нього (оберіть при виборі раси).$d$
 WHERE eng_name = 'Kobold Legacy' AND ruleset = 'RULES_2014';
COMMIT;

-- ===== docs/o49-rpgbot-analysis/warlock-invocation-prerequisites-2026-10-10-owner-applies.sql
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

-- ===== docs/o49-rpgbot-analysis/giants-feats-abilities-2026-10-10-owner-applies.sql
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

-- ===== docs/o49-rpgbot-analysis/catalog-data-gaps-subclass-skills-2026-10-10-owner-applies.sql
-- O49 хвиля 2, 2026-10-10: навички підкласів Клірика 1-го рівня, яких немає в каталозі 2014.
-- Файл для власника: SQL → власник застосовує → `bun run db:pull` → перегенерація каталогу.
-- Перевірено лише на локальній spells_test у BEGIN … ROLLBACK (у цьому файлі транзакція завершується COMMIT). Сід (prisma/seed/*.ts) не змінювали: після застосування потрібна відповідна правка сіда.

BEGIN;
-- Домен природи, «Послідовник природи» (PHB p.62): одна навичка на вибір із Поводження з тваринами, Природи, Виживання.
UPDATE feature
   SET skill_proficiencies = '{"options":["ANIMAL_HANDLING","NATURE","SURVIVAL"],"choiceCount":1}'::jsonb
 WHERE feature_id = 8495 AND eng_name = 'Acolyte of Nature' AND ruleset = 'RULES_2014' AND skill_proficiencies IS NULL;

-- Домен магії, «Арканний адепт» (SCAG p.125): володіння навичкою Магія.
UPDATE feature
   SET skill_proficiencies = '["ARCANA"]'::jsonb
 WHERE feature_id = 8447 AND eng_name = 'Arcane Initiate (Arcana Domain)' AND ruleset = 'RULES_2014' AND skill_proficiencies IS NULL;
COMMIT;

-- ===== catalog-data-gaps-2026-10-09 §3 (лише цей блок)
-- ============================================================================
-- 3. Адепт метамагії: риса не має жодної опції (feat_choice_option порожня).
--    Код (2026-10-10) уже знає, що риса бере 2 різні опції групи «Метамагія»: `findFeatChoicePickCount` і гейт
--    `findFeatPackageProblem` (створення, підвищення рівня, сторінка листа). Застосовувати ПІСЛЯ деплою цього коду,
--    потім `bun run db:pull` і перегенерація каталогу (підвищення рівня читає каталог, не базу).
-- ============================================================================
BEGIN;
INSERT INTO feat_choice_option (feat_id, choice_option_id, ruleset)
SELECT f.feat_id, co.option_id, 'RULES_2014'
  FROM feat f
  JOIN choice_option co ON co.group_name = 'Метамагія' AND co.ruleset = 'RULES_2014'
 WHERE f.name::text = 'METAMAGIC_ADEPT' AND f.ruleset = 'RULES_2014'
   AND NOT EXISTS (SELECT 1 FROM feat_choice_option x WHERE x.feat_id = f.feat_id AND x.choice_option_id = co.option_id);
COMMIT;

-- ===== Перевірка: очікувано feature names — три нові назви, chaklування=0, metamagic=10, cleric обидва не NULL,
--       kobold не NULL, warlock Pact of the Chain / level 5, giants — два рядки "(Charisma)".
SELECT 'feature names' AS check, string_agg(eng_name || '=' || name, '; ') FROM feature WHERE eng_name IN ('Improved Divine Smite', 'Countercharm', 'Bard: Countercharm (2024)')
UNION ALL SELECT 'still Чаклування', count(*)::text FROM feature WHERE name = 'Чаклування' AND eng_name LIKE '%: Spellcasting (2024)'
UNION ALL SELECT 'metamagic adept options', count(*)::text FROM feat_choice_option x JOIN feat f ON f.feat_id = x.feat_id WHERE f.name::text = 'METAMAGIC_ADEPT' AND f.ruleset = 'RULES_2014'
UNION ALL SELECT 'cleric skills', string_agg(feature_id || ':' || coalesce(skill_proficiencies::text, 'NULL'), '; ') FROM feature WHERE feature_id IN (8495, 8447)
UNION ALL SELECT 'kobold', coalesce(o.skill_proficiencies::text, 'NULL') FROM race_choice_option o JOIN race r ON r.race_id = o.race_id WHERE r.name::text = 'KOBOLD_MPMM' AND o.option_name = 'Драконяча винахідливість'
UNION ALL SELECT 'warlock', string_agg(option_name_eng || '=' || prerequisites::text, '; ') FROM choice_option WHERE option_name_eng IN ('Gift of the Ever-Living Ones', 'One with Shadows') AND ruleset = 'RULES_2014'
UNION ALL SELECT 'giants', string_agg(option_name_eng, '; ') FROM choice_option WHERE option_name_eng ~ '^(GUILE|SOUL)_OF_GIANTS Ability' AND ruleset = 'RULES_2014';
