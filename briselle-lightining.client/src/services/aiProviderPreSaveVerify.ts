/* ============================================================
   Briselle Enterprise Platform — Platform Services
   aiProviderPreSaveVerify.ts — verify a credential BEFORE it is stored
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-AI-T170

   ── Why this file is allowed to touch a raw key ────────────────
   The platform rule is that a provider credential must never be stored
   in, or returned to, the browser. This function breaks neither:

     * The key is one the administrator has JUST TYPED into the form. It
       is already in the page, in an input element, at this instant. A
       request that uses it therefore exposes nothing that was not
       already exposed.
     * It is a function ARGUMENT only. Never assigned to state, never
       written to the config document, never put in browser storage,
       never logged. It ceases to exist when the call returns.
     * It is used for a read-only GET /models — never a completion, so
       it cannot spend the account's token quota.

   The alternative was worse: no Verify at all until the Edge Function is
   deployed, which is what left an administrator pasting a key and having
   to save-then-fail to discover a typo.

   ── What still REQUIRES the server ────────────────────────────
   Verifying an ALREADY-SAVED provider. By then the secret is in Vault
   and only the ai-gateway Edge Function can read it, so that path goes
   through aiGatewayClient.testProviderConnection(). This file is
   strictly for the pre-save case.

   This file is listed explicitly in
   .agents/scripts/verify-ai-config-boundary.js as the single audited
   exemption to the no-client-credential rule.
   ============================================================ */
import type { ProviderProtocol } from './platformAiConfigTypes';

export interface PreSaveVerifyRequest {
  baseUrl: string;
  /** Transient. Argument only — see the file header. */
  secret: string;
  protocol: ProviderProtocol;
  /** Optional: also confirm the provider actually offers this model. */
  modelName?: string;
}

export interface PreSaveVerifyResult {
  ok: boolean;
  /** Safe to display. Never contains the credential. */
  message: string;
  /** Model ids the provider reported, when it can list them. */
  models?: string[];
  httpStatus?: number;
  latencyMs?: number;
}

const TIMEOUT_MS = 20_000;

/**
 * Redact anything key-shaped before a provider's own error text is shown.
 * Providers do echo request context back, and the point of this file is
 * that the key must not travel any further than the request itself.
 */
function redact(text: string, secret: string): string {
  let out = String(text || '').slice(0, 400);
  if (secret) out = out.split(secret).join('***');
  return out
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer ***')
    .replace(/\b(sk|gsk|xai|pk|api)[-_][A-Za-z0-9._-]{8,}\b/gi, '***');
}

/**
 * Ping a provider with a credential that has not been saved yet.
 *
 * Never throws — a Verify button must always render an answer.
 */
export async function verifyProviderPreSave(
  request: PreSaveVerifyRequest
): Promise<PreSaveVerifyResult> {
  const baseUrl = String(request?.baseUrl || '').trim().replace(/\/+$/, '');
  const secret = String(request?.secret || '').trim();
  const protocol = request?.protocol || 'openai-compatible';
  const modelName = String(request?.modelName || '').trim();

  if (!baseUrl) return { ok: false, message: 'Enter a Base URL first.' };
  if (!secret) return { ok: false, message: 'Enter an API key to verify.' };

  let parsed: URL | null = null;
  try { parsed = new URL(baseUrl); } catch { parsed = null; }
  if (!parsed) return { ok: false, message: `"${baseUrl}" is not a valid URL.` };
  if (parsed.protocol === 'http:' && !/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(parsed.hostname)) {
    return { ok: false, message: 'Refusing to send a credential over plain http. Use https.' };
  }

  /* Anthropic authenticates with x-api-key and requires a version
     header; everything else uses a bearer token. Same divergence the
     gateway adapters handle — which is exactly why `protocol` exists. */
  const headers: Record<string, string> = protocol === 'anthropic'
    ? { 'x-api-key': secret, 'anthropic-version': '2023-06-01' }
    : { Authorization: `Bearer ${secret}` };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();

  try {
    const res = await fetch(`${baseUrl}/models`, { method: 'GET', headers, signal: controller.signal });
    const latencyMs = Date.now() - started;

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      let detail = redact(body, secret);
      try {
        const parsedBody = JSON.parse(body);
        if (parsedBody?.error?.message) detail = redact(String(parsedBody.error.message), secret);
      } catch { /* not JSON — the redacted text is what we have */ }

      if (res.status === 401 || res.status === 403) {
        return {
          ok: false, httpStatus: res.status, latencyMs,
          message: `The provider rejected this key (${res.status}). Check it for a typo or a trailing space. ${detail || ''}`.trim(),
        };
      }
      if (res.status === 404) {
        return {
          ok: false, httpStatus: res.status, latencyMs,
          message: `404 at ${baseUrl}/models — the Base URL is probably wrong. It should be the API root, e.g. https://api.groq.com/openai/v1. ${detail || ''}`.trim(),
        };
      }
      return {
        ok: false, httpStatus: res.status, latencyMs,
        message: `Provider returned ${res.status}. ${detail || 'No detail supplied.'}`,
      };
    }

    const body = await res.json().catch(() => ({} as any));
    const models: string[] = Array.isArray(body?.data)
      ? body.data.map((m: any) => String(m?.id || '')).filter(Boolean).sort()
      : [];

    /* A green tick that only proves the URL resolves is worse than none:
       it sends the admin looking elsewhere when the call later 404s on
       the model. So if a model was named, confirm the provider has it. */
    if (modelName && models.length && !models.includes(modelName)) {
      return {
        ok: false, httpStatus: res.status, latencyMs, models,
        message: `Key and URL are valid, but this provider does not offer "${modelName}". It has ${models.length} model(s), e.g. ${models.slice(0, 3).join(', ')}.`,
      };
    }

    return {
      ok: true, httpStatus: res.status, latencyMs, models,
      message: models.length
        ? `Verified in ${latencyMs}ms — ${models.length} model(s) available.`
        : `Verified in ${latencyMs}ms. The provider accepted the key but listed no models; enter a model id manually.`,
    };
  } catch (e: any) {
    const aborted = e?.name === 'AbortError';
    return {
      ok: false,
      latencyMs: Date.now() - started,
      message: aborted
        ? `No response within ${TIMEOUT_MS / 1000}s. Check the Base URL and that the host is reachable.`
        /* A browser CORS refusal is indistinguishable from a network
           failure in JS, so both possibilities are named rather than
           guessing one and sending the admin down the wrong path. */
        : `Could not reach ${baseUrl}. This is either a network problem or the provider not permitting browser requests (CORS) — in the latter case Verify will work once the ai-gateway function is deployed. ${redact(String(e?.message || e), secret)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
