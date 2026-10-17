-- Пресети 2014: привʼязати до білда персонажів, створених із пресета до появи колонок
-- pers.source_build_id / source_build_revision_id (реліз 89e61148 12.10 17:05 UTC — деплой c6ae786b 13.10 20:44 UTC).
-- Без цього вони не бачать «За гайдом». Лише дані, DDL немає; `bun run db:pull` не потрібен.
-- Ознака створення з пресета — рядок pers_offline_operation ('ready_preset_create' / 'build_assembly_create'),
-- білд — єдиний рецепт із тим самим класом, расою й передісторією; ревізія — єдина, що існувала з релізу.
--   17954 Воїн, Містичний лицар (рівень 1)          17966 Воїн, Містичний лучник (рівень 1)
--   18001, 18002 Друїд, Коло снів, гітцерай (1 і 7)
-- 17966, 18001, 18002 належать користувачу 10: якщо це тестовий акаунт, приберіть їх із VALUES.
-- Очікування: перший SELECT — 4 рядки з порожніми source_*; UPDATE 4; останній SELECT — 4 привʼязки.
-- Повторний запуск дає UPDATE 0. Перевірено в BEGIN…ROLLBACK на локальній тестовій базі (форма запиту).

BEGIN;

SELECT p.pers_id, p.user_id, p.ruleset::text AS ruleset, p.level, c.eng_name::text AS class_name, r.name::text AS race_name, b.name::text AS background_name,
       p.source_build_id, p.source_build_revision_id,
       (SELECT string_agg(o.operation_kind, ',') FROM pers_offline_operation o WHERE o.pers_id = p.pers_id AND o.operation_kind IN ('ready_preset_create', 'build_assembly_create')) AS creation_kind
FROM pers p
JOIN class c ON c.class_id = p.class_id
JOIN race r ON r.race_id = p.race_id
JOIN background b ON b.background_id = p.background_id
WHERE p.pers_id IN (17954, 17966, 18001, 18002)
ORDER BY p.pers_id;

UPDATE pers p
SET source_build_id = v.build_id,
    source_build_revision_id = v.revision_id
FROM (VALUES
  (17954, 'FIGHTER_2014', 'CUSTOM_LINEAGE_TCE', 'FOLK_HERO',    'build-fighter-eldritch-knight-2014', 'build-fighter-eldritch-knight-2014-v3'),
  (17966, 'FIGHTER_2014', 'ELF_2014',           'URCHIN',       'build-fighter-arcane-archer-2014',   'build-fighter-arcane-archer-2014-v3'),
  (18001, 'DRUID_2014',   'GITHZERAI_MPMM',     'FAR_TRAVELER', 'build-druid-dreams-githzerai-2014',  'build-druid-dreams-githzerai-2014-v2'),
  (18002, 'DRUID_2014',   'GITHZERAI_MPMM',     'FAR_TRAVELER', 'build-druid-dreams-githzerai-2014',  'build-druid-dreams-githzerai-2014-v2')
) AS v(pers_id, class_name, race_name, background_name, build_id, revision_id),
class c, race r, background b
WHERE p.pers_id = v.pers_id
  AND c.class_id = p.class_id AND c.eng_name::text = v.class_name
  AND r.race_id = p.race_id AND r.name::text = v.race_name
  AND b.background_id = p.background_id AND b.name::text = v.background_name
  AND p.ruleset = 'RULES_2014'
  AND p.source_build_id IS NULL
  AND p.source_build_revision_id IS NULL
  AND EXISTS (SELECT 1 FROM pers_offline_operation o WHERE o.pers_id = p.pers_id AND o.operation_kind IN ('ready_preset_create', 'build_assembly_create'));

SELECT pers_id, source_build_id, source_build_revision_id FROM pers WHERE pers_id IN (17954, 17966, 18001, 18002) ORDER BY pers_id;

COMMIT;
