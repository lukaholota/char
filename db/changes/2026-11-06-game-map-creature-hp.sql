-- O51: хіти істоти на мапі. Кидаються з формули статблоку при додаванні; бачить і міняє лише майстер.
-- null в обох колонках — старі рядки: хіти беруться зі статблоку, істота ціла.
BEGIN;
ALTER TABLE public.game_map_creature
  ADD COLUMN hp_max smallint,
  ADD COLUMN hp_current smallint,
  ADD CONSTRAINT game_map_creature_hp_check CHECK (
    (hp_max IS NULL AND hp_current IS NULL)
    OR (hp_max IS NOT NULL AND hp_current IS NOT NULL AND hp_max >= 1 AND hp_current >= 0 AND hp_current <= hp_max)
  );
COMMIT;
