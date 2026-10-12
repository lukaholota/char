-- O49, 2026-10-09: прогалини каталогу 2014 за авторськими прикладами RPGbot.
-- Файл для власника: SQL → власник застосовує → `bun run db:pull`. Агент у production нічого не виконував.
-- Перевірено лише на локальній spells_test (127.0.0.1:5433) у BEGIN … ROLLBACK; кількості рядків — у catalog-data-gaps-2026-10-09.md.
-- Колонка назви класу в БД — eng_name, а `name` у race/weapon/feat/background — enum, тому порівняння через ::text.
-- Сід-файли (prisma/seed/*.ts) агент не змінював: після застосування SQL потрібні відповідні правки сідів, інакше перезасів поверне стару дані.

-- ============================================================================
-- 1. Гіфф: расової навички Атлетика у виданні немає (AAG p.12, races.json: skillProficiencies = null).
--    Можна застосовувати одразу; після db:pull і перегенерації каталогу прибрати заміну
--    skills.background ["SURVIVAL"] у fighter-psi-warrior-2014 і перекомпілювати.
-- ============================================================================
BEGIN;
UPDATE race
   SET skill_proficiencies = NULL
 WHERE name::text = 'GIFF_SPELLJAMMER' AND ruleset = 'RULES_2014' AND skill_proficiencies IS NOT NULL;
COMMIT;

-- ============================================================================
-- 2. Шабля з двома лезами (ERLW p.21, items-base.json: 2d4 рубальна, властивості S, 2H; Martial).
--    Крок 2а — окремою транзакцією (нове значення enum не можна використати в тій самій).
-- ============================================================================
-- 2а
ALTER TYPE "WeaponCategory" ADD VALUE IF NOT EXISTS 'DOUBLE_BLADED_SCIMITAR';

-- 2б — після 2а, `bun run db:pull` і ДЕПЛОЮ коду з оновленою схемою. Раніше не можна: задеплоєний Prisma-клієнт
--     не знає 'DOUBLE_BLADED_SCIMITAR' і падає на будь-якому читанні списку зброї, що поверне цей рядок.
BEGIN;
INSERT INTO weapon (name, damage, damage_type, weapon_type, properties, versatile_damage, normal_range, long_range, is_ranged, is_additional, sort_order, ruleset, mastery)
VALUES ('DOUBLE_BLADED_SCIMITAR', '2к4', 'SLASHING', 'MARTIAL_WEAPON', '{TWO_HANDED,SPECIAL}', NULL, NULL, NULL, false, false, 29, 'RULES_2014', NULL);
COMMIT;

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
