-- =============================================
-- Briselle Platform — 023_ai_config_v2.sql
-- Created At: 2026-08-22 | Last Modified: 2026-08-22
-- Task: BRIS-AI-T181
--
-- Upgrades the AI configuration document (config_type 10) from v1 to v2.
--
-- ── What changes ────────────────────────────────────────────────────
--   providers[].type            -> providers[].protocol      (T167)
--   providers[].priority        -> providers[].order         (T166)
--   providers[].isSystemDefined  NEW, false except Groq       (T168)
--   models[].id                  now DERIVED providerId::name (T173)
--   models[].maxTokensPerRequest NEW                          (T175)
--   models[].moduleTags          NEW                          (T174)
--   models[].order               NEW                          (T176)
--   capabilities[].aiEnabled     NEW, false                   (T178)
--   capabilities[].order         NEW                          (T179)
--   configurations[].modelId     rewritten to the new key      (T173)
--
-- ── Safety ──────────────────────────────────────────────────────────
-- IDEMPOTENT and NON-DESTRUCTIVE. Guarded on version < 2, so re-running
-- it cannot touch a document that has already been upgraded or edited.
-- No row is created here: 021 owns the seed.
--
-- The configurations[].modelId rewrite is the one step that can lose a
-- link, so it is done by JOINING against the old models array rather
-- than by string surgery — a configuration pointing at a model that no
-- longer exists keeps its old value and is then reported by the
-- verification query at the bottom instead of being silently blanked.
--
-- Run in Supabase SQL Editor AFTER 021 and 022.
-- =============================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. Show what will change, before changing it.
-- ─────────────────────────────────────────────────────────────────────
SELECT
  config_id,
  entity_id,
  COALESCE((config_json #>> '{ai,version}')::int, 1)      AS current_version,
  jsonb_array_length(COALESCE(config_json #> '{ai,providers}', '[]'::jsonb))      AS providers,
  jsonb_array_length(COALESCE(config_json #> '{ai,models}', '[]'::jsonb))         AS models,
  jsonb_array_length(COALESCE(config_json #> '{ai,configurations}', '[]'::jsonb)) AS configurations
FROM platform_config
WHERE config_type = 10;

-- ─────────────────────────────────────────────────────────────────────
-- 2. The upgrade.
-- ─────────────────────────────────────────────────────────────────────
WITH target AS (
  SELECT config_id, config_json
  FROM platform_config
  WHERE config_type = 10
    AND COALESCE((config_json #>> '{ai,version}')::int, 1) < 2
),

-- Providers: rename type->protocol, priority->order, add isSystemDefined.
-- ordinality supplies a deterministic order for any provider that had no
-- priority, so the list does not shuffle on the next read.
prov AS (
  SELECT t.config_id,
         COALESCE(jsonb_agg(
           (p.elem - 'type' - 'priority')
           || jsonb_build_object(
                'protocol', COALESCE(p.elem ->> 'type', 'openai-compatible'),
                'order',    COALESCE((p.elem ->> 'priority')::numeric, (p.ord - 1)::numeric),
                -- The platform owner nominated Groq / Llama 3.3 as the one
                -- system-defined provider. Matched on the Groq HOST rather
                -- than on a provider id, because the id was chosen by
                -- whoever created the row and may be anything.
                'isSystemDefined',
                  COALESCE((p.elem ->> 'baseUrl') ILIKE '%api.groq.com%', false)
              )
           ORDER BY p.ord
         ), '[]'::jsonb) AS providers
  FROM target t
  LEFT JOIN LATERAL jsonb_array_elements(COALESCE(t.config_json #> '{ai,providers}', '[]'::jsonb))
       WITH ORDINALITY AS p(elem, ord) ON true
  GROUP BY t.config_id
),

-- Models: derive id as providerId::name, add the three new fields.
-- The OLD id is carried as _oldId purely so the configuration rewrite
-- below can join on it; it is stripped again in step 3.
mdl AS (
  SELECT t.config_id,
         COALESCE(jsonb_agg(
           (m.elem - 'id')
           || jsonb_build_object(
                'id', COALESCE(m.elem ->> 'providerId', '') || '::' || COALESCE(m.elem ->> 'name', ''),
                '_oldId', COALESCE(m.elem ->> 'id', ''),
                'maxTokensPerRequest', COALESCE(m.elem -> 'maxTokensPerRequest', 'null'::jsonb),
                'moduleTags',          COALESCE(m.elem -> 'moduleTags', '[]'::jsonb),
                'order',               COALESCE((m.elem ->> 'order')::numeric, (m.ord - 1)::numeric)
              )
           ORDER BY m.ord
         ), '[]'::jsonb) AS models
  FROM target t
  LEFT JOIN LATERAL jsonb_array_elements(COALESCE(t.config_json #> '{ai,models}', '[]'::jsonb))
       WITH ORDINALITY AS m(elem, ord) ON true
  GROUP BY t.config_id
),

-- Configurations: repoint modelId at the new key by joining the model
-- list. An unmatched modelId is LEFT ALONE rather than blanked, so a
-- broken link stays visible and reportable.
cfg AS (
  SELECT t.config_id,
         COALESCE(jsonb_agg(
           c.elem || jsonb_build_object(
             'modelId',
             COALESCE(
               (SELECT mm.elem ->> 'id'
                  FROM mdl mm2
                  CROSS JOIN LATERAL jsonb_array_elements(mm2.models) AS mm(elem)
                 WHERE mm2.config_id = t.config_id
                   AND mm.elem ->> '_oldId' = c.elem ->> 'modelId'
                 LIMIT 1),
               c.elem ->> 'modelId'
             )
           )
           ORDER BY c.ord
         ), '[]'::jsonb) AS configurations
  FROM target t
  LEFT JOIN LATERAL jsonb_array_elements(COALESCE(t.config_json #> '{ai,configurations}', '[]'::jsonb))
       WITH ORDINALITY AS c(elem, ord) ON true
  GROUP BY t.config_id
),

-- Capabilities (Briselle Platform Modules): add aiEnabled + order.
-- aiEnabled defaults FALSE. A module that switched itself on during a
-- migration would start spending the entity's provider quota without
-- anyone having asked for it.
cap AS (
  SELECT t.config_id,
         COALESCE(jsonb_agg(
           k.elem || jsonb_build_object(
             'aiEnabled', COALESCE((k.elem ->> 'aiEnabled')::boolean, false),
             'order',     COALESCE((k.elem ->> 'order')::numeric, (k.ord - 1)::numeric)
           )
           ORDER BY k.ord
         ), '[]'::jsonb) AS capabilities
  FROM target t
  LEFT JOIN LATERAL jsonb_array_elements(COALESCE(t.config_json #> '{ai,capabilities}', '[]'::jsonb))
       WITH ORDINALITY AS k(elem, ord) ON true
  GROUP BY t.config_id
)

UPDATE platform_config pc
SET config_json = jsonb_set(
      pc.config_json,
      '{ai}',
      (pc.config_json -> 'ai')
        || jsonb_build_object(
             'version',        2,
             'providers',      prov.providers,
             'models',         mdl.models,
             'configurations', cfg.configurations,
             'capabilities',   cap.capabilities
           )
    ),
    lastmodified_ts = now()
FROM prov, mdl, cfg, cap
WHERE pc.config_id = prov.config_id
  AND prov.config_id = mdl.config_id
  AND mdl.config_id  = cfg.config_id
  AND cfg.config_id  = cap.config_id;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Drop the temporary _oldId join key.
-- ─────────────────────────────────────────────────────────────────────
WITH stripped AS (
  SELECT pc.config_id,
         COALESCE(jsonb_agg(m.elem - '_oldId' ORDER BY m.ord), '[]'::jsonb) AS models
  FROM platform_config pc
  LEFT JOIN LATERAL jsonb_array_elements(COALESCE(pc.config_json #> '{ai,models}', '[]'::jsonb))
       WITH ORDINALITY AS m(elem, ord) ON true
  WHERE pc.config_type = 10
  GROUP BY pc.config_id
)
UPDATE platform_config pc
SET config_json = jsonb_set(pc.config_json, '{ai,models}', stripped.models)
FROM stripped
WHERE pc.config_id = stripped.config_id
  AND pc.config_json #> '{ai,models}' @> '[{"_oldId": ""}]'::jsonb IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Verify. Every row should read version 2, and broken_links must be 0.
-- ─────────────────────────────────────────────────────────────────────
SELECT
  pc.config_id,
  (pc.config_json #>> '{ai,version}')::int AS version,
  (SELECT count(*) FROM jsonb_array_elements(pc.config_json #> '{ai,providers}') x
    WHERE x.value ? 'protocol')                                   AS providers_with_protocol,
  (SELECT count(*) FROM jsonb_array_elements(pc.config_json #> '{ai,providers}') x
    WHERE (x.value ->> 'isSystemDefined')::boolean)               AS system_defined,
  (SELECT count(*) FROM jsonb_array_elements(pc.config_json #> '{ai,models}') x
    WHERE x.value ->> 'id' LIKE '%::%')                           AS models_with_derived_id,
  (SELECT count(*) FROM jsonb_array_elements(pc.config_json #> '{ai,models}') x
    WHERE x.value ? '_oldId')                                     AS leftover_oldid,
  (SELECT count(*) FROM jsonb_array_elements(pc.config_json #> '{ai,capabilities}') x
    WHERE x.value ? 'aiEnabled')                                  AS modules_with_switch,
  -- A configuration whose modelId matches no model is a broken link.
  (SELECT count(*)
     FROM jsonb_array_elements(pc.config_json #> '{ai,configurations}') c
    WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(pc.config_json #> '{ai,models}') m
       WHERE m.value ->> 'id' = c.value ->> 'modelId'
    ))                                                            AS broken_links
FROM platform_config pc
WHERE pc.config_type = 10;
