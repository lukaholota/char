-- KR31.15 / L14-bastions-08 — наказ «Утримання» віддається всьому бастіону, а не приміщенню.
--
-- DMG 2024, розділ 8, «Orders»: «The Maintain order is unusual; it is issued to the whole Bastion
-- rather than to one or more special facilities. … Issuing this order prohibits other orders from
-- being issued to the Bastion on the current Bastion turn.»
-- Рішення власника 2026-09-14: окремий перемикач на весь бастіон. Приміщення «Утримання» більше
-- не пропонують; на робочій базі 2026-09-14 бастіонів 0, тож переносити наявні накази нема чого.
--
-- Порядок: власник застосовує файл до робочої бази ДО деплою коду, потім bun run db:pull.
-- Старий код нового стовпця не помічає, тож вікна немає.

ALTER TABLE "pers_bastion" ADD COLUMN IF NOT EXISTS "is_maintaining" BOOLEAN NOT NULL DEFAULT false;
