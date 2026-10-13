BEGIN;

ALTER TABLE public.pers
  ADD COLUMN source_build_id text,
  ADD COLUMN source_build_revision_id text,
  ADD CONSTRAINT pers_source_build_pair_check
    CHECK ((source_build_id IS NULL) = (source_build_revision_id IS NULL));

COMMIT;
