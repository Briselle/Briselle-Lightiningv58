-- =============================================
-- OPTIONAL: Add activeTabId + objectTabBar to an EXISTING platform_config row
-- =============================================
-- Use this if you already inserted data from an older 002_seed_presets.sql that did
-- not include objectTabBar / activeTabId. The app does not auto-call "Restore Default"
-- on first load; fresh seeds (current 002) already include these fields.
--
-- This copies tab-related keys from the Default preset's config (presets[].id = 'default')
-- up to the document root, then removes those keys from every preset's config.
--
-- Scope: entity 1000000000, dobj 1000000001, config_type 3 (ObjectLoader)
-- =============================================

DO $$
DECLARE
    row_id bigint;
    doc jsonb;
    def_cfg jsonb;
    tab_bar jsonb;
    presets jsonb;
    i int;
    cfg jsonb;
    k text;
    tab_keys text[] := ARRAY[
        'enableTabs', 'tabList', 'tabBarPlacement', 'tabMenuStyle', 'tabOrientation',
        'tabHeight', 'tabAlignment', 'tabLabelWidth', 'tabPanelSpacing', 'tabPanelMarginTop',
        'tabPanelBackground', 'tabUseCustomPanelBackground', 'tabPanelBackgroundColor',
        'tabCustomSelection', 'tabSelectionColor', 'tabCustomHover', 'tabHoverColor',
        'tabStyle', 'tabShowUnderline', 'tabIconSize', 'tabGap'
    ];
BEGIN
    SELECT config_id, config_json INTO row_id, doc
    FROM platform_config
    WHERE entity_id = 1000000000
      AND dobj_id = 1000000001
      AND config_type = 3
    LIMIT 1;

    IF row_id IS NULL THEN
        RAISE NOTICE 'No platform_config row found for entity 1000000000 / dobj 1000000001 / type 3 — run 002_seed_presets.sql instead.';
        RETURN;
    END IF;

    IF doc ? 'objectTabBar' AND jsonb_typeof(doc->'objectTabBar') = 'object'
       AND doc->'objectTabBar' != '{}'::jsonb THEN
        RAISE NOTICE 'config_json already has objectTabBar — skipping 003.';
        RETURN;
    END IF;

    SELECT elem->'config' INTO def_cfg
    FROM jsonb_array_elements(doc->'presets') AS elem
    WHERE elem->>'id' = 'default'
    LIMIT 1;

    IF def_cfg IS NULL THEN
        RAISE EXCEPTION 'No default preset in config_json.presets';
    END IF;

    tab_bar := '{}'::jsonb;
    FOREACH k IN ARRAY tab_keys
    LOOP
        IF def_cfg ? k THEN
            tab_bar := tab_bar || jsonb_build_object(k, def_cfg->k);
        END IF;
    END LOOP;

    doc := jsonb_set(doc, '{objectTabBar}', tab_bar, true);
    doc := jsonb_set(doc, '{activeTabId}', to_jsonb('tab-default'::text), true);

    presets := doc->'presets';
    FOR i IN 0 .. jsonb_array_length(presets) - 1
    LOOP
        cfg := presets->i->'config';
        FOREACH k IN ARRAY tab_keys
        LOOP
            cfg := cfg - k;
        END LOOP;
        presets := jsonb_set(presets, ARRAY[i::text, 'config'], cfg, true);
    END LOOP;

    doc := jsonb_set(doc, '{presets}', presets, true);

    UPDATE platform_config
    SET config_json = doc,
        modified_by_user_id = '1',
        lastmodified_ts = now()
    WHERE config_id = row_id;

    RAISE NOTICE 'Updated config_id % with objectTabBar + activeTabId and stripped tab keys from presets.', row_id;
END $$;
