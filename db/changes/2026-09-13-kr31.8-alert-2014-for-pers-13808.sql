-- KR31.8 / L16-ruleset-isolation-08 — єдина риса чужої редакції в робочій базі.
--
-- Персонаж 13808 (RULES_2014) має «Пильного» редакції 2024 (pers_feat 7191, додано до 2026-08-30,
-- виборів у рисі немає). Сервер тепер таку рису не приймає. Рішення власника 2026-09-13 — варіант А:
-- замінити на «Пильного» 2014 (+5 до ініціативи замість бонусу майстерності).
--
-- Порядок: власник застосовує файл до робочої бази. У spells_test персонажів гравців немає.

UPDATE pers_feat AS pf
SET feat_id = own.feat_id
FROM feat AS foreign_row, feat AS own
WHERE pf.pers_feat_id = 7191
  AND pf.pers_id = 13808
  AND pf.feat_id = foreign_row.feat_id
  AND foreign_row.ruleset = 'RULES_2024'
  AND foreign_row.name = 'ALERT'
  AND own.name = 'ALERT'
  AND own.ruleset = 'RULES_2014';
