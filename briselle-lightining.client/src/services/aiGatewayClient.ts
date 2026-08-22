/* ============================================================
   Briselle Enterprise Platform — Platform Services
   aiGatewayClient.ts — the module-facing AI contract
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-AI-T159

   The ONE way a platform module calls AI:

     const { text } = await executeAI({
       configurationId: 'fast-summary',
       input: { prompt },
     });

   A module names a configuration (or a capability). It never names a
   provider, a model, a URL or a key — it cannot, because none of those
   are reachable from the browser.

   ── Why this is a thin wrapper ─────────────────────────────────
   All resolution happens in the ai-gateway Edge Function: it holds the
   service-role key, so it is the only thing that can read a credential
   out of Vault. Doing any of that here would mean shipping the secret
   to the browser, which is the whole problem this replaces.
   ============================================================ */
import { supabase } from '../utils/supabase';

const FUNCTION_NAME = 'ai-gateway';

export interface ExecuteAiInput {
  prompt?: string;
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  system?: string;
  /** Overrides the configuration's value for this one call. */
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface ExecuteAiRequest {
  /** A configuration id, or a capability tag to resolve by priority. */
  configurationId: string;
  input: ExecuteAiInput;
}

export interface ExecuteAiResult {
  ok: boolean;
  text: string;
  model?: string;
  provider?: string;
  configurationId?: string;
  usage?: { promptTokens: number | null; completionTokens: number | null };
  finishReason?: string | null;
  latencyMs?: number;
  /** Populated when ok is false. Safe to show a user. */
  error?: { code: string; message: string };
}

export interface TranscribeResult {
  ok: boolean;
  text: string;
  language?: string | null;
  /** Provider verbose_json, including segment timings. */
  raw?: any;
  model?: string;
  provider?: string;
  error?: { code: string; message: string };
}

/** Is the gateway reachable? Cached per session — a deploy is not live-swapped. */
let gatewayAvailable: boolean | null = null;

export function isGatewayKnownUnavailable(): boolean {
  return gatewayAvailable === false;
}

function normalizeError(raw: any): { code: string; message: string } {
  /* supabase.functions.invoke surfaces a non-2xx as a FunctionsHttpError
     whose message is generic ("Edge Function returned a non-2xx status
     code"). The useful message is in the response body, so it is read
     out explicitly — otherwise every provider failure reads identically
     and tells an operator nothing. */
  const code = String(raw?.code || 'gateway_error');
  const message = String(raw?.message || 'The AI gateway returned an error.');
  return { code, message };
}

/**
 * Make sure a real Supabase session exists before calling the gateway.
 *
 * The gateway authenticates the caller as step 1 of its sequence, so it
 * needs a USER JWT. Without a session, functions.invoke() sends the anon
 * key, which is not a user token — every call came back
 * "Invalid or expired session", which reads like a gateway fault rather
 * than a missing login.
 *
 * The app's own convention (see pages/records/RecordsList.tsx) is an
 * anonymous session, so that is reused here rather than inventing a
 * second auth path. If anonymous sign-in is disabled on the project this
 * returns false and the caller reports something actionable.
 */
async function ensureSession(): Promise<void> {
  /* Best effort, never a blocker.
     A real user JWT is preferred and the gateway uses it when present.
     But this platform has no authentication layer yet — App.tsx
     hardcodes isAuthenticated and nothing signs in — and anonymous
     sign-in is disabled on the project, so demanding a session here
     failed every call before it was even sent. The gateway accepts the
     anon key as an unauthenticated platform call, so if no session can
     be obtained we simply proceed and let it decide. */
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) return;
    /* Upgrades the call to a real identity wherever it is permitted. */
    await supabase.auth.signInAnonymously();
  } catch {
    /* Anonymous sign-in disabled, or offline. Proceed as the platform. */
  }
}

async function invoke(body: unknown): Promise<{ data: any; error: any }> {
  await ensureSession();

  try {
    const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body });

    if (error) {
      /* Pull the real message out of the error's response body. */
      let payload: any = null;
      try {
        const res = (error as any)?.context;
        if (res && typeof res.json === 'function') payload = await res.json();
      } catch { /* body was not JSON — fall through to the generic message */ }

      if (payload?.error) return { data: null, error: payload.error };

      const message = String((error as any)?.message || 'Edge Function call failed.');
      /* A missing deployment is worth distinguishing loudly: everything
         else is a configuration problem the admin can fix in the UI,
         this one needs `supabase functions deploy ai-gateway`. */
      if (/not found|404|failed to fetch|failed to send/i.test(message)) {
        gatewayAvailable = false;
        return {
          data: null,
          error: {
            code: 'gateway_unreachable',
            message: 'The ai-gateway Edge Function is not reachable. Deploy it with "supabase functions deploy ai-gateway".',
          },
        };
      }
      return { data: null, error: { code: 'gateway_error', message } };
    }

    gatewayAvailable = true;
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: { code: 'gateway_error', message: String(e?.message || e) } };
  }
}

/**
 * Execute an AI call through the gateway.
 *
 * Never throws — a module rendering a summary must not crash because a
 * provider is down. Check `ok` and show `error.message`, which is
 * already written to be read by a person and is guaranteed free of
 * credentials.
 */
export async function executeAI(request: ExecuteAiRequest): Promise<ExecuteAiResult> {
  const configurationId = String(request?.configurationId || '').trim();
  if (!configurationId) {
    return { ok: false, text: '', error: { code: 'missing_configuration_id', message: 'configurationId is required.' } };
  }

  const { data, error } = await invoke({
    action: 'execute',
    configurationId,
    input: request.input || {},
  });

  if (error) return { ok: false, text: '', error: normalizeError(error) };
  if (!data?.ok) return { ok: false, text: '', error: normalizeError(data?.error) };

  return {
    ok: true,
    text: String(data.text || ''),
    model: data.model,
    provider: data.provider,
    configurationId: data.configurationId,
    usage: data.usage,
    finishReason: data.finishReason,
    latencyMs: data.latencyMs,
  };
}

/**
 * Transcribe audio through the gateway.
 *
 * Multipart rather than JSON because a Blob cannot be serialised into
 * one, and base64 would inflate the payload by a third for no benefit.
 * `language` omitted or 'auto' lets the provider detect it.
 */
export async function transcribeAudio(
  configurationId: string,
  audio: Blob,
  options: { language?: string; filename?: string } = {}
): Promise<TranscribeResult> {
  const id = String(configurationId || '').trim();
  if (!id) {
    return { ok: false, text: '', error: { code: 'missing_configuration_id', message: 'configurationId is required.' } };
  }
  if (!audio || !audio.size) {
    return { ok: false, text: '', error: { code: 'no_audio', message: 'No audio to transcribe.' } };
  }

  const form = new FormData();
  form.append('action', 'transcribe');
  form.append('configurationId', id);
  form.append('audio', audio, options.filename || 'audio.webm');
  if (options.language && options.language !== 'auto') form.append('language', options.language);

  const { data, error } = await invoke(form);

  if (error) return { ok: false, text: '', error: normalizeError(error) };
  if (!data?.ok) return { ok: false, text: '', error: normalizeError(data?.error) };

  return {
    ok: true,
    text: String(data.text || ''),
    language: data.language ?? null,
    raw: data.raw,
    model: data.model,
    provider: data.provider,
  };
}

/* ══════════════════════════════════════════════════════════════════
   Administrative calls — used by Settings > AI Providers Config only.

   These live here rather than in the settings page because they must
   go through the gateway: a browser-side connection test would need
   the credential, which is exactly what the gateway exists to prevent.
   ══════════════════════════════════════════════════════════════════ */

export interface TestConnectionResult {
  ok: boolean;
  message: string;
  models?: string[];
  latencyMs?: number;
}

/**
 * Test a provider's credential and base URL, server-side.
 *
 * Pass `modelName` to also verify the provider actually offers that
 * model. Without it the test only proves the URL and key work — which
 * is how a configuration can pass its test and still 404 on every call.
 */
export async function testProviderConnection(
  providerId: string,
  modelName?: string
): Promise<TestConnectionResult> {
  const { data, error } = await invoke({
    action: 'testConnection',
    providerId: String(providerId || '').trim(),
    modelName: String(modelName || '').trim(),
  });

  if (error) return { ok: false, message: normalizeError(error).message };
  return {
    ok: data?.ok === true,
    message: String(data?.message || data?.error?.message || 'No response from the gateway.'),
    models: Array.isArray(data?.models) ? data.models : undefined,
    latencyMs: data?.latencyMs,
  };
}

/**
 * Ask a provider which models it has.
 *
 * Returns [] on failure. A settings screen falls back to manual entry,
 * which stays the supported path regardless — discovery is a
 * convenience, never a gate.
 */
export async function listProviderModels(providerId: string): Promise<{ models: string[]; error?: string }> {
  const { data, error } = await invoke({
    action: 'listModels',
    providerId: String(providerId || '').trim(),
  });

  if (error) return { models: [], error: normalizeError(error).message };
  if (!data?.ok) return { models: [], error: normalizeError(data?.error).message };
  return { models: Array.isArray(data.models) ? data.models : [] };
}
