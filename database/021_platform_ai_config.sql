-- =============================================
-- Briselle Platform — 021_platform_ai_config.sql
-- Created At: 2026-08-22 | Last Modified: 2026-08-22
-- Task: BRIS-AI-T153
--
-- Adds config_type 10 = AIProvidersLoader and seeds one empty AI
-- configuration document per entity, for Settings > AI Providers Config.
--
-- WHY config_type 10 (not 9): assigned by the platform owner. 9 is left
-- free deliberately. config_type is a plain smallint with no CHECK
-- constraint, so introducing 10 needs no schema change — only the
-- documenting COMMENT below.
--
-- ── Scope ───────────────────────────────────────────────────────────
--   entity_id    per-entity. Each entity gets its OWN AI configuration
--                page, administered by that entity's admin user.
--   dobj_id      1000000003  (platform AI configuration)
--   config_type  10          (AIProvidersLoader)
--   config_name  'PlatformAIConfig'
--
-- The table's UNIQUE (entity_id, dobj_id, config_type) constraint gives
-- exactly one AI document per entity, so there is no "which row wins"
-- question. Seeded here for entity 1000000000 (Briselle org) only; other
-- entities get a row on first save.
--
-- ── SECURITY: NO PLAINTEXT API KEYS IN THIS TABLE ───────────────────
-- config_json carries a `credentialRef` per provider — an opaque pointer
-- into Supabase Vault (see 022_ai_credentials_vault.sql). The secret
-- itself NEVER lands in platform_config, never reaches the React client,
-- and never appears in application logs or audit records.
--
-- The `check_no_plaintext_credentials` trigger below enforces that at the
-- database level rather than trusting every future caller to remember.
--
-- Run in Supabase SQL Editor. Safe to re-run.
-- =============================================

COMMENT ON COLUMN platform_config.config_type IS
  '1=MenuLoader, 2=UIUXLoader, 3=ObjectLoader, 4=ModuleLoader, 5=ThemeLoader, 6=DashboardLoader, 7=ObjectCounter, 8=AIPromptsLoader, 10=AIProvidersLoader';

-- ─────────────────────────────────────────────────────────────────────
-- 1. Reject plaintext credentials in the AI document.
--
-- The requirement "do not store plaintext provider API keys in
-- platform_config" is only real if something enforces it. A code review
-- is not enforcement; this trigger is.
--
-- It rejects the well-known secret-bearing key names anywhere in the
-- providers / mcpServers arrays. credentialRef is explicitly allowed —
-- it is a pointer, not a secret.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_no_plaintext_credentials()
RETURNS TRIGGER AS $$
DECLARE
  offending text;
BEGIN
  IF NEW.config_type <> 10 THEN
    RETURN NEW;
  END IF;

  SELECT k INTO offending
  FROM (
    SELECT jsonb_object_keys(elem) AS k
    FROM jsonb_array_elements(
           COALESCE(NEW.config_json #> '{ai,providers}', '[]'::jsonb)
           || COALESCE(NEW.config_json #> '{ai,mcpServers}', '[]'::jsonb)
         ) AS elem
  ) keys
  WHERE lower(k) IN ('apikey', 'api_key', 'secret', 'secretkey', 'secret_key',
                     'token', 'accesstoken', 'access_token', 'password',
                     'bearer', 'authorization')
  LIMIT 1;

  IF offending IS NOT NULL THEN
    RAISE EXCEPTION
      'AI config rejected: plaintext credential field "%" is not permitted in platform_config. Store the secret in Supabase Vault and reference it with credentialRef.',
      offending;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_plaintext_credentials ON platform_config;
CREATE TRIGGER trg_no_plaintext_credentials
  BEFORE INSERT OR UPDATE ON platform_config
  FOR EACH ROW
  EXECUTE FUNCTION check_no_plaintext_credentials();

-- ─────────────────────────────────────────────────────────────────────
-- 2. Seed the empty document for entity 1000000000.
--
-- Empty on purpose. There are no shipped providers: a provider needs a
-- real base URL and a real credential, and inventing either would give
-- the admin a row that looks configured and fails on first call. That is
-- exactly the failure mode the hardcoded PREDEFINED_PROVIDERS list in
-- zivaApiRouterService.js produced (a 404 on a model nobody had).
--
-- `capabilities` is the platform's generic capability vocabulary. These
-- are capability tags, NOT module names — no module is referenced here,
-- and any module needing "speech to text" asks for the tag rather than
-- naming itself. That is what keeps this layer reusable.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO platform_config (
  entity_id, dobj_id, config_name, config_type, config_description,
  is_default, is_active, config_json
) VALUES (
  1000000000, 1000000003, 'PlatformAIConfig', 10,
  'Platform AI provider, model, configuration and MCP connector registry',
  true, true,
  jsonb_build_object(
    'ai', jsonb_build_object(
      'version', 1,
      'providers', '[]'::jsonb,
      'models', '[]'::jsonb,
      'configurations', '[]'::jsonb,
      'mcpServers', '[]'::jsonb,
      'capabilities', jsonb_build_array(
        jsonb_build_object('id', 'stt',               'label', 'Speech to Text',      'description', 'Audio transcription and live speech engines'),
        jsonb_build_object('id', 'summarization',     'label', 'Summarization',       'description', 'Long-form text and notes summarisation'),
        jsonb_build_object('id', 'translation',       'label', 'Translation Engine',  'description', 'Multilingual text translation'),
        jsonb_build_object('id', 'chat',              'label', 'Chat Orchestrator',   'description', 'Interactive conversational responses'),
        jsonb_build_object('id', 'schema_controller', 'label', 'Schema Controller',   'description', 'Structured schema and attribute generation'),
        jsonb_build_object('id', 'embedding',         'label', 'Embeddings',          'description', 'Vector embeddings for search and retrieval'),
        jsonb_build_object('id', 'vision',            'label', 'Vision',              'description', 'Image and document understanding'),
        jsonb_build_object('id', 'tools',             'label', 'Tool / MCP Access',   'description', 'External tool and MCP connector access')
      )
    )
  )
)
ON CONFLICT ON CONSTRAINT uq_platform_config_scope DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Row Level Security — only an entity's own administrators.
--
-- FLAGGED FOR FOLLOW-UP: the platform has no role model in the client
-- yet, so "administrator" cannot be evaluated. Per the platform owner's
-- direction this gates on entity membership only, with entity 1000000000
-- as the current single tenant. When a role column or JWT claim exists,
-- tighten the USING clause to require it — the policy name below is the
-- one place to change.
--
-- Commented out rather than applied blind: enabling RLS on
-- platform_config affects every existing loader (menu, theme, objects),
-- and silently breaking those would be worse than the gap it closes.
-- Apply deliberately, after checking the other config_type readers.
-- ─────────────────────────────────────────────────────────────────────
-- ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY ai_config_entity_admins_read ON platform_config
--   FOR SELECT TO authenticated
--   USING (config_type <> 10 OR entity_id = 1000000000);
--
-- CREATE POLICY ai_config_entity_admins_write ON platform_config
--   FOR ALL TO authenticated
--   USING (config_type <> 10 OR entity_id = 1000000000)
--   WITH CHECK (config_type <> 10 OR entity_id = 1000000000);

-- ─────────────────────────────────────────────────────────────────────
-- Verify
-- ─────────────────────────────────────────────────────────────────────
SELECT config_id, entity_id, config_name, config_type,
       jsonb_array_length(config_json #> '{ai,providers}')      AS providers,
       jsonb_array_length(config_json #> '{ai,models}')         AS models,
       jsonb_array_length(config_json #> '{ai,configurations}') AS configurations,
       jsonb_array_length(config_json #> '{ai,mcpServers}')     AS mcp_servers,
       jsonb_array_length(config_json #> '{ai,capabilities}')   AS capabilities
FROM platform_config
WHERE config_type = 10;
