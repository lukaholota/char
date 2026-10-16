-- Нічний потік «правила», 2026-10-16, known-bugs-recheck: лічильники рис рас 2014 (BUG-023, BUG-030, BUG-034).
-- Звірено з data/5etools/raw/races.json:
--   · Goliath (MPMM) «Stone's Endurance» і Shifter (MPMM) «Shifting» — застосувань стільки, скільки Бонус Майстерності,
--     усі відновлюються після тривалого відпочинку (у проді SHORT_REST; старі VGM/ERLW-версії рас у базі не заведені);
--   · Dragonborn (Metallic, FTD) «Metallic Breath Weapon» — один раз до тривалого відпочинку (у проді SHORT_REST без кількості).
-- Сід (prisma/seed/raceFeatureSeed.ts, prisma/seed/subraceFeatureSeed.ts) і src/lib/generated/creator-content-2014.json
-- уже виправлені тими самими значеннями. Лише дані, DDL немає, тож `bun run db:pull` не потрібен.
-- Повторний запуск нічого не змінює: WHERE ловить лише старе SHORT_REST.
-- pers_feature.uses_remaining наявних персонажів не змінюється: після найближчого тривалого відпочинку лічильник стане повним.
-- Персонажі в проді 2026-10-16 (без користувачів 5 і 967): Голіаф MPMM 31, Перевертень MPMM 18, металічний драконороджений 6.

BEGIN;

UPDATE feature
   SET limited_uses_per = 'LONG_REST'
 WHERE feature_id = 1612 AND eng_name = 'Stone''s Endurance' AND ruleset = 'RULES_2014'
   AND limited_uses_per = 'SHORT_REST';

UPDATE feature
   SET limited_uses_per = 'LONG_REST', uses_count = 1
 WHERE feature_id = 5828 AND eng_name = 'Metallic Breath Weapon' AND ruleset = 'RULES_2014'
   AND limited_uses_per = 'SHORT_REST';

UPDATE feature
   SET limited_uses_per = 'LONG_REST', uses_count_depends_on_proficiency_bonus = true
 WHERE eng_name IN ('Shifting', 'Shifting: Beasthide', 'Shifting: Longtooth', 'Shifting: Swiftstride', 'Shifting: Wildhunt')
   AND ruleset = 'RULES_2014' AND limited_uses_per = 'SHORT_REST';

COMMIT;

-- Перевірка: сім рядків, усі LONG_REST; 1612 і п'ять Shifting — з Бонусом Майстерності, 5828 — uses_count = 1.
SELECT feature_id, eng_name, limited_uses_per, uses_count, uses_count_depends_on_proficiency_bonus
  FROM feature
 WHERE eng_name IN ('Stone''s Endurance', 'Metallic Breath Weapon', 'Shifting', 'Shifting: Beasthide',
                    'Shifting: Longtooth', 'Shifting: Swiftstride', 'Shifting: Wildhunt')
 ORDER BY feature_id;
