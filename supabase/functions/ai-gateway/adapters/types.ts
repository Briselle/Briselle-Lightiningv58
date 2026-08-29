/* ============================================================
   Briselle Platform — ai-gateway / adapters/types.ts
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Task: BRIS-AI-T158

   The provider adapter contract. One interface, one normalised
   response shape, so a new provider family is a new file rather than
   a change to the gateway.
   ============================================================ */

export interface AdapterContext {
  /** Provider base URL, no trailing slash. */
  baseUrl: string;
  /** The credential, retrieved from Vault by the gateway. Never logged. */
  apiKey: string;
  /** Wire model id sent to the provider. */
  model: string;
}

export interface AiExecuteRequest {
  /** A single prompt. Mutually exclusive with `messages`. */
  prompt?: string;
  /** Full chat turn list, when the caller needs system/assistant roles. */
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  /** Pass-through for provider-specific fields. */
  extra?: Record<string, unknown>;
}

/** One normalised shape, whatever the provider returned. */
export interface AiExecuteResponse {
  text: string;
  model: string;
  usage: { promptTokens: number | null; completionTokens: number | null };
  /** Provider's own stop reason, verbatim, for diagnosis. */
  finishReason: string | null;
}

export interface TestConnectionResult {
  ok: boolean;
  /** Safe to show an administrator. Never contains the credential. */
  message: string;
  /** Model ids the provider reported, when it can list them. */
  models?: string[];
  latencyMs?: number;
}

export interface AiProviderAdapter {
  readonly type: string;
  testConnection(ctx: AdapterContext): Promise<TestConnectionResult>;
  listModels?(ctx: AdapterContext): Promise<string[]>;
  execute(ctx: AdapterContext, request: AiExecuteRequest): Promise<AiExecuteResponse>;
  /** Audio transcription, for providers that offer it. */
  transcribe?(ctx: AdapterContext, audio: Blob, opts: { language?: string; responseFormat?: string }): Promise<unknown>;
}

/**
 * An error carrying an HTTP status, so the gateway can return the
 * provider's status rather than flattening everything to 500 — a 401
 * from the provider and a bug in the gateway need different responses.
 */
export class AdapterError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string = 'provider_error'
  ) {
    super(message);
    this.name = 'AdapterError';
  }
}

/**
 * Strip anything secret-looking from a provider error before it is
 * returned or logged. Providers do echo request context in error
 * bodies, and an Authorization header among it would otherwise land in
 * ai_gateway_log.error_message.
 */
export function sanitizeProviderError(raw: string, apiKey: string): string {
  let out = String(raw || '').slice(0, 800);
  if (apiKey) {
    out = out.split(apiKey).join('***');
  }
  return out
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer ***')
    .replace(/\b(sk|gsk|xai|pk|api)[-_][A-Za-z0-9._-]{8,}\b/gi, '***');
}
