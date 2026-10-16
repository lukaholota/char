-- Нічний потік «правила», 2026-10-16, known-bugs-recheck: звʼязки «риса → заклинання» геназі MPMM (залишок BUG-019).
-- MPMM: Call to the Wave — Acid Splash, Create or Destroy Water (3-й рівень), Water Walk (5-й);
--       Reach to the Blaze — Produce Flame, Burning Hands (3-й), Flame Blade (5-й).
-- У проді «_FeatureToSpell» досі тримає Shape Water і Water Breathing (вода) та Flaming Sphere (вогонь).
-- Видачу заклинань персонажам 2014 ці звʼязки не визначають: її веде data/2014/race-granted-spells.json (там усе правильно),
-- а givesSpells риси 2014 лише позначає, що риса — джерело заклинань. Тому це вирівнювання каталогу, не ремонт персонажів.
-- Прод 2026-10-16 (без користувачів 5 і 967): 11 персонажів геназі води й вогню, у жодного немає хибного расового рядка
-- pers_spell (Shape Water у трьох — власний вибір: MANUAL ×2, клас Друїда ×1), тож pers_spell цей файл не чіпає.
-- Сід (prisma/seed/raceFeatureSeed.ts) уже виправлено. Лише дані, DDL немає → `bun run db:pull` не потрібен. Повторний запуск безпечний.

BEGIN;

DELETE FROM "_FeatureToSpell" fs
 USING feature f, spell s
 WHERE fs."A" = f.feature_id AND fs."B" = s.spell_id
   AND f.ruleset = 'RULES_2014' AND s.ruleset = 'RULES_2014'
   AND ((f.eng_name = 'Call to the Wave' AND s.eng_name IN ('Shape Water', 'Water Breathing'))
     OR (f.eng_name = 'Reach to the Blaze' AND s.eng_name = 'Flaming Sphere'));

INSERT INTO "_FeatureToSpell" ("A", "B")
SELECT f.feature_id, s.spell_id
  FROM feature f
  JOIN spell s ON s.ruleset = 'RULES_2014'
 WHERE f.ruleset = 'RULES_2014'
   AND ((f.eng_name = 'Call to the Wave' AND s.eng_name IN ('Acid Splash', 'Create or Destroy Water', 'Water Walk'))
     OR (f.eng_name = 'Reach to the Blaze' AND s.eng_name IN ('Produce Flame', 'Burning Hands', 'Flame Blade')))
ON CONFLICT DO NOTHING;

COMMIT;

-- Перевірка: по три заклинання на кожну рису, жодного Shape Water / Water Breathing / Flaming Sphere.
SELECT f.eng_name, string_agg(s.eng_name, ', ' ORDER BY s.eng_name) AS spells
  FROM feature f
  JOIN "_FeatureToSpell" fs ON fs."A" = f.feature_id
  JOIN spell s ON s.spell_id = fs."B"
 WHERE f.eng_name IN ('Call to the Wave', 'Reach to the Blaze')
 GROUP BY f.eng_name
 ORDER BY f.eng_name;
