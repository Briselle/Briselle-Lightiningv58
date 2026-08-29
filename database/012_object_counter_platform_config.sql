-- =============================================
-- Object auto-number counters in platform_config
-- =============================================
-- One row per (entity_id, dobj_id, config_type = 7) — same uniqueness as ObjectLoader (type 3).
-- config_name: 'ObjectCounter'
-- config_json shape:
--   { "counters": { "<field_api_name>": <last_allocated_int>, ... } }
--
-- next_object_autonumber(...) atomically increments and returns the new value (never reused on success).
-- If the row does not exist, it is inserted with the first value = GREATEST(1, p_starting_number).
--
-- Prerequisites: platform_config exists (database/001_create_platform_config.sql).
-- If you used the old ledger table, run first: database/011_drop_legacy_object_autonumber_counters.sql
-- =============================================

COMMENT ON COLUMN public.platform_config.config_type IS
    '1=MenuLoader, 2=UIUXLoader, 3=ObjectLoader, 4=ModuleLoader, 5=ThemeLoader, 6=DashboardLoader, 7=ObjectCounter';

CREATE OR REPLACE FUNCTION public.next_object_autonumber(
    p_entity_id bigint,
    p_dobj_id bigint,
    p_field_key text,
    p_starting_number bigint DEFAULT 1
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start bigint;
    v_curr bigint;
    v_next bigint;
BEGIN
    IF p_field_key IS NULL OR btrim(p_field_key) = '' THEN
        RAISE EXCEPTION 'next_object_autonumber: p_field_key is required';
    END IF;

    v_start := GREATEST(COALESCE(p_starting_number, 1), 1);

    LOOP
        SELECT (pc.config_json #>> ARRAY['counters', p_field_key])::bigint
        INTO v_curr
        FROM public.platform_config pc
        WHERE pc.entity_id = p_entity_id
          AND pc.dobj_id = p_dobj_id
          AND pc.config_type = 7
        FOR UPDATE;

        IF FOUND THEN
            v_next := GREATEST(v_start, COALESCE(v_curr, v_start - 1) + 1);
            UPDATE public.platform_config pc
            SET
                config_json = jsonb_set(
                    COALESCE(pc.config_json, '{}'::jsonb),
                    ARRAY['counters', p_field_key],
                    to_jsonb(v_next),
                    true
                ),
                modified_by_user_id = '1'
            WHERE pc.entity_id = p_entity_id
              AND pc.dobj_id = p_dobj_id
              AND pc.config_type = 7;
            RETURN v_next;
        END IF;

        BEGIN
            INSERT INTO public.platform_config (
                entity_id,
                dobj_id,
                user_ids_linked,
                config_name,
                config_type,
                config_description,
                config_version,
                is_default,
                is_active,
                auth_edit_ids_linked,
                auth_delete_ids_linked,
                config_json,
                created_by_user_id,
                modified_by_user_id
            )
            VALUES (
                p_entity_id,
                p_dobj_id,
                '["1"]'::jsonb,
                'ObjectCounter',
                7,
                'Per-object durable auto-number counters (config_json.counters.<fieldKey> = last allocated)',
                1,
                false,
                true,
                '["1"]'::jsonb,
                '["1"]'::jsonb,
                jsonb_build_object('counters', jsonb_build_object(p_field_key, v_start)),
                '1',
                '1'
            );
            RETURN v_start;
        EXCEPTION
            WHEN unique_violation THEN
                -- Concurrent insert for same scope; retry UPDATE path.
                NULL;
        END;
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_object_autonumber(bigint, bigint, text, bigint) TO anon, authenticated;

-- =============================================
-- Optional: manual seed / bump last_value without calling RPC
-- =============================================
-- Example: set last allocated value for field "name_u" on entity 1000000000, object 1000000001
-- (next RPC call will return GREATEST(p_starting_number, last+1) — usually last+1 if last >= starting_number-1)
--
-- INSERT INTO public.platform_config (
--     entity_id, dobj_id, user_ids_linked, config_name, config_type, config_description,
--     config_version, is_default, is_active, auth_edit_ids_linked, auth_delete_ids_linked,
--     config_json, created_by_user_id, modified_by_user_id
-- )
-- VALUES (
--     1000000000,
--     1000000001,
--     '["1"]'::jsonb,
--     'ObjectCounter',
--     7,
--     'Per-object durable auto-number counters',
--     1, false, true, '["1"]'::jsonb, '["1"]'::jsonb,
--     '{"counters":{"name_u": 42}}'::jsonb,
--     '1', '1'
-- )
-- ON CONFLICT (entity_id, dobj_id, config_type) DO UPDATE SET
--     config_json = jsonb_set(
--         COALESCE(public.platform_config.config_json, '{}'::jsonb),
--         ARRAY['counters', 'name_u'],
--         to_jsonb(42),
--         true
--     ),
--     modified_by_user_id = '1';
