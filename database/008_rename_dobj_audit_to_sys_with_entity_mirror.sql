-- =============================================
-- public.dobj: rename audit columns to sys_* + entity-scope GENERATED mirrors (same values)
-- =============================================
-- Run AFTER 007_rename_dobj_pk_to_sys_id_generated_dobj_id.sql (sys_id / generated dobj_id).
-- PostgreSQL 12+ (GENERATED ... STORED).
--
-- Renames:
--   dobj_created_at      -> sys_created_ts       ; dobj_created_at      GENERATED AS (sys_created_ts)
--   dobj_updated_at      -> sys_updated_ts       ; dobj_updated_at      GENERATED AS (sys_updated_ts)
--   dobj_created_by_id   -> sys_created_by_id    ; dobj_created_by_id   GENERATED AS (sys_created_by_id)
--   dobj_modified_by_id  -> sys_updated_by_id    ; dobj_modified_by_id  GENERATED AS (sys_updated_by_id)
--
-- INSERT/UPDATE: use sys_* columns only; the dobj_* names above are read-only generated copies
-- (same values) for entity-facing APIs or clients that still read those column names.
-- If you have triggers referencing old names, update them after this migration.
-- =============================================

ALTER TABLE public.dobj RENAME COLUMN dobj_created_at TO sys_created_ts;
ALTER TABLE public.dobj
    ADD COLUMN dobj_created_at timestamptz GENERATED ALWAYS AS (sys_created_ts) STORED;

ALTER TABLE public.dobj RENAME COLUMN dobj_updated_at TO sys_updated_ts;
ALTER TABLE public.dobj
    ADD COLUMN dobj_updated_at timestamptz GENERATED ALWAYS AS (sys_updated_ts) STORED;

ALTER TABLE public.dobj RENAME COLUMN dobj_created_by_id TO sys_created_by_id;
ALTER TABLE public.dobj
    ADD COLUMN dobj_created_by_id bigint GENERATED ALWAYS AS (sys_created_by_id) STORED;

ALTER TABLE public.dobj RENAME COLUMN dobj_modified_by_id TO sys_updated_by_id;
ALTER TABLE public.dobj
    ADD COLUMN dobj_modified_by_id bigint GENERATED ALWAYS AS (sys_updated_by_id) STORED;

COMMENT ON COLUMN public.dobj.sys_created_ts IS 'Canonical created timestamp; use in INSERT/UPDATE.';
COMMENT ON COLUMN public.dobj.dobj_created_at IS 'Entity-scope generated copy of sys_created_ts (read-only; same value).';
COMMENT ON COLUMN public.dobj.sys_updated_ts IS 'Canonical updated timestamp; use in INSERT/UPDATE.';
COMMENT ON COLUMN public.dobj.dobj_updated_at IS 'Entity-scope generated copy of sys_updated_ts (read-only; same value).';
COMMENT ON COLUMN public.dobj.sys_created_by_id IS 'Canonical created-by id; use in INSERT/UPDATE.';
COMMENT ON COLUMN public.dobj.dobj_created_by_id IS 'Entity-scope generated copy of sys_created_by_id (read-only; same value).';
COMMENT ON COLUMN public.dobj.sys_updated_by_id IS 'Canonical updated-by id (renamed from dobj_modified_by_id).';
COMMENT ON COLUMN public.dobj.dobj_modified_by_id IS 'Entity-scope generated copy of sys_updated_by_id (read-only; same value).';
