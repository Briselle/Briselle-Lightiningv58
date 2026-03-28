-- =============================================
-- Briselle Platform Configuration Table
-- =============================================
-- Generic enterprise config store. Each row is ONE config document
-- for a given entity + object + user scope.
-- All presets, UI layouts, menus, etc. live INSIDE config_json as lists.
--
-- Run this in Supabase SQL Editor:
--   https://supabase.com/dashboard → your project → SQL Editor
-- =============================================

-- Drop old table if it exists (schema redesign)
DROP TABLE IF EXISTS platform_config CASCADE;

-- config_type values:
--   1 = MenuLoader
--   2 = UIUXLoader (table presets, UI layouts)
--   3 = ObjectLoader
--   4 = ModuleLoader
--   5 = ThemeLoader
--   6 = DashboardLoader

CREATE TABLE platform_config (
    config_id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Scoping
    entity_id               bigint NOT NULL,
    dobj_id                 bigint NOT NULL,

    -- Linked users (JSON arrays)
    user_ids_linked         jsonb NOT NULL DEFAULT '["1"]',

    -- Display / classification
    config_name             text NOT NULL,
    config_type             smallint NOT NULL DEFAULT 3,
    config_description      text NOT NULL DEFAULT 'Platform configuration',
    config_version          integer NOT NULL DEFAULT 1,
    is_default              boolean NOT NULL DEFAULT false,
    is_active               boolean NOT NULL DEFAULT true,

    -- Authorization (JSON arrays of user IDs)
    auth_edit_ids_linked    jsonb NOT NULL DEFAULT '["1"]',
    auth_delete_ids_linked  jsonb NOT NULL DEFAULT '["1"]',

    -- The actual configuration payload (presets, settings, etc. all inside here as lists)
    config_json             jsonb NOT NULL DEFAULT '{}',

    -- Audit fields (standardized across all platform tables)
    created_by_user_id      text NOT NULL DEFAULT '1',
    modified_by_user_id     text NOT NULL DEFAULT '1',
    created_ts              timestamptz NOT NULL DEFAULT now(),
    lastmodified_ts         timestamptz NOT NULL DEFAULT now(),

    -- One config document per entity + object + config_type scope
    CONSTRAINT uq_platform_config_scope UNIQUE (entity_id, dobj_id, config_type)
);

-- Comments
COMMENT ON TABLE  platform_config IS 'Enterprise configuration store — each row is one config document containing lists (presets, menus, etc.) inside config_json';
COMMENT ON COLUMN platform_config.config_type IS '1=MenuLoader, 2=UIUXLoader, 3=ObjectLoader, 4=ModuleLoader, 5=ThemeLoader, 6=DashboardLoader';
COMMENT ON COLUMN platform_config.user_ids_linked IS 'JSON array of user IDs this config is visible to';
COMMENT ON COLUMN platform_config.auth_edit_ids_linked IS 'JSON array of user IDs allowed to edit this config';
COMMENT ON COLUMN platform_config.auth_delete_ids_linked IS 'JSON array of user IDs allowed to delete this config';
COMMENT ON COLUMN platform_config.config_json IS 'Full configuration payload — presets as a list, active preset id, custom names/icons all inside';
COMMENT ON COLUMN platform_config.is_active IS 'Soft-delete flag for this config document';
COMMENT ON COLUMN platform_config.is_default IS 'Whether this is the default/system config for the given scope';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pc_entity_id            ON platform_config (entity_id);
CREATE INDEX IF NOT EXISTS idx_pc_entity_id_dobj_id    ON platform_config (entity_id, dobj_id);
CREATE INDEX IF NOT EXISTS idx_pc_entity_id_type       ON platform_config (entity_id, config_type);
CREATE INDEX IF NOT EXISTS idx_pc_is_active            ON platform_config (is_active);
CREATE INDEX IF NOT EXISTS idx_pc_user_ids_linked      ON platform_config USING gin (user_ids_linked);

-- Auto-update lastmodified_ts on row change
CREATE OR REPLACE FUNCTION update_platform_config_lastmodified_ts()
RETURNS TRIGGER AS $$
BEGIN
    NEW.lastmodified_ts = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_platform_config_lastmodified ON platform_config;
CREATE TRIGGER trg_platform_config_lastmodified
    BEFORE UPDATE ON platform_config
    FOR EACH ROW
    EXECUTE FUNCTION update_platform_config_lastmodified_ts();

-- Enable Row Level Security (Supabase best practice)
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users"
    ON platform_config
    FOR ALL
    USING (true)
    WITH CHECK (true);
