-- Власник застосовує поза транзакцією; після цього — bun run db:pull.
-- Виміри: docs/performance/2026-09-26-character-indexes/README.md.

CREATE INDEX CONCURRENTLY IF NOT EXISTS pers_weapon_pers_id_idx
    ON public.pers_weapon (pers_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS pers_armor_pers_id_idx
    ON public.pers_armor (pers_id);
