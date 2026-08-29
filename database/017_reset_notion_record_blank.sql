-- Reset one NotionNest record to a blank page document (run in Supabase SQL editor).
-- Record: ddata_id = 100000000004 (adjust if needed).

UPDATE public.ddata
SET
    ddata_values = jsonb_set(
        COALESCE(ddata_values, '{}'::jsonb),
        '{__notion_page}',
        jsonb_build_object(
            'version', 1,
            'icon', '📄',
            'coverUrl', '',
            'fullWidth', false,
            'smallText', false,
            'blocks', '[]'::jsonb,
            'updatedAt', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        ),
        true
    ),
    ddata_updated_at = now()
WHERE ddata_id = 100000000004
  AND ddata_status = 1;
