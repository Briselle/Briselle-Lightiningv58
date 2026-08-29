/* ============================================================
   Briselle Platform — ai-gateway / adapters/anthropic.ts
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Task: BRIS-AI-T161

   Adapter for the Anthropic Messages API.

   Three ways it differs from the OpenAI shape, all handled here so the
   gateway does not have to care:
     1. Auth header is `x-api-key`, not `Authorization: Bearer`.
     2. `anthropic-version` is a REQUIRED header.
     3. `system` is a top-level field, not a message with role=system.
     4. `max_tokens` is REQUIRED — the request is rejected without it.
   ============================================================ */
import {
  AdapterError,
  sanitizeProviderError,
  type AdapterContext,
  type AiExecuteRequest,
  type AiExecuteResponse,
  type AiProviderAdapter,
  type TestConnectionResult,
} from './types.ts';

const TIMEOUT_MS = 120_000;
const ANTHROPIC_VERSION = '2023-06-01';

/** Anthropic rejects a request with no max_tokens, so one is always sent. */
const DEFAULT_MAX_TOKENS = 4096;

async function request(ctx: AdapterContext, path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${ctx.baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'x-api-key': ctx.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        ...(init.headers || {}),
      },
    });
  } catch (e) {
    const aborted = (e as Error)?.name === 'AbortError';
    throw new AdapterError(
      aborted
        ? `Provider did not respond within ${TIMEOUT_MS / 1000}s.`
        : `Could not reach the provider: ${sanitizeProviderError(String((e as Error)?.message || e), ctx.apiKey)}`,
      aborted ? 504 : 502,
      aborted ? 'provider_timeout' : 'provider_unreachable'
    );
  } finally {
    clearTimeout(timer);
  }
}

async function failFrom(res: Response, ctx: AdapterContext): Promise<never> {
  const body = await res.text().catch(() => '');
  let detail = sanitizeProviderError(body, ctx.apiKey);
  try {
    const parsed = JSON.parse(body);
    if (parsed?.error?.message) detail = sanitizeProviderError(String(parsed.error.message), ctx.apiKey);
  } catch { /* not JSON */ }

  if (res.status === 404) {
    throw new AdapterError(
      `Provider rejected model "${ctx.model}" (404). Check the model id in Settings > AI Providers Config > Models. Provider said: ${detail || 'no detail'}`,
      404, 'model_not_found'
    );
  }
  if (res.status === 401 || res.status === 403) {
    throw new AdapterError(
      `Provider rejected the credential (${res.status}). Re-enter the API key. Provider said: ${detail || 'no detail'}`,
      res.status, 'bad_credential'
    );
  }
  if (res.status === 429) {
    throw new AdapterError(`Provider rate limit exceeded (429). Provider said: ${detail || 'no detail'}`, 429, 'rate_limited');
  }
  throw new AdapterError(`Provider returned ${res.status}. ${detail || 'No detail supplied.'}`, res.status, 'provider_error');
}

export const anthropicAdapter: AiProviderAdapter = {
  type: 'anthropic',

  async listModels(ctx: AdapterContext): Promise<string[]> {
    const res = await request(ctx, '/models', { method: 'GET' });
    if (!res.ok) await failFrom(res, ctx);
    const body = await res.json().catch(() => ({}));
    const rows = Array.isArray(body?.data) ? body.data : [];
    return rows.map((m: any) => String(m?.id || '')).filter(Boolean).sort();
  },

  async testConnection(ctx: AdapterContext): Promise<TestConnectionResult> {
    const started = Date.now();
    try {
      const models = await this.listModels!(ctx);
      const latencyMs = Date.now() - started;
      if (ctx.model && models.length && !models.includes(ctx.model)) {
        return {
          ok: false, latencyMs, models,
          message: `Connected, but this provider does not offer "${ctx.model}". It has ${models.length} model(s), e.g. ${models.slice(0, 3).join(', ')}.`,
        };
      }
      return {
        ok: true, latencyMs, models,
        message: ctx.model
          ? `Connected in ${latencyMs}ms. Model "${ctx.model}" is available.`
          : `Connected in ${latencyMs}ms. ${models.length} model(s) available.`,
      };
    } catch (e) {
      const err = e as AdapterError;
      return { ok: false, latencyMs: Date.now() - started, message: err?.message || 'Connection failed.' };
    }
  },

  async execute(ctx: AdapterContext, req: AiExecuteRequest): Promise<AiExecuteResponse> {
    /* role=system in the message list is an OpenAI convention. Anthropic
       wants it hoisted, so lift any system turns rather than passing them
       through to be rejected. */
    const incoming = req.messages?.length
      ? req.messages
      : [{ role: 'user' as const, content: String(req.prompt || '') }];

    const systemParts = [
      ...(req.system ? [req.system] : []),
      ...incoming.filter((m) => m.role === 'system').map((m) => m.content),
    ].filter(Boolean);

    const messages = incoming
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    if (!messages.length || !messages.some((m) => String(m.content || '').trim())) {
      throw new AdapterError('Request has no prompt content.', 400, 'empty_request');
    }

    const payload: Record<string, unknown> = {
      model: ctx.model,
      messages,
      max_tokens: typeof req.maxTokens === 'number' ? req.maxTokens : DEFAULT_MAX_TOKENS,
      ...(req.extra || {}),
    };
    if (systemParts.length) payload.system = systemParts.join('\n\n');
    if (typeof req.temperature === 'number') payload.temperature = req.temperature;
    if (typeof req.topP === 'number') payload.top_p = req.topP;

    const res = await request(ctx, '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) await failFrom(res, ctx);

    const body = await res.json().catch(() => ({}));
    /* content is an array of typed blocks; only the text ones are output. */
    const text = Array.isArray(body?.content)
      ? body.content.filter((b: any) => b?.type === 'text').map((b: any) => String(b?.text || '')).join('')
      : '';

    return {
      text,
      model: String(body?.model || ctx.model),
      usage: {
        promptTokens: Number.isFinite(body?.usage?.input_tokens) ? body.usage.input_tokens : null,
        completionTokens: Number.isFinite(body?.usage?.output_tokens) ? body.usage.output_tokens : null,
      },
      finishReason: body?.stop_reason ?? null,
    };
  },
};
