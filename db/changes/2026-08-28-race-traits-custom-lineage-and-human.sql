-- Своя раса (TCoE) і Людина (PHB 2014) — єдині дві раси з 66, у яких у базі нуль расових рис.
-- Через це в каталозі й у конструкторі їхні картки порожні: механіка є в колонках (ASI, розмір,
-- швидкість, мови), а тексту з книги немає.
--
-- Розмір, швидкість і мови навмисно НЕ заводяться рисами: вони вже малюються окремими комірками
-- картки, і жодна інша раса не тримає їх удвічі (рішення власника 2026-08-28).
--
-- eng_name у feature унікальний глобально, тому назви з книги («Creature Type», «Feat») несуть
-- префікс раси — так само, як це зроблено для видів 2024 («Aasimar: Darkvision (2024)»).
--
-- Скрипт ідемпотентний: повторний прогін оновлює тексти й нічого не дублює.

BEGIN;

INSERT INTO feature (name, eng_name, description, short_description, display_type, updated_at)
VALUES
  ('Тип істоти',
   'Custom Lineage: Creature Type',
   'Ви гуманоїд. Ви визначаєте свою зовнішність і те, чи схожі ви на когось із родичів.',
   'Ви гуманоїд.',
   '{PASSIVE}', CURRENT_TIMESTAMP),

  ('Покращення характеристик',
   'Custom Lineage: Ability Score Increase',
   'Одна характеристика на ваш вибір збільшується на 2.',
   '+2 до однієї характеристики на ваш вибір.',
   '{PASSIVE}', CURRENT_TIMESTAMP),

  ('Риса',
   'Custom Lineage: Feat',
   'Ви отримуєте одну рису на ваш вибір, вимогам якої ви відповідаєте.',
   'Одна риса на ваш вибір.',
   '{PASSIVE}', CURRENT_TIMESTAMP),

  ('Змінна особливість',
   'Custom Lineage: Variable Trait',
   E'Ви отримуєте один із таких варіантів на ваш вибір:\n\nТемнозір на відстань 60 футів.\n\nВолодіння однією навичкою на ваш вибір.',
   'Темнозір 60 футів або володіння однією навичкою.',
   '{PASSIVE}', CURRENT_TIMESTAMP),

  ('Покращення характеристик',
   'Human: Ability Score Increase',
   'Кожна ваша характеристика збільшується на 1.',
   '+1 до кожної характеристики.',
   '{PASSIVE}', CURRENT_TIMESTAMP),

  ('Вік',
   'Human: Age',
   'Люди досягають повноліття наприкінці підліткового віку й живуть менше століття.',
   'Повноліття — наприкінці підліткового віку, життя — менше століття.',
   '{PASSIVE}', CURRENT_TIMESTAMP),

  ('Світогляд',
   'Human: Alignment',
   'Люди не тяжіють до жодного конкретного світогляду. Серед них трапляються і найкращі, і найгірші.',
   'Без тяжіння до конкретного світогляду.',
   '{PASSIVE}', CURRENT_TIMESTAMP)
ON CONFLICT (eng_name) DO UPDATE
  SET name              = EXCLUDED.name,
      description       = EXCLUDED.description,
      short_description = EXCLUDED.short_description,
      display_type      = EXCLUDED.display_type,
      updated_at        = CURRENT_TIMESTAMP;

-- Порядок рис на картці — це порядок race_trait_id: сортувального стовпця в таблиці немає.
-- Тому зв'язки для цих двох рас перескладаються цілком, у порядку книги. Видалення безпечне:
-- на race_trait ніщо не посилається, персонажі тримають feature через pers_feature.
DELETE FROM race_trait rt
 USING race r
 WHERE rt.race_id = r.race_id
   AND r.ruleset = 'RULES_2014'
   AND r.name::text IN ('CUSTOM_LINEAGE_TCE', 'HUMAN_2014');

INSERT INTO race_trait (race_id, feature_id, ruleset)
SELECT r.race_id, f.feature_id, r.ruleset
  FROM (VALUES
         ('CUSTOM_LINEAGE_TCE', 'Custom Lineage: Creature Type',           1),
         ('CUSTOM_LINEAGE_TCE', 'Custom Lineage: Ability Score Increase',  2),
         ('CUSTOM_LINEAGE_TCE', 'Custom Lineage: Feat',                    3),
         ('CUSTOM_LINEAGE_TCE', 'Custom Lineage: Variable Trait',          4),
         ('HUMAN_2014',         'Human: Ability Score Increase',           1),
         ('HUMAN_2014',         'Human: Age',                              2),
         ('HUMAN_2014',         'Human: Alignment',                        3)
       ) AS wanted(race_name, feature_eng_name, ord)
  JOIN race r ON r.name::text = wanted.race_name AND r.ruleset = 'RULES_2014'
  JOIN feature f ON f.eng_name = wanted.feature_eng_name
 ORDER BY wanted.race_name, wanted.ord;

DO $$
DECLARE
  empty_races text;
BEGIN
  SELECT string_agg(r.name::text, ', ')
    INTO empty_races
    FROM race r
   WHERE r.name::text IN ('CUSTOM_LINEAGE_TCE', 'HUMAN_2014')
     AND r.ruleset = 'RULES_2014'
     AND NOT EXISTS (SELECT 1 FROM race_trait rt WHERE rt.race_id = r.race_id);

  IF empty_races IS NOT NULL THEN
    RAISE EXCEPTION 'Раси лишилися без рис після сіду: %', empty_races;
  END IF;
END $$;

COMMIT;
