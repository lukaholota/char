-- 2026-10-17, ремонт BUG-O49-HALF-ELF-DROW-MAGIC: напівельфи 2014 з вибором «Магія дроу» без заклинань раси.
-- Правило (SCAG, Half-Elf Variant: Drow Descent; 5etools races.json, «Variant; Drow Descent»): Dancing Lights з 1-го рівня,
-- Faerie Fire з 3-го, Darkness з 5-го, Харизма. Інші варіанти напівельфа цих заклинань не дають
-- (Moon/Sun Elf — замовляння на вибір гравця, Wood/Aquatic Elf — без заклинань).
-- Код виправлено 2026-10-10 (створення й підвищення рівня); до того персонажі заклинань не отримували.
--
-- Прод 2026-10-17, BEGIN READ ONLY, без користувачів 5 і 967: 63 персонажі з «Магією дроу», з них 22 живі (не снапшоти).
-- Ремонт — лише 22 живі; 41 снапшот (історія рівнів) не чіпаємо.
--   нових рядків 28: Dancing Lights ×12 (у 12 живих його немає), Faerie Fire ×10, Darkness ×6;
--   перемічено 16 ручних рядків (Р53: тримане гравцем стає расовим, поза лімітом): Dancing Lights ×10, Faerie Fire ×4, Darkness ×2.
--   Darkness у 7724 і 7734 уже дав підклас (SHADOW_MAGIC) — лишається підкласу.
-- Рядок такий самий, як пише buildSpeciesPersSpellRows: origin RACE, source_name HALF_ELF_2014, бейдж «Напівельф» #38bdf8,
-- підготовлене, поза лімітами; learned_at_level нового рядка — рівень правила (1/3/5), у переміченого лишається гравцевий.
-- Лише дані, DDL немає → `bun run db:pull` не потрібен. Повторний запуск нічого не змінює.

-- 1. Перевірка до: очікується 46 рядків: missing 28, own 16, rule 2.
WITH targets(pers_id) AS (VALUES (1107),(3137),(3169),(3321),(3765),(4798),(7724),(7734),(7754),(7809),(9321),
                                 (10233),(10660),(11570),(11877),(11878),(11879),(13136),(13373),(13742),(14015),(17066)),
     earned(eng_name, min_level) AS (VALUES ('Dancing Lights', 1), ('Faerie Fire', 3), ('Darkness', 5))
SELECT p.pers_id, p.level, e.eng_name,
       CASE WHEN ps.pers_spell_id IS NULL THEN 'missing'
            WHEN ps.origin <> 'MANUAL' AND ps.exclude_from_prepared_count THEN 'rule'
            ELSE 'own' END AS state
  FROM targets t
  JOIN pers p ON p.pers_id = t.pers_id
  JOIN earned e ON e.min_level <= p.level
  JOIN spell s ON s.eng_name = e.eng_name AND s.ruleset = 'RULES_2014'
  LEFT JOIN pers_spell ps ON ps.pers_id = p.pers_id AND ps.spell_id = s.spell_id
 ORDER BY p.pers_id, e.min_level;

-- 2. Ремонт.
BEGIN;

CREATE TEMP TABLE drow_magic_grant ON COMMIT DROP AS
WITH targets(pers_id) AS (VALUES (1107),(3137),(3169),(3321),(3765),(4798),(7724),(7734),(7754),(7809),(9321),
                                 (10233),(10660),(11570),(11877),(11878),(11879),(13136),(13373),(13742),(14015),(17066)),
     earned(eng_name, min_level) AS (VALUES ('Dancing Lights', 1), ('Faerie Fire', 3), ('Darkness', 5))
SELECT p.pers_id, s.spell_id, e.min_level
  FROM targets t
  JOIN pers p ON p.pers_id = t.pers_id AND p.ruleset = 'RULES_2014' AND NOT p.issnapshot
  JOIN race r ON r.race_id = p.race_id AND r.name = 'HALF_ELF_2014'
  JOIN "_PersToRaceChoiceOption" pc ON pc."A" = p.pers_id
  JOIN race_choice_option o ON o.option_id = pc."B" AND o.option_name = 'Магія дроу' AND o.race_id = r.race_id
  JOIN earned e ON e.min_level <= p.level
  JOIN spell s ON s.eng_name = e.eng_name AND s.ruleset = 'RULES_2014';

UPDATE pers_spell ps
   SET origin = 'RACE', source_name = 'HALF_ELF_2014', is_prepared = true,
       badge_text = 'Напівельф', badge_color = '#38bdf8',
       exclude_from_prepared_count = true, exclude_from_known_count = true, updated_at = now()
  FROM drow_magic_grant g
 WHERE ps.pers_id = g.pers_id AND ps.spell_id = g.spell_id
   AND NOT (ps.origin <> 'MANUAL' AND ps.exclude_from_prepared_count);

INSERT INTO pers_spell (pers_id, spell_id, learned_at_level, origin, source_name, is_prepared, badge_text, badge_color,
                        exclude_from_prepared_count, exclude_from_known_count, updated_at)
SELECT g.pers_id, g.spell_id, g.min_level, 'RACE', 'HALF_ELF_2014', true, 'Напівельф', '#38bdf8', true, true, now()
  FROM drow_magic_grant g
ON CONFLICT (pers_id, spell_id) DO NOTHING;

COMMIT;

-- 3. Перевірка після: 46 рядків, missing і own — 0; rule 46 (44 RACE HALF_ELF_2014 + 2 CLASS SHADOW_MAGIC).
WITH targets(pers_id) AS (VALUES (1107),(3137),(3169),(3321),(3765),(4798),(7724),(7734),(7754),(7809),(9321),
                                 (10233),(10660),(11570),(11877),(11878),(11879),(13136),(13373),(13742),(14015),(17066)),
     earned(eng_name, min_level) AS (VALUES ('Dancing Lights', 1), ('Faerie Fire', 3), ('Darkness', 5))
SELECT CASE WHEN ps.pers_spell_id IS NULL THEN 'missing'
            WHEN ps.origin <> 'MANUAL' AND ps.exclude_from_prepared_count THEN 'rule'
            ELSE 'own' END AS state,
       ps.origin, ps.source_name, count(*)
  FROM targets t
  JOIN pers p ON p.pers_id = t.pers_id
  JOIN earned e ON e.min_level <= p.level
  JOIN spell s ON s.eng_name = e.eng_name AND s.ruleset = 'RULES_2014'
  LEFT JOIN pers_spell ps ON ps.pers_id = p.pers_id AND ps.spell_id = s.spell_id
 GROUP BY 1, 2, 3
 ORDER BY 1, 2, 3;
