-- BUG-004 / BUG-005 — друга, дубльована група вибору у 30 рисах 2014 і в Адепті стихій.
--
-- Кожна з цих рис несла дві групи з тими самими опціями. Лишається та, яку носять гравці
-- («Характеристика …», «Характеристика для Стійкості», «Стихія Адепта»); її ефекти вже записав
-- `bun run seed:feat-choice-options:prod`. Видаляються:
--   * група «… (здібність)» у 29 половинних рисах і Стійкому — 80 опцій;
--   * група «Elemental Adept (тип пошкодження)» — 5 опцій.
--
-- Гравців торкаються лише повтори: персонаж, який вибрав і в живій групі, і в дублікаті.
--   * Стійкий — 3 рядки (один персонаж зі знімками рівнів, Мудрість двічі);
--   * Адепт стихій — 30 рядків: конструктор показував обидва вікна. Користувач 370 вибрав у них
--     Холод і Блискавку; лишається Холод — перший вибір, рішення власника 2026-09-15;
--   * Адепт стихій у `_ChoiceOptionToPers` — 25 рядків, у кожного персонажа поруч та сама
--     стихія з живої групи.
-- Вибір у дублікаті без пари в живій групі зупиняє файл.
--
-- Порядок:
--   1) агент проганяє файл на spells_test (у ньому немає персонажів — перевіряє вміст);
--   2) власник застосовує файл до робочої бази;
--   3) повторний прогін нічого не змінює.

BEGIN;

CREATE TEMP TABLE duplicate_feat_option ON COMMIT DROP AS
SELECT DISTINCT co.option_id, fco.feat_id
FROM choice_option co
JOIN feat_choice_option fco ON fco.choice_option_id = co.option_id
JOIN feat f ON f.feat_id = fco.feat_id AND f.ruleset = 'RULES_2014'
WHERE co.group_name ~ '\(здібність\)$'
   OR (f.name = 'ELEMENTAL_ADEPT' AND co.group_name = 'Elemental Adept (тип пошкодження)');

DO $$
DECLARE
  unpaired integer;
  linked_elsewhere integer;
BEGIN
  SELECT count(*) INTO unpaired
  FROM pers_feat_choice pfc
  JOIN duplicate_feat_option d ON d.option_id = pfc.choice_option_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM pers_feat_choice kept
    JOIN feat_choice_option kept_link ON kept_link.choice_option_id = kept.choice_option_id AND kept_link.feat_id = d.feat_id
    WHERE kept.pers_feat_id = pfc.pers_feat_id
      AND kept.choice_option_id NOT IN (SELECT option_id FROM duplicate_feat_option)
  );
  IF unpaired > 0 THEN
    RAISE EXCEPTION '% вибір(ів) у дублікаті без пари в живій групі — зупинено', unpaired;
  END IF;

  SELECT count(*) INTO unpaired
  FROM "_ChoiceOptionToPers" m
  JOIN duplicate_feat_option d ON d.option_id = m."A"
  WHERE NOT EXISTS (
    SELECT 1
    FROM "_ChoiceOptionToPers" kept
    JOIN feat_choice_option kept_link ON kept_link.choice_option_id = kept."A" AND kept_link.feat_id = d.feat_id
    WHERE kept."B" = m."B"
      AND kept."A" NOT IN (SELECT option_id FROM duplicate_feat_option)
  );
  IF unpaired > 0 THEN
    RAISE EXCEPTION '% рядків _ChoiceOptionToPers на дублікат без пари в живій групі — зупинено', unpaired;
  END IF;

  SELECT (SELECT count(*) FROM class_choice_option WHERE choice_option_id IN (SELECT option_id FROM duplicate_feat_option))
       + (SELECT count(*) FROM subclass_choice_option WHERE choice_option_id IN (SELECT option_id FROM duplicate_feat_option))
       + (SELECT count(*) FROM feat_choice_option WHERE choice_option_id IN (SELECT option_id FROM duplicate_feat_option)
            AND feat_id NOT IN (SELECT feat_id FROM duplicate_feat_option))
  INTO linked_elsewhere;
  IF linked_elsewhere > 0 THEN
    RAISE EXCEPTION '% звʼязків дубліката поза цими рисами — зупинено', linked_elsewhere;
  END IF;
END $$;

DELETE FROM pers_feat_choice
WHERE choice_option_id IN (SELECT option_id FROM duplicate_feat_option);

DELETE FROM "_ChoiceOptionToPers"
WHERE "A" IN (SELECT option_id FROM duplicate_feat_option);

DELETE FROM choice_option
WHERE option_id IN (SELECT option_id FROM duplicate_feat_option);

SELECT
  (SELECT count(*) FROM duplicate_feat_option) AS removed_options,
  (SELECT count(*) FROM choice_option co JOIN feat_choice_option fco ON fco.choice_option_id = co.option_id
     JOIN feat f ON f.feat_id = fco.feat_id AND f.ruleset = 'RULES_2014'
     WHERE co.group_name ~ '\(здібність\)$' OR co.group_name = 'Elemental Adept (тип пошкодження)') AS left_duplicates;

COMMIT;
