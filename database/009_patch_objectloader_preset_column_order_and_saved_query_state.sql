-- =============================================
-- Patch ObjectLoader presets: canonical column order + full savedQueryState
-- =============================================
-- Run in Supabase SQL Editor (or psql) against the project database.
--
-- What this does
--   • For each row in platform_config with config_type = 3 (ObjectLoader) that has
--     config_json.presets[], updates EVERY preset entry:
--       - config.savedQueryState  → full default query state (sys_* first, identifiers,
--         then domain fields, JSONB last — matches recommended SELECT * column order)
--       - config.columnOrder      → same order (keeps JSON tools / exports aligned)
--       - config.visibleColumns   → same list (all visible by default; users can hide in UI)
--   • Does NOT change physical column order on public.dobj (Postgres has no one-liner
--     for that; SELECT * order follows table definition and rarely matters for APIs).
--
-- Adjust scope (optional)
--   • Remove the AND entity_id / dobj_id lines below to patch every ObjectLoader document.
--   • Edit canonical_columns (text[]) if your page fieldMappings differ — keys not in
--     fieldMappings are ignored client-side by sanitizeTableQueryState.
--
-- Prerequisites
--   • Include entity-mirror audit column keys below only if migration 008 is applied.
-- =============================================

DO $$
DECLARE
    r RECORD;
    rec RECORD;
    p jsonb;
    new_presets jsonb;
    cfg jsonb;
    cols jsonb;
    sq jsonb;
BEGIN
    -- 1) sys_* first → identifiers → domain → JSONB (align with 010_reorder_dobj_columns_select_star.sql).
    cols := to_jsonb(ARRAY[
        'sys_id',
        'sys_status',
        'sys_created_ts',
        'sys_updated_ts',
        'sys_created_by_id',
        'sys_updated_by_id',
        'entity_id',
        'dobj_id',
        'dobj_name_display',
        'dobj_name_system',
        'dobj_description',
        'dobj_type',
        'dobj_status',
        'isCustom',
        'dobj_configuration',
        'dobj_created_at',
        'dobj_updated_at',
        'dobj_created_by_id',
        'dobj_modified_by_id'
    ]::text[]);

    sq := jsonb_build_object(
        'searchTerm', to_jsonb(''::text),
        'sortCriteria', '[]'::jsonb,
        'filterCriteria', '[]'::jsonb,
        'groupByColumn', 'null'::jsonb,
        'columnOrder', cols,
        'visibleColumns', cols,
        'activeColumns', cols
    );

    FOR r IN
        SELECT config_id, config_json
        FROM platform_config
        WHERE config_type = 3
          AND jsonb_typeof(config_json -> 'presets') = 'array'
          -- Narrow to seeded ObjectLoader scope (comment out to patch all ObjectLoader rows):
          AND entity_id = 1000000000
          AND dobj_id = 1000000001
    LOOP
        new_presets := '[]'::jsonb;

        FOR rec IN
            SELECT value
            FROM jsonb_array_elements(r.config_json -> 'presets') AS t(value)
        LOOP
            p := rec.value;
            IF p ? 'config' THEN
                cfg := p -> 'config';
                cfg := cfg
                    || jsonb_build_object(
                        'savedQueryState', sq,
                        'columnOrder', cols,
                        'visibleColumns', cols
                    );
                p := jsonb_set(p, '{config}', cfg, true);
            END IF;

            new_presets := new_presets || jsonb_build_array(p);
        END LOOP;

        UPDATE platform_config
        SET
            config_json = jsonb_set(r.config_json, '{presets}', new_presets, true),
            lastmodified_ts = now()
        WHERE config_id = r.config_id;
    END LOOP;
END $$;

-- Optional: show first preset’s saved column count after patch
-- SELECT
--     config_id,
--     entity_id,
--     dobj_id,
--     jsonb_array_length(
--         config_json #> '{presets,0,config,savedQueryState,columnOrder}'
--     ) AS first_preset_column_count
-- FROM platform_config
-- WHERE config_type = 3
--   AND entity_id = 1000000000
--   AND dobj_id = 1000000001;
