-- =============================================
-- Briselle Platform — 024_ai_last_used.sql
-- Created At: 2026-08-22 | Last Modified: 2026-08-22
-- Task: BRIS-AI-T191
--
-- "Last used" timestamps for platform modules, providers and models.
--
-- ── Why derived, not stored ─────────────────────────────────────────
-- The obvious approach is a lastUsedAt field on each record in
-- config_json, written on every AI call. That is wrong here:
--   * it turns every AI call into a read-modify-write of the WHOLE
--     configuration document, so two concurrent calls lose one update;
--   * platform_config is configuration, and a usage timestamp is
--     telemetry — mixing them means an audit trail lives in a row an
--     administrator edits by hand.
--
-- ai_gateway_log (created in 022) already records entity, capability,
-- provider, model and created_ts for every call. So the timestamps are
-- already captured automatically; this function just reads them back.
--
-- ── Why an RPC and not a client query ───────────────────────────────
-- supabase-js cannot express GROUP BY, so the client would have to pull
-- rows and aggregate them. That is fine at a hundred rows and a problem
-- at a million. One indexed aggregate here stays constant-cost.
--
-- Run in Supabase SQL Editor AFTER 022. Safe to re-run.
-- =============================================

-- ─────────────────────────────────────────────────────────────────────
-- Supporting indexes. Each aggregate below groups by one dimension, so
-- one partial index per dimension keeps all three planned rather than
-- scanned.
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_log_capability
  ON ai_gateway_log (entity_id, capability, created_ts DESC)
  WHERE capability IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_log_provider
  ON ai_gateway_log (entity_id, provider_id, created_ts DESC);

CREATE INDEX IF NOT EXISTS idx_ai_log_model
  ON ai_gateway_log (entity_id, model_id, created_ts DESC);

-- ─────────────────────────────────────────────────────────────────────
-- One call returns every "last used" the settings page needs.
--
-- `kind` distinguishes the three dimensions so one round trip serves
-- the Modules tab, the Providers tab and the Models sub-page.
--
-- Only successful calls count. A run of failures is not evidence that
-- a model is in use, and showing a fresh timestamp for calls that never
-- worked would be actively misleading.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION ai_last_used(p_entity_id bigint)
RETURNS TABLE (kind text, ref text, last_used_at timestamptz, call_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'module'::text, capability, max(created_ts), count(*)
    FROM ai_gateway_log
   WHERE entity_id = p_entity_id
     AND capability IS NOT NULL
     AND status LIKE 'ok%'
   GROUP BY capability

  UNION ALL

  SELECT 'provider'::text, provider_id, max(created_ts), count(*)
    FROM ai_gateway_log
   WHERE entity_id = p_entity_id
     AND status LIKE 'ok%'
   GROUP BY provider_id

  UNION ALL

  SELECT 'model'::text, model_id, max(created_ts), count(*)
    FROM ai_gateway_log
   WHERE entity_id = p_entity_id
     AND status LIKE 'ok%'
   GROUP BY model_id;
$$;

REVOKE ALL ON FUNCTION ai_last_used(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ai_last_used(bigint) TO anon, authenticated, service_role;

COMMENT ON FUNCTION ai_last_used(bigint) IS
  'Last successful AI call per module / provider / model, derived from ai_gateway_log. Read-only telemetry; never configuration.';

-- ─────────────────────────────────────────────────────────────────────
-- Verify
-- ─────────────────────────────────────────────────────────────────────
SELECT * FROM ai_last_used(1000000000) ORDER BY kind, ref;
-- Empty until AI calls have run. That is expected on a fresh install.
