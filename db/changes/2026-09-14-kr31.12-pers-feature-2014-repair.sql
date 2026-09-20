-- KR31.12 — рядки рис наявних персонажів 2014 за виправленими звʼязками класів і рас.
--
-- Звʼязки класів (`seed:class-feature-links`) і риси рас (`seed:race-traits`) у робочій базі вже
-- правильні, але лист персонажа малює риси з `pers_feature`, записаних при створенні й підвищенні
-- рівня. Персонажі, створені до виправлення, досі несуть старий стан. Рішення власника 2026-09-14.
--
-- Чотири правки, кожна повторює те, що конструктор і майстер рівня роблять тепер:
--   1) паладинська «Channel Divinity» у кліриків, які не паладини, — прибрати; власна
--      «Channel Divinity (Cleric)» у кожного з них є (умова в запиті);
--   2) порожня загальна «Spellcasting» — прибрати там, де є «Spellcasting (Wizard)»; жоден клас
--      її більше не дає;
--   3) «Turn Undead» — додати кожному, хто має «Channel Divinity (Cleric)»: обидві риси клірик
--      отримує на 2 рівні, тож носій другої — точний перелік тих, кому належить перша;
--   4) риси раси людини 2014 і Своєї раси — додати, як їх додає `creation-content.ts`: рядки
--      `race_trait` раси персонажа з рівнем не вище рівня персонажа. Риси варіанту людини в
--      `pers_feature` конструктор не пише й зараз — тут їх теж немає.
--
-- На `pers_feature` не посилається жодний зовнішній ключ. Повторний прогін нічого не змінює.
--
-- Порядок:
--   1) агент проганяє файл на повному клоні (spells_scratch) з лічильниками до й після;
--   2) власник застосовує файл до робочої бази;
--   3) spells_test — content-only клон, персонажів у ньому немає; синк не потрібен.

BEGIN;

DELETE FROM pers_feature pf
USING feature paladin_cd, feature cleric_cd, pers_feature has_cleric_cd
WHERE paladin_cd.eng_name = 'Channel Divinity'
  AND cleric_cd.eng_name = 'Channel Divinity (Cleric)'
  AND pf.feature_id = paladin_cd.feature_id
  AND has_cleric_cd.pers_id = pf.pers_id
  AND has_cleric_cd.feature_id = cleric_cd.feature_id
  AND NOT EXISTS (
    SELECT 1
    FROM class paladin
    WHERE paladin.eng_name = 'PALADIN_2014'
      AND (
        EXISTS (SELECT 1 FROM pers p WHERE p.pers_id = pf.pers_id AND p.class_id = paladin.class_id)
        OR EXISTS (SELECT 1 FROM pers_multiclass pm WHERE pm.pers_id = pf.pers_id AND pm.class_id = paladin.class_id)
      )
  );

DELETE FROM pers_feature pf
USING feature generic, feature wizard, pers_feature has_wizard
WHERE generic.eng_name = 'Spellcasting'
  AND wizard.eng_name = 'Spellcasting (Wizard)'
  AND pf.feature_id = generic.feature_id
  AND has_wizard.pers_id = pf.pers_id
  AND has_wizard.feature_id = wizard.feature_id;

INSERT INTO pers_feature (pers_id, feature_id)
SELECT has_cleric_cd.pers_id, turn_undead.feature_id
FROM pers_feature has_cleric_cd
JOIN feature cleric_cd ON cleric_cd.feature_id = has_cleric_cd.feature_id
CROSS JOIN feature turn_undead
WHERE cleric_cd.eng_name = 'Channel Divinity (Cleric)'
  AND turn_undead.eng_name = 'Turn Undead'
ON CONFLICT (pers_id, feature_id) DO NOTHING;

INSERT INTO pers_feature (pers_id, feature_id)
SELECT p.pers_id, rt.feature_id
FROM pers p
JOIN race r ON r.race_id = p.race_id
JOIN race_trait rt ON rt.race_id = r.race_id
WHERE r.name IN ('HUMAN_2014', 'CUSTOM_LINEAGE_TCE')
  AND p.ruleset = 'RULES_2014'
  AND rt.level <= p.level
ON CONFLICT (pers_id, feature_id) DO NOTHING;

COMMIT;
