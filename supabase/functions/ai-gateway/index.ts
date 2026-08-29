/* ============================================================
   Briselle Platform — supabase/functions/ai-gateway/index.ts
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-AI-T158

   The generic AI gateway. Every AI call in the platform goes through
   here so that provider credentials never reach a browser.

   ── The eleven steps ───────────────────────────────────────────
     1  authenticate the caller (Supabase JWT)
     2  authorize (entity scope)
     3  load the AI configuration document
     4  resolve configurationId -> configuration
     5  resolve provider + model
     6  retrieve the credential from Vault
     7  validate the resolved chain can execute
     8  invoke the provider adapter
     9  normalise the response
    10  return it
    11  log non-sensitive metadata

   ── What must never happen here ────────────────────────────────
   No credential in a response body, a log line, or an error message.
   The Vault read (step 6) is the only place a secret exists, it lives
   in a local variable, and every error path passes through
   sanitizeProviderError first.

   ── Actions ────────────────────────────────────────────────────
     POST { action: 'execute',        configurationId, input }
     POST { action: 'transcribe',     configurationId, audio (multipart) }
     POST { action: 'testConnection', providerId, modelName? }
     POST { action: 'listModels',     providerId }

   Deploy:
     supabase functions deploy ai-gateway
   Requires (set automatically by Supabase, verify they exist):
     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
   ============================================================ */
// @ts-nocheck -- Deno runtime; the client tsconfig does not resolve these URLs.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AdapterError, getAdapter, sanitizeProviderError } from './adapters/index.ts';

const AI_CONFIG_TYPE = 10;
const AI_CONFIG_DOBJ_ID = 1000000003;

/* FLAGGED: single-tenant placeholder, matching the client service.
   Replace with a per-user entity lookup when the platform has one. */
const DEFAULT_ENTITY_ID = 1000000000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function fail(message: string, status = 400, code = 'bad_request'): Response {
  return json({ ok: false, error: { code, message } }, status);
}

/* ══════════════════════════════════════════════════════════════════
   Step 11 — metadata-only logging.

   There is deliberately no request or response column in
   ai_gateway_log, so a prompt cannot be logged even by mistake. Errors
   are truncated and sanitised before they arrive.

   A logging failure must never fail the caller's AI request: the answer
   was already produced, and losing telemetry is much cheaper than
   losing the result.
   ══════════════════════════════════════════════════════════════════ */
async function logCall(admin: any, row: Record<string, unknown>): Promise<void> {
  try {
    await admin.from('ai_gateway_log').insert(row);
  } catch (e) {
    console.warn('[ai-gateway] log insert failed:', String((e as Error)?.message || e));
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('Only POST is accepted.', 405, 'method_not_allowed');

  const startedAt = Date.now();

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
    console.error('[ai-gateway] missing environment configuration');
    return fail('Gateway is not configured.', 500, 'gateway_misconfigured');
  }

  /* ══════════════════════════════════════════════════════════════
     Step 1: authenticate.

     TWO accepted identities, because the platform does not yet have an
     authentication layer: App.tsx hardcodes `isAuthenticated = true`,
     nothing calls a sign-in, and anonymous sign-in is disabled on the
     project. Demanding a user JWT therefore demanded something the
     client architecturally cannot produce, and every call — including
     every Verify — returned "Invalid or expired session".

       'user'      a real Supabase user JWT. Preferred, and used
                   automatically the moment the platform has real
                   sessions (or anonymous sign-in is switched on).
       'anon-key'  the project's public anon key. Accepted as an
                   unauthenticated PLATFORM call.

     FLAGGED, deliberately: the anon key ships inside the browser
     bundle, so 'anon-key' mode means anyone holding it can spend this
     entity's AI quota. It is logged as such on every call, and it
     stops being used the instant a real session exists. Closing it
     properly needs either anonymous sign-in enabled (Authentication >
     Providers) or a genuine login — not a change here.
     ══════════════════════════════════════════════════════════════ */
  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  const apikeyHeader = (req.headers.get('apikey') || '').trim();

  if (!jwt && !apikeyHeader) {
    return fail('Missing Authorization header.', 401, 'unauthenticated');
  }

  /* Reads of platform_config go through this client, so any RLS policy
     is still evaluated against whatever identity we actually hold. */
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt || ANON_KEY}` } },
  });

  let authMode: 'user' | 'anon-key' = 'anon-key';
  let userId: string | null = null;

  const looksLikeAnonKey = !jwt || jwt === ANON_KEY;
  if (!looksLikeAnonKey) {
    const { data: userData, error: userError } = await asUser.auth.getUser();
    if (userError || !userData?.user) {
      return fail(
        'The session token was rejected. Sign in again, or remove it to call as the platform.',
        401,
        'unauthenticated'
      );
    }
    authMode = 'user';
    userId = userData.user.id;
  } else if (apikeyHeader && apikeyHeader !== ANON_KEY && jwt !== ANON_KEY) {
    /* Neither a valid JWT nor this project's anon key. */
    return fail('Caller could not be identified.', 401, 'unauthenticated');
  }

  if (authMode === 'anon-key') {
    console.warn('[ai-gateway] unauthenticated platform call (anon key) — no user session available');
  }

  /* service_role client. Used ONLY for the Vault read and the log
     insert — never to bypass a check the user should have failed. */
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  /* ── Parse the request ─────────────────────────────────────────
     Multipart for transcription (a Blob cannot go through JSON),
     JSON for everything else. */
  let action = '';
  let configurationId = '';
  let providerId = '';
  let modelName = '';
  let input: Record<string, unknown> = {};
  let audio: Blob | null = null;
  let language = '';

  const contentType = req.headers.get('content-type') || '';
  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      action = String(form.get('action') || 'transcribe');
      configurationId = String(form.get('configurationId') || '');
      language = String(form.get('language') || '');
      const file = form.get('audio');
      audio = file instanceof Blob ? file : null;
    } else {
      const body = await req.json();
      action = String(body?.action || 'execute');
      configurationId = String(body?.configurationId || '');
      providerId = String(body?.providerId || '');
      modelName = String(body?.modelName || '');
      input = body?.input && typeof body.input === 'object' ? body.input : {};
    }
  } catch {
    return fail('Request body could not be parsed.', 400, 'bad_body');
  }

  /* ── Step 2: authorize ─────────────────────────────────────────
     FLAGGED: entity-scoped only. There is no role model in the platform
     yet, so any authenticated user of the entity may execute. When a
     role column or JWT claim exists, require it here for the
     administrative actions (testConnection, listModels) — those read a
     provider's credential status and belong to an admin, not to every
     signed-in user. */
  const entityId = DEFAULT_ENTITY_ID;

  /* ── Step 3: load the configuration document ───────────────────
     Read as the USER, not as service_role, so any RLS policy on
     platform_config is actually enforced. Using the admin client here
     would silently defeat step 2. */
  const { data: row, error: rowError } = await asUser
    .from('platform_config')
    .select('config_json')
    .eq('entity_id', entityId)
    .eq('dobj_id', AI_CONFIG_DOBJ_ID)
    .eq('config_type', AI_CONFIG_TYPE)
    .maybeSingle();

  if (rowError) return fail(`Could not read AI configuration: ${rowError.message}`, 500, 'config_read_failed');
  if (!row) {
    return fail(
      'No AI configuration exists for this entity. Run database/021_platform_ai_config.sql and configure a provider in Settings > AI Providers Config.',
      404, 'config_missing'
    );
  }

  const ai = (row as any).config_json?.ai;
  if (!ai) return fail('AI configuration document is malformed.', 500, 'config_malformed');

  const providers = Array.isArray(ai.providers) ? ai.providers : [];
  const models = Array.isArray(ai.models) ? ai.models : [];
  const configurations = Array.isArray(ai.configurations) ? ai.configurations : [];

  /* ══════════════════════════════════════════════════════════════
     Administrative actions — provider-scoped, no configuration.
     ══════════════════════════════════════════════════════════════ */
  if (action === 'testConnection' || action === 'listModels') {
    const provider = providers.find((p: any) => p.id === providerId);
    if (!provider) return fail(`No provider with id "${providerId}".`, 404, 'provider_not_found');

    const credentialRef = String(provider.credentialRef || '').trim();
    if (!credentialRef) {
      return fail(`Provider "${provider.name}" has no stored credential. Save an API key first.`, 400, 'no_credential');
    }

    /* ── Step 6: Vault read. service_role only. ─────────────────── */
    const { data: secret, error: secretError } = await admin.rpc('ai_credential_get', { p_ref: credentialRef });
    if (secretError || !secret) {
      return fail(
        `Credential "${credentialRef}" is not in Vault. Re-enter the API key for this provider.`,
        400, 'credential_missing'
      );
    }

    const ctx = {
      baseUrl: String(provider.baseUrl || '').replace(/\/+$/, ''),
      apiKey: String(secret),
      model: modelName || '',
    };

    try {
      const adapter = getAdapter(String(provider.type || 'openai-compatible'));

      if (action === 'listModels') {
        if (!adapter.listModels) {
          return fail(`Provider type "${provider.type}" cannot list models. Enter the model id manually.`, 400, 'discovery_unsupported');
        }
        const list = await adapter.listModels(ctx);
        return json({ ok: true, models: list });
      }

      const result = await adapter.testConnection(ctx);
      return json({ ok: result.ok, message: result.message, models: result.models, latencyMs: result.latencyMs });
    } catch (e) {
      const err = e as AdapterError;
      const message = sanitizeProviderError(String(err?.message || e), ctx.apiKey);
      return fail(message, err?.status || 502, err?.code || 'provider_error');
    }
  }

  /* ══════════════════════════════════════════════════════════════
     Execution actions — resolved through a configuration.
     ══════════════════════════════════════════════════════════════ */
  if (action !== 'execute' && action !== 'transcribe') {
    return fail(`Unknown action "${action}". Expected execute, transcribe, testConnection or listModels.`, 400, 'unknown_action');
  }

  /* ── Step 4: resolve the configuration ─────────────────────────
     A capability tag is accepted as a fallback so a module can ask for
     "the summarization configuration" without hardcoding an id — the
     highest-priority enabled configuration carrying that tag wins.
     A capability is a thing a model does; it names no module. */
  if (!configurationId) return fail('configurationId is required.', 400, 'missing_configuration_id');

  let configuration = configurations.find((c: any) => c.id === configurationId);
  if (!configuration) {
    const byCapability = configurations
      .filter((c: any) => c.enabled !== false && Array.isArray(c.capabilities) && c.capabilities.includes(configurationId))
      .sort((a: any, b: any) => (a.priority ?? 999) - (b.priority ?? 999));
    configuration = byCapability[0];
  }
  if (!configuration) {
    return fail(
      `No AI configuration matches "${configurationId}". Create one in Settings > AI Providers Config > AI Configurations, or tag an existing one with that capability.`,
      404, 'configuration_not_found'
    );
  }

  /* ── Step 5: resolve provider and model ────────────────────────── */
  const provider = providers.find((p: any) => p.id === configuration.providerId);
  const model = models.find((m: any) => m.id === configuration.modelId);

  /* ── Step 7: validate the chain ────────────────────────────────
     Every one of these produces a specific, actionable message. The
     alternative — a generic "AI unavailable" — is what sent a previous
     round of debugging to the wrong place entirely. */
  const reject = (message: string, code: string) => {
    void logCall(admin, {
      entity_id: entityId,
      configuration_id: configuration.id,
      provider_id: configuration.providerId || 'unresolved',
      model_id: configuration.modelId || 'unresolved',
      capability: (configuration.capabilities || [])[0] || null,
      status: 'rejected',
      latency_ms: Date.now() - startedAt,
      error_code: code,
      error_message: message.slice(0, 500),
      called_by: userId,
    });
    return fail(message, 400, code);
  };

  if (configuration.enabled === false) {
    return reject(`AI configuration "${configuration.name}" is disabled.`, 'configuration_disabled');
  }
  if (!provider) {
    return reject(`Configuration "${configuration.name}" references provider "${configuration.providerId}", which no longer exists.`, 'provider_not_found');
  }
  if (provider.enabled === false) {
    return reject(`Provider "${provider.name}" is disabled.`, 'provider_disabled');
  }
  if (!model) {
    return reject(`Configuration "${configuration.name}" references model "${configuration.modelId}", which no longer exists.`, 'model_not_found');
  }
  if (model.enabled === false) {
    return reject(`Model "${model.displayName || model.name}" is disabled.`, 'model_disabled');
  }
  if (model.providerId !== provider.id) {
    return reject(`Model "${model.displayName || model.name}" belongs to a different provider than "${provider.name}".`, 'model_provider_mismatch');
  }
  const baseUrl = String(provider.baseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) {
    return reject(`Provider "${provider.name}" has no base URL.`, 'no_base_url');
  }
  const credentialRef = String(provider.credentialRef || '').trim();
  if (!credentialRef) {
    return reject(`Provider "${provider.name}" has no stored credential. Save an API key in Settings > AI Providers Config.`, 'no_credential');
  }

  /* ── Step 6: retrieve the credential ──────────────────────────── */
  const { data: secret, error: secretError } = await admin.rpc('ai_credential_get', { p_ref: credentialRef });
  if (secretError || !secret) {
    return reject(`Credential "${credentialRef}" is not in Vault. Re-enter the API key for "${provider.name}".`, 'credential_missing');
  }

  const ctx = { baseUrl, apiKey: String(secret), model: String(model.name) };
  const params = configuration.parameters || {};

  try {
    const adapter = getAdapter(String(provider.type || 'openai-compatible'));

    /* ── Step 8: invoke ─────────────────────────────────────────── */
    if (action === 'transcribe') {
      if (!audio) return reject('No audio supplied.', 'no_audio');
      if (!adapter.transcribe) {
        return reject(`Provider type "${provider.type}" does not support transcription.`, 'transcribe_unsupported');
      }
      const result = await adapter.transcribe(ctx, audio, {
        /* Empty language means auto-detect. Passing '' through would pin
           the request to an invalid language code and fail. */
        language: language && language !== 'auto' ? language : undefined,
        responseFormat: 'verbose_json',
      });

      void logCall(admin, {
        entity_id: entityId,
        configuration_id: configuration.id,
        provider_id: provider.id,
        model_id: model.id,
        capability: 'stt',
        status: authMode === 'user' ? 'ok' : 'ok-anon',
        http_status: 200,
        latency_ms: Date.now() - startedAt,
        called_by: userId,
      });

      /* ── Steps 9 + 10: normalise and return ─────────────────────
         The provider's verbose_json is passed through as `raw` because
         segment timings are the point of it and flattening would lose
         them; `text` is lifted so a caller wanting only words does not
         have to know the provider's shape. */
      return json({
        ok: true,
        text: String((result as any)?.text || ''),
        language: (result as any)?.language || null,
        raw: result,
        model: model.name,
        provider: provider.name,
      });
    }

    const response = await adapter.execute(ctx, {
      prompt: typeof input.prompt === 'string' ? input.prompt : undefined,
      messages: Array.isArray(input.messages) ? (input.messages as any) : undefined,
      system: typeof input.system === 'string' ? input.system : undefined,
      /* Per-call values override the configuration's, so a caller can
         ask for a lower temperature without a second configuration —
         but the configuration supplies the default. */
      temperature: typeof input.temperature === 'number' ? input.temperature : params.temperature,
      maxTokens: typeof input.maxTokens === 'number' ? input.maxTokens : params.maxTokens,
      topP: typeof input.topP === 'number' ? input.topP : params.topP,
      extra: params.extra,
    });

    void logCall(admin, {
      entity_id: entityId,
      configuration_id: configuration.id,
      provider_id: provider.id,
      model_id: model.id,
      capability: (configuration.capabilities || [])[0] || null,
      status: authMode === 'user' ? 'ok' : 'ok-anon',
      http_status: 200,
      latency_ms: Date.now() - startedAt,
      prompt_tokens: response.usage.promptTokens,
      completion_tokens: response.usage.completionTokens,
      called_by: userId,
    });

    /* ── Steps 9 + 10 ──────────────────────────────────────────── */
    return json({
      ok: true,
      text: response.text,
      model: response.model,
      provider: provider.name,
      configurationId: configuration.id,
      usage: response.usage,
      finishReason: response.finishReason,
      latencyMs: Date.now() - startedAt,
    });
  } catch (e) {
    const err = e as AdapterError;
    /* Sanitised against the credential we are holding, so an error body
       that echoed the Authorization header cannot reach the log. */
    const message = sanitizeProviderError(String(err?.message || e), ctx.apiKey);
    const status = err?.status || 502;

    void logCall(admin, {
      entity_id: entityId,
      configuration_id: configuration.id,
      provider_id: provider.id,
      model_id: model.id,
      capability: (configuration.capabilities || [])[0] || null,
      status: 'error',
      http_status: status,
      latency_ms: Date.now() - startedAt,
      error_code: err?.code || 'provider_error',
      error_message: message.slice(0, 500),
      called_by: userId,
    });

    return fail(message, status, err?.code || 'provider_error');
  }
});
