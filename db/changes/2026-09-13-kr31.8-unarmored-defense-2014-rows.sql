-- KR31.8 / L16-ruleset-isolation-01 — персонажі 2014 із рядком «Захист без обладунків» редакції 2024.
--
-- Створення персонажа шукало UNARMORED_DEFENSE_MONK / _BARBARIAN за назвою без фільтра редакції,
-- а з 2026-09-08 (сід рядків 2024 для KR27.8) назва трапляється двічі — і монах чи варвар 2014
-- діставав рядок 2024. Виміряно в робочій базі 2026-09-13: 21 монах і 16 варварів, створені
-- 2026-09-08…12; жоден не має обох рядків одночасно. Формула в обох рядках однакова
-- (10 + СПР + МДР / СТА), тож КЗ не мінявся — це ідентифікатор, а не число.
-- Код виправлено тим самим KR (`ruleset` у запиті character-creation.ts).
--
-- Порядок:
--   1) власник застосовує файл до робочої бази;
--   2) агент синкає spells_test через ./scripts/apply-db-change.sh.

UPDATE pers_armor AS pa
SET armor_id = own.armor_id
FROM pers AS p, armor AS foreign_row, armor AS own
WHERE pa.pers_id = p.pers_id
  AND pa.armor_id = foreign_row.armor_id
  AND p.ruleset = 'RULES_2014'
  AND foreign_row.ruleset = 'RULES_2024'
  AND foreign_row.name IN ('UNARMORED_DEFENSE_MONK', 'UNARMORED_DEFENSE_BARBARIAN')
  AND own.name = foreign_row.name
  AND own.ruleset = 'RULES_2014';
