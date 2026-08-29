/* ============================================================
   Briselle Platform — ai-gateway / adapters/openaiCompatible.ts
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Task: BRIS-AI-T158

   Adapter for any provider speaking the OpenAI HTTP shape:
   Groq, OpenAI, Together, OpenRouter, vLLM, LM Studio and most
   self-hosted gateways.

   Endpoints used:
     GET  /models                 discovery + connection test
     POST /chat/completions       execute
     POST /audio/transcriptions   transcribe (Whisper-style)
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

async function request(
  ctx: AdapterContext,
  path: string,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${ctx.baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Authorization: `Bearer ${ctx.apiKey}`, ...(init.headers || {}) },
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
  } catch { /* body was not JSON — the sanitised text is what we have */ }

  /* A 404 on chat/completions almost always means the MODEL name is
     wrong, not the URL. Saying so saves the admin from checking the base
     URL first — this exact 404 cost a full debugging round already. */
  if (res.status === 404) {
    throw new AdapterError(
      `Provider rejected model "${ctx.model}" (404). The model id does not exist on this account. ` +
      `Check it in Settings > AI Providers Config > Models. Provider said: ${detail || 'no detail'}`,
      404,
      'model_not_found'
    );
  }
  if (res.status === 401 || res.status === 403) {
    throw new AdapterError(
      `Provider rejected the credential (${res.status}). Re-enter the API key for this provider. Provider said: ${detail || 'no detail'}`,
      res.status,
      'bad_credential'
    );
  }
  if (res.status === 429) {
    throw new AdapterError(
      `Provider rate limit or quota exceeded (429). Provider said: ${detail || 'no detail'}`,
      429,
      'rate_limited'
    );
  }
  throw new AdapterError(
    `Provider returned ${res.status}. ${detail || 'No detail supplied.'}`,
    res.status >= 400 && res.status < 600 ? res.status : 502,
    'provider_error'
  );
}

export const openaiCompatibleAdapter: AiProviderAdapter = {
  type: 'openai-compatible',

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

      /* If a model is configured, confirm the provider actually has it.
         A green tick that only proves the URL resolves is worse than no
         test: it sends the admin looking somewhere else when the call
         later 404s on the model. */
      if (ctx.model && models.length && !models.includes(ctx.model)) {
        return {
          ok: false,
          latencyMs,
          models,
          message: `Connected, but this provider does not offer "${ctx.model}". It has ${models.length} model(s), e.g. ${models.slice(0, 3).join(', ')}.`,
        };
      }

      return {
        ok: true,
        latencyMs,
        models,
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
    const messages = req.messages?.length
      ? req.messages
      : [
          ...(req.system ? [{ role: 'system' as const, content: req.system }] : []),
          { role: 'user' as const, content: String(req.prompt || '') },
        ];

    if (!messages.some((m) => String(m.content || '').trim())) {
      throw new AdapterError('Request has no prompt content.', 400, 'empty_request');
    }

    const payload: Record<string, unknown> = {
      model: ctx.model,
      messages,
      ...(req.extra || {}),
    };
    /* Only send parameters that were actually configured. Sending
       max_tokens unasked would cap output the caller never limited —
       and on some providers it also counts toward the TPM budget. */
    if (typeof req.temperature === 'number') payload.temperature = req.temperature;
    if (typeof req.maxTokens === 'number') payload.max_tokens = req.maxTokens;
    if (typeof req.topP === 'number') payload.top_p = req.topP;

    const res = await request(ctx, '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) await failFrom(res, ctx);

    const body = await res.json().catch(() => ({}));
    const choice = body?.choices?.[0];
    return {
      text: String(choice?.message?.content ?? ''),
      model: String(body?.model || ctx.model),
      usage: {
        promptTokens: Number.isFinite(body?.usage?.prompt_tokens) ? body.usage.prompt_tokens : null,
        completionTokens: Number.isFinite(body?.usage?.completion_tokens) ? body.usage.completion_tokens : null,
      },
      finishReason: choice?.finish_reason ?? null,
    };
  },

  async transcribe(ctx, audio, opts) {
    const form = new FormData();
    form.append('file', audio, 'audio.webm');
    form.append('model', ctx.model);
    form.append('response_format', opts?.responseFormat || 'verbose_json');
    /* No `language` field means the provider auto-detects, which is what
       "Auto" in the UI relies on. Sending an empty string instead would
       pin it to an invalid language and fail. */
    if (opts?.language) form.append('language', opts.language);

    const res = await request(ctx, '/audio/transcriptions', { method: 'POST', body: form });
    if (!res.ok) await failFrom(res, ctx);
    return await res.json();
  },
};
