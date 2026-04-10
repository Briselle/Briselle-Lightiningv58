-- =============================================
-- public.dobj: rename PK column dobj_id -> sys_id
-- add dobj_id as GENERATED mirror of sys_id (read-only, always in sync)
-- =============================================
-- Requires PostgreSQL 12+ (GENERATED ... STORED).
-- Idempotent: safe if sys_id / generated dobj_id already exist (re-run or partial apply).
--
-- After this:
--   - Primary key column is sys_id (same values as old dobj_id).
--   - dobj_id is computed as a duplicate of sys_id (same value) for client-facing references and platform_config.dobj_id parity.
--   - INSERT / ON CONFLICT must target sys_id, not dobj_id (generated columns cannot be inserted).
--
-- platform_config.dobj_id is unchanged (still stores the same bigint; no FK required).
-- =============================================

-- 1) Drop foreign keys that reference public.dobj — only when we will rename the PK column
DO $$
DECLARE
    r RECORD;
    need_rename boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'dobj'
          AND c.column_name = 'dobj_id'
          AND c.is_generated = 'NEVER'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'dobj'
          AND c.column_name = 'sys_id'
    )
    INTO need_rename;

    IF need_rename THEN
        FOR r IN
            SELECT c.conname, c.conrelid::regclass AS src_tbl
            FROM pg_constraint c
            WHERE c.confrelid = 'public.dobj'::regclass
              AND c.contype = 'f'
        LOOP
            EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.src_tbl, r.conname);
            RAISE NOTICE 'Dropped FK % on %', r.conname, r.src_tbl;
        END LOOP;
    END IF;
END $$;

-- 2) Rename primary key column (only if physical dobj_id still exists and sys_id does not)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'dobj'
          AND c.column_name = 'dobj_id'
          AND c.is_generated = 'NEVER'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'dobj'
          AND c.column_name = 'sys_id'
    ) THEN
        ALTER TABLE public.dobj RENAME COLUMN dobj_id TO sys_id;
    END IF;
END $$;

-- 3) Mirror column (duplicate of sys_id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'dobj'
          AND c.column_name = 'sys_id'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'dobj'
          AND c.column_name = 'dobj_id'
    ) THEN
        ALTER TABLE public.dobj
            ADD COLUMN dobj_id bigint GENERATED ALWAYS AS (sys_id) STORED;
    END IF;
END $$;

-- 4) Unique on mirror (optional FK target)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'dobj'
          AND con.conname = 'uq_dobj_dobj_id_mirror'
    ) THEN
        ALTER TABLE public.dobj
            ADD CONSTRAINT uq_dobj_dobj_id_mirror UNIQUE (dobj_id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint uq_dobj_dobj_id_mirror already exists or dobj_id not ready; skipped.';
    WHEN undefined_column THEN
        RAISE NOTICE 'Column dobj_id missing; skipped unique constraint.';
END $$;

COMMENT ON COLUMN public.dobj.sys_id IS 'Primary key (renamed from dobj_id). Use in INSERT/ON CONFLICT.';
COMMENT ON COLUMN public.dobj.dobj_id IS 'Generated copy of sys_id (read-only). Same value — entity-facing id; platform_config.dobj_id may reference this.';

-- 5) Recreate FKs you dropped in step 1, e.g. REFERENCES public.dobj (sys_id) or public.dobj (dobj_id).
-- 6) Optional next: database/008_rename_dobj_audit_to_sys_with_entity_mirror.sql (audit sys_* + optional entity-scope name mirrors).
