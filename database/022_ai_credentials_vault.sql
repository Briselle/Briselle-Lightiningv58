-- =============================================
-- Briselle Platform — 022_ai_credentials_vault.sql
-- Created At: 2026-08-22 | Last Modified: 2026-08-22
-- Task: BRIS-AI-T158
--
-- Supabase Vault storage for AI provider and MCP connector credentials.
--
-- ── The contract ────────────────────────────────────────────────────
-- platform_config holds only `credentialRef`, a stable opaque name.
-- Vault holds the secret under that name. Nothing else, anywhere, holds
-- it — not the browser, not localStorage, not a log line.
--
-- credentialRef naming: ai:<entityId>:<providerId>
--   e.g. ai:1000000000:groq-primary
-- Derived, not random, so an orphaned Vault entry is identifiable and a
-- provider rename does not lose its secret.
--
-- ── Who may call what ───────────────────────────────────────────────
--   ai_credential_set(ref, secret)  authenticated  — write / rotate
--   ai_credential_delete(ref)       authenticated  — remove
--   ai_credential_exists(ref)       authenticated  — presence only
--   ai_credential_get(ref)          service_role   — READ, SERVER ONLY
--
-- ai_credential_get is the only function that returns a secret and it is
-- revoked from anon and authenticated. Only the ai-gateway Edge Function,
-- holding the service-role key, can call it. That is the single mechanism
-- enforcing "never return API keys to the React client" — without it,
-- every other precaution in this file is decoration.
--
-- Prerequisite: Vault enabled (Dashboard > Project Settings > Vault).
-- Verify with:  SELECT * FROM pg_extension WHERE extname = 'supabase_vault';
--
-- Run in Supabase SQL Editor. Safe to re-run.
-- =============================================

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- ─────────────────────────────────────────────────────────────────────
-- 1. Write or rotate a credential.
--
-- Idempotent by ref: a second call for the same ref rotates the secret
-- in place rather than accumulating duplicates under one name, which
-- would make ai_credential_get ambiguous.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION ai_credential_set(p_ref text, p_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  existing_id uuid;
BEGIN
  IF p_ref IS NULL OR btrim(p_ref) = '' THEN
    RAISE EXCEPTION 'credentialRef is required';
  END IF;
  IF p_ref NOT LIKE 'ai:%' THEN
    RAISE EXCEPTION 'credentialRef must be namespaced "ai:<entityId>:<providerId>"';
  END IF;
  IF p_secret IS NULL OR btrim(p_secret) = '' THEN
    RAISE EXCEPTION 'secret is required';
  END IF;

  SELECT id INTO existing_id FROM vault.secrets WHERE name = p_ref LIMIT 1;

  IF existing_id IS NULL THEN
    PERFORM vault.create_secret(p_secret, p_ref, 'Briselle AI provider credential');
  ELSE
    PERFORM vault.update_secret(existing_id, p_secret, p_ref, 'Briselle AI provider credential');
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Delete a credential.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION ai_credential_delete(p_ref text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE name = p_ref;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Presence check — boolean only, never the value.
--
-- This is what the settings UI calls to render "Configured" against a
-- provider. It deliberately cannot leak the secret, not even its length,
-- which a naive "return the masked key" helper would.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION ai_credential_exists(p_ref text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = vault, public
AS $$
  SELECT EXISTS (SELECT 1 FROM vault.secrets WHERE name = p_ref);
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Read a credential. SERVER ONLY.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION ai_credential_get(p_ref text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = vault, public
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = p_ref LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Grants.
--
-- REVOKE FROM PUBLIC first. SECURITY DEFINER functions are executable by
-- PUBLIC by default, so granting without revoking would leave
-- ai_credential_get callable by anon — the exact hole this file exists
-- to close.
-- ─────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION ai_credential_set(text, text)  FROM PUBLIC;
REVOKE ALL ON FUNCTION ai_credential_delete(text)     FROM PUBLIC;
REVOKE ALL ON FUNCTION ai_credential_exists(text)     FROM PUBLIC;
REVOKE ALL ON FUNCTION ai_credential_get(text)        FROM PUBLIC;

GRANT EXECUTE ON FUNCTION ai_credential_set(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ai_credential_delete(text)    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ai_credential_exists(text)    TO authenticated, service_role;

-- The one function that returns a secret. service_role ONLY.
GRANT EXECUTE ON FUNCTION ai_credential_get(text)       TO service_role;

-- ─────────────────────────────────────────────────────────────────────
-- 6. Usage log — metadata only, never payloads.
--
-- Columns chosen so a secret cannot be written even by accident: there
-- is no free-text request or response column. Errors record a code and a
-- short message, and the gateway truncates the message before it arrives.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_gateway_log (
  log_id            bigserial PRIMARY KEY,
  entity_id         bigint      NOT NULL,
  configuration_id  text        NOT NULL,
  provider_id       text        NOT NULL,
  model_id          text        NOT NULL,
  capability        text,
  status            text        NOT NULL,
  http_status       int,
  latency_ms        int,
  prompt_tokens     int,
  completion_tokens int,
  error_code        text,
  error_message     text,
  called_by         uuid,
  created_ts        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_gateway_log_entity_ts
  ON ai_gateway_log (entity_id, created_ts DESC);

COMMENT ON TABLE ai_gateway_log IS
  'AI gateway call metadata. Never stores prompts, completions or credentials.';

-- ─────────────────────────────────────────────────────────────────────
-- Verify
-- ─────────────────────────────────────────────────────────────────────
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       array_agg(a.rolname ORDER BY a.rolname)   AS can_execute
FROM pg_proc p
CROSS JOIN pg_roles a
LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname LIKE 'ai_credential_%'
  AND n.nspname = 'public'
  AND has_function_privilege(a.rolname, p.oid, 'EXECUTE')
  AND a.rolname IN ('anon', 'authenticated', 'service_role')
GROUP BY p.proname, p.oid
ORDER BY p.proname;
-- EXPECTED: ai_credential_get shows {service_role} ONLY.
