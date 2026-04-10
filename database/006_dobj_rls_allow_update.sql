-- =============================================
-- Optional: allow UPDATE on public.dobj (soft delete / edit)
-- =============================================
-- If Row Level Security allows SELECT but not UPDATE, PostgREST updates match
-- zero rows and sys_status stays unchanged. Add a policy that permits UPDATE for
-- the same roles that should edit data (tighten for production).
-- =============================================

ALTER TABLE public.dobj ENABLE ROW LEVEL SECURITY;

-- Dev-style: mirror read access (replace USING/WITH CHECK with your rules)
DROP POLICY IF EXISTS "dobj allow update for authenticated" ON public.dobj;
CREATE POLICY "dobj allow update for authenticated"
    ON public.dobj
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- If you use anon for the SPA, uncomment instead:
-- DROP POLICY IF EXISTS "dobj allow update anon" ON public.dobj;
-- CREATE POLICY "dobj allow update anon"
--     ON public.dobj FOR UPDATE USING (true) WITH CHECK (true);
