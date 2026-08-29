-- =============================================
-- Rebuild public.dobj so SELECT * returns columns in a stable order
-- =============================================
-- sys_* first → identifiers (entity_id, dobj_id) → domain fields → JSONB last.
--
-- Prerequisites (adjust INSERT if your table differs):
--   • 007 applied: sys_id PK, dobj_id GENERATED ALWAYS AS (sys_id).
--   • 005 applied: sys_status.
--   • 008 applied: sys_created_ts, sys_updated_ts, sys_created_by_id, sys_updated_by_id
--     (this script does NOT recreate the optional entity-scope dobj_* audit mirror columns from 008;
--      add them after rebuild if you use that migration.)
--
-- Before running:
--   1) Backup the database.
--   2) Drop or migrate any FOREIGN KEY that references public.dobj (same idea as step 1 in 007).
--   3) Note any triggers on public.dobj — recreate them on the new table after this script.
--   4) Verify column names with: SELECT column_name FROM information_schema.columns
--      WHERE table_schema = 'public' AND table_name = 'dobj' ORDER BY ordinal_position;
--
-- Grants: re-apply Supabase/Postgres grants on public.dobj if your project is not default.
-- =============================================

BEGIN;

-- RLS policies stay attached to dobj_old and are dropped with it. Re-apply
-- database/006_dobj_rls_allow_update.sql (and any Supabase dashboard policies) after this script.

ALTER TABLE public.dobj RENAME TO dobj_old;

-- PK / UNIQUE index names are unique in the schema; free the default names for the new table.
DO $$
DECLARE
    pkname text;
BEGIN
    SELECT c.conname
    INTO pkname
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public'
      AND r.relname = 'dobj_old'
      AND c.contype = 'p';
    IF pkname IS NOT NULL AND pkname <> 'dobj_old_pkey' THEN
        EXECUTE format('ALTER TABLE public.dobj_old RENAME CONSTRAINT %I TO dobj_old_pkey', pkname);
    END IF;
END $$;

DO $$
DECLARE
    uqname text;
BEGIN
    SELECT c.conname
    INTO uqname
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public'
      AND r.relname = 'dobj_old'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) LIKE '%dobj_id%'
    LIMIT 1;
    IF uqname IS NOT NULL AND uqname <> 'uq_dobj_old_dobj_id_mirror' THEN
        EXECUTE format(
            'ALTER TABLE public.dobj_old RENAME CONSTRAINT %I TO uq_dobj_old_dobj_id_mirror',
            uqname
        );
    END IF;
END $$;

CREATE TABLE public.dobj (
    sys_id bigint NOT NULL,
    sys_status smallint NOT NULL DEFAULT 1,
    sys_created_ts timestamptz,
    sys_updated_ts timestamptz,
    sys_created_by_id bigint,
    sys_updated_by_id bigint,
    entity_id bigint NOT NULL,
    dobj_id bigint GENERATED ALWAYS AS (sys_id) STORED,
    dobj_name_display text,
    dobj_name_system text,
    dobj_description text,
    dobj_type text,
    dobj_status text,
    "isCustom" integer NOT NULL DEFAULT 0,
    dobj_configuration jsonb,
    CONSTRAINT dobj_pkey PRIMARY KEY (sys_id),
    CONSTRAINT uq_dobj_dobj_id_mirror UNIQUE (dobj_id)
);

INSERT INTO public.dobj (
    sys_id,
    sys_status,
    sys_created_ts,
    sys_updated_ts,
    sys_created_by_id,
    sys_updated_by_id,
    entity_id,
    dobj_name_display,
    dobj_name_system,
    dobj_description,
    dobj_type,
    dobj_status,
    "isCustom",
    dobj_configuration
)
SELECT
    o.sys_id,
    o.sys_status,
    o.sys_created_ts,
    o.sys_updated_ts,
    o.sys_created_by_id,
    o.sys_updated_by_id,
    o.entity_id,
    o.dobj_name_display,
    o.dobj_name_system,
    o.dobj_description,
    o.dobj_type,
    o.dobj_status,
    o."isCustom",
    o.dobj_configuration
FROM public.dobj_old o;

DO $$
DECLARE
    n_new bigint;
    n_old bigint;
BEGIN
    SELECT COUNT(*) INTO n_new FROM public.dobj;
    SELECT COUNT(*) INTO n_old FROM public.dobj_old;
    IF n_new IS DISTINCT FROM n_old THEN
        RAISE EXCEPTION 'dobj reorder: row count mismatch (new %, old %)', n_new, n_old;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dobj_entity_sys_status ON public.dobj (entity_id, sys_status);

COMMENT ON COLUMN public.dobj.sys_id IS 'Primary key. Same value as dobj_id; use for INSERT/ON CONFLICT.';
COMMENT ON COLUMN public.dobj.dobj_id IS 'Generated copy of sys_id (read-only). Same value as sys_id — entity-facing id for joins and client references.';
COMMENT ON COLUMN public.dobj.entity_id IS 'Tenant / entity scope for this row.';

DROP TABLE public.dobj_old;

COMMIT;

-- Next steps: run database/006_dobj_rls_allow_update.sql if you use RLS on dobj, and restore any
-- extra policies from the Supabase dashboard. If your live table used different types (e.g. integer
-- dobj_status), adjust CREATE TABLE / INSERT above before running.
