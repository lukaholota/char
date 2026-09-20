-- O38 — стан «риса активна» (Лють, Велика форма). Застосовано власником на робочій базі 2026-09-19.
-- Після застосування на робочій базі: bun run db:pull.
ALTER TABLE pers_feature ADD COLUMN is_active boolean NOT NULL DEFAULT false;
