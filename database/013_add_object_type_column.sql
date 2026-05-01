-- =============================================
-- Add object-level Object Type on public.dobj
-- =============================================
-- Values:
--   list (default)
--   transaction
--   hierarchy
--
-- Also clarifies existing `dobj_type` semantics as Creation Type.
-- =============================================

ALTER TABLE public.dobj
    ADD COLUMN IF NOT EXISTS object_type text NOT NULL DEFAULT 'list';

UPDATE public.dobj
SET object_type = 'list'
WHERE object_type IS NULL OR btrim(object_type) = '';

ALTER TABLE public.dobj
    DROP CONSTRAINT IF EXISTS ck_dobj_object_type;

ALTER TABLE public.dobj
    ADD CONSTRAINT ck_dobj_object_type
    CHECK (object_type IN ('list', 'transaction', 'hierarchy'));

COMMENT ON COLUMN public.dobj.object_type IS
    'Object-level behavior mode from UI: list | transaction | hierarchy.';

COMMENT ON COLUMN public.dobj.dobj_type IS
    'Creation Type (system/custom) for object definition origin.';

