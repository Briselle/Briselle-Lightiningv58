-- =============================================
-- NotionNest — Positional Undo Version Checkpoints
-- =============================================
-- Stores periodic snapshots of NotionNest page state for positional undo.
-- Every 50th save creates a checkpoint that persists across sessions.
-- Safe to re-run: uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS public.notion_page_versions (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ddata_id      bigint NOT NULL REFERENCES public.ddata(ddata_id) ON DELETE CASCADE,
    save_number   integer NOT NULL,
    version_data  jsonb NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast lookup by page and by save number
CREATE INDEX IF NOT EXISTS idx_npv_ddata_id ON public.notion_page_versions(ddata_id);
CREATE INDEX IF NOT EXISTS idx_npv_ddata_save ON public.notion_page_versions(ddata_id, save_number);

-- Row-Level Security
ALTER TABLE public.notion_page_versions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (matches ddata RLS patterns)
DROP POLICY IF EXISTS npv_auth_all ON public.notion_page_versions;
CREATE POLICY npv_auth_all ON public.notion_page_versions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow service role full access
DROP POLICY IF EXISTS npv_service_all ON public.notion_page_versions;
CREATE POLICY npv_service_all ON public.notion_page_versions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.notion_page_versions IS
    'NotionNest page version checkpoints for positional undo. Created every 50th auto-save.';
COMMENT ON COLUMN public.notion_page_versions.ddata_id IS
    'FK to ddata.ddata_id — the NotionNest page record.';
COMMENT ON COLUMN public.notion_page_versions.save_number IS
    'Sequential save number when this checkpoint was created (e.g., 50, 100, 150).';
COMMENT ON COLUMN public.notion_page_versions.version_data IS
    'Full NotionPagePayload snapshot at this checkpoint.';
