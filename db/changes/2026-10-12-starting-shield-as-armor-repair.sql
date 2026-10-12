-- Власник застосовує. Ремонт персонажів, у яких стартовий щит став основним обладунком (КБ 2).
-- Створення тепер ставить pers.wears_shield замість рядка pers_armor для щита.
-- Для кожного такого персонажа: носить щит; рядок щита без інфузій прибрано; надіто перший
-- звичайний обладунок, видачу якого перекрив щит.
BEGIN;

CREATE TEMP TABLE shield_as_armor ON COMMIT DROP AS
SELECT DISTINCT pa.pers_id
FROM pers_armor pa JOIN armor a ON a.armor_id = pa.armor_id
WHERE pa.equipped AND a.armor_type = 'SHIELD';

UPDATE pers SET wears_shield = true WHERE pers_id IN (SELECT pers_id FROM shield_as_armor);

UPDATE pers_armor pa SET equipped = false
FROM armor a
WHERE a.armor_id = pa.armor_id AND a.armor_type = 'SHIELD' AND pa.pers_id IN (SELECT pers_id FROM shield_as_armor);

DELETE FROM pers_armor pa
USING armor a
WHERE a.armor_id = pa.armor_id AND a.armor_type = 'SHIELD' AND pa.pers_id IN (SELECT pers_id FROM shield_as_armor)
  AND NOT EXISTS (SELECT 1 FROM pers_infusion pi WHERE pi.pers_armor_id = pa.pers_armor_id);

UPDATE pers_armor SET equipped = true
WHERE pers_armor_id IN (
  SELECT DISTINCT ON (pa.pers_id) pa.pers_armor_id
  FROM pers_armor pa JOIN armor a ON a.armor_id = pa.armor_id
  WHERE pa.pers_id IN (SELECT pers_id FROM shield_as_armor) AND a.armor_type IN ('LIGHT', 'MEDIUM', 'HEAVY')
  ORDER BY pa.pers_id, pa.pers_armor_id
);

SELECT count(*) AS repaired_characters FROM shield_as_armor;

COMMIT;
