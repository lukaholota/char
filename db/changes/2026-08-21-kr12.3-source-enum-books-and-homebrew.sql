-- KR12.3 — owner apply only. Do not run through Prisma migrate/db push.
-- Закриває сім питань про книги-джерела і питання «Extra (AideDD)» з
-- docs/o12-srd-2024-import/questions.md (рішення власника, 2026-08-21).
--
-- Сім пригодницьких книг, які aidedd цитує, а enum не мав. Усі 28 їхніх сторінок порожні
-- (дефект джерела «гола назва дії»), тож сьогодні вони не розблоковують жодного запису —
-- заводяться наперед, щоб питання не поверталося щопартії:
--   TOA                 — «Adventures (Tomb of Annihilation)», 6 сторінок
--   SKT                 — «Adventures (Storm King's Thunder)», 1
--   CM                  — «Adventures (Candlekeep Mysteries)», 3
--   WDMM                — «Adventures (Dungeon of the Mad Mage)», 3
--   QFTIS               — «Adventures (Quests from the Infinite Staircase)», 1
--   POTA                — «Adventures (Princes of the Apocalypse)», 4
--   CHAINS_OF_ASMODEUS  — «Extra (Chains of Asmodeus)», 10
--
-- HOMEBREW — власні вигадки aidedd («Extra (AideDD)», 5 сторінок). На відміну від решти, ці
-- п'ять мають ПОВНІ статблоки: ancient-shadow, venerable-shadow, mummified-warrior, devilroot,
-- reef-manta-ray. Значення повторює наявну конвенцію проєкту — HOMEBREW уже є в ArmorCategory,
-- EquipmentPackCategory і WeaponType як позначка неофіційного контенту всередині контрольованого
-- словника. Так записи лишаються в каталозі, але чесно марковані, а не видаються за канон.
--
-- ADD VALUE не переписує наявних рядків і не блокує таблицю — застосування безпечне на живій базі.
-- IF NOT EXISTS робить повторний запуск ідемпотентним.
--
-- Після застосування: `bun run db:pull` і коміт згенерованих артефактів.

ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'TOA';
ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'SKT';
ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'CM';
ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'WDMM';
ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'QFTIS';
ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'POTA';
ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'CHAINS_OF_ASMODEUS';
ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'HOMEBREW';
