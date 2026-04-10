-- =============================================
-- Soft-delete lifecycle column for public.dobj (ObjectLoader)
-- =============================================
-- Run once before relying on client soft delete + active-only list filter.
-- smallint: 1 = listed in ObjectLoader; 0 = soft-removed from UI (still in DB).
-- Do not use btrim() here — it is for text only; btrim(smallint) errors with 42883.
-- =============================================

ALTER TABLE public.dobj
    ADD COLUMN IF NOT EXISTS sys_status smallint NOT NULL DEFAULT 1;

UPDATE public.dobj
SET sys_status = 1
WHERE sys_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_dobj_entity_sys_status ON public.dobj (entity_id, sys_status);

COMMENT ON COLUMN public.dobj.sys_status IS 'ObjectLoader lifecycle: 1 = listed; 0 = soft-deleted from UI';
