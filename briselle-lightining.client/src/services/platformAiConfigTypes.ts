/* ============================================================
   Briselle Enterprise Platform — Platform Services
   platformAiConfigTypes.ts — AI configuration document shape
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-AI-T153

   The shape of the `ai` document stored in platform_config
   (config_type 10 = AIProvidersLoader). See
   database/021_platform_ai_config.sql.

   ── This file names no module ──────────────────────────────────
   Nothing here references NotionNest, Ziva, meeting notes or any
   other feature. Modules are consumers of this registry; the
   registry knows nothing about them. A `capability` tag is the only
   vocabulary shared across the boundary, and a capability is a thing
   a model can do — not a place in the product that wants it.
   ============================================================ */

/**
 * Wire protocols we know how to speak. Open for extension.
 *
 * BRIS-AI-T167: renamed from `ProviderType`. "Type" read as a taxonomy
 * label; it is in fact the adapter selector, and it cannot be dropped —
 * Anthropic differs in five ways the gateway cannot infer at call time
 * (x-api-key instead of Bearer, a required anthropic-version header,
 * top-level `system`, mandatory max_tokens, and /messages instead of
 * /chat/completions). It is now DERIVED from the base URL and shown
 * read-only, with a manual override for the unusual case.
 */
export type ProviderProtocol = 'openai-compatible' | 'anthropic' | 'custom';

/** @deprecated BRIS-AI-T167 — kept so existing imports keep compiling. */
export type ProviderType = ProviderProtocol;

/**
 * Derive the protocol from a base URL.
 *
 * Host-based, not substring-based: a proxy at
 * `https://gateway.acme.com/anthropic-compat/v1` speaks whatever the
 * proxy speaks, and matching the path would guess wrong. When in doubt
 * this returns openai-compatible, which is what the overwhelming
 * majority of endpoints (Groq, OpenAI, Together, OpenRouter, vLLM,
 * LM Studio, Ollama, LiteLLM) actually are.
 */
export function detectProtocol(baseUrl: string): ProviderProtocol {
  let host = '';
  try { host = new URL(String(baseUrl || '')).hostname.toLowerCase(); } catch { host = ''; }
  if (!host) return 'openai-compatible';
  if (host === 'api.anthropic.com' || host.endsWith('.anthropic.com')) return 'anthropic';
  return 'openai-compatible';
}

export const PROTOCOL_LABELS: Record<ProviderProtocol, string> = {
  'openai-compatible': 'OpenAI-compatible',
  'anthropic': 'Anthropic Messages',
  'custom': 'Custom',
};

/** What a model can be used for. Drives which models a configuration offers. */
export type ModelType = 'chat' | 'stt' | 'tts' | 'embedding' | 'vision' | 'other';

/** How a client reaches an MCP server. */
export type McpTransport = 'http' | 'sse' | 'stdio';

/**
 * BRIS-AI-T188 — the result of the last Verify, persisted.
 *
 * Held in the document rather than in component state so the badge on a
 * list survives a reload. Verification is a point-in-time fact, so the
 * timestamp is part of it — a green tick with no date would imply a
 * live guarantee this cannot make.
 */
export interface VerifyStamp {
  ok: boolean;
  /** ISO timestamp of the check. */
  at: string;
  /** Short, safe to display. Never contains a credential. */
  message?: string;
}

export interface AiProvider {
  id: string;
  name: string;
  /** BRIS-AI-T167 — the adapter selector. Auto-detected from baseUrl. */
  protocol: ProviderProtocol;
  /**
   * BRIS-AI-T168 — shipped with the platform vs added by an administrator.
   * Display-only: never editable in the UI, and persisted to Supabase so
   * the distinction survives a reload and is the same for every user.
   */
  isSystemDefined: boolean;
  baseUrl: string;
  /**
   * Opaque pointer into Supabase Vault — `ai:<entityId>:<providerId>`.
   * NEVER the secret itself. The database trigger in migration 021
   * rejects any row carrying a plaintext credential field.
   */
  credentialRef: string;
  enabled: boolean;
  /**
   * BRIS-AI-T166 — Routing Order. Owned exclusively by drag-and-drop;
   * replaces the old manual `priority` input. Two mechanisms writing one
   * value is how they drift apart, so there is now only one.
   */
  order: number;
  /** Capability tags this provider is permitted to serve. */
  capabilities?: string[];
  notes?: string;
  /** BRIS-AI-T188 — last Verify result for this provider's endpoint+key. */
  lastVerify?: VerifyStamp | null;
  /**
   * BRIS-AI-T197 — the provider's own model list, cached.
   *
   * Persisted so the Models dropdown is populated on arrival instead of
   * costing a provider round trip every time the page opens. Refreshed
   * only when the administrator asks, or when it has never been fetched.
   */
  modelCatalogue?: { models: string[]; fetchedAt: string } | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface AiModel {
  /**
   * BRIS-AI-T173 — DERIVED, never authored and never displayed.
   *
   * The user-facing "Internal id" field is gone: two ids for one thing is
   * a troubleshooting trap. This is computed as `providerId::name` so
   * configurations still have something stable to reference and the
   * gateway's lookup is unchanged. Always build it with modelKey().
   */
  id: string;
  providerId: string;
  /** The wire id sent to the provider, e.g. `llama-3.1-8b-instant`. */
  name: string;
  /** What an admin reads in a dropdown. */
  displayName: string;
  type: ModelType;
  enabled: boolean;
  /** Optional ceiling used to warn before a provider rejects the request. */
  contextWindow?: number | null;
  /** BRIS-AI-T175 — per-request completion cap for this model. */
  maxTokensPerRequest?: number | null;
  /**
   * BRIS-AI-T174 — Platform Modules this model can serve.
   *
   * A FILTER for the module picker, not a routing decision: it narrows
   * which models a module's dropdown offers. Routing still resolves
   * through configurations, so nothing downstream reads this.
   */
  moduleTags?: string[];
  /** BRIS-AI-T176 — drag-owned order within its provider. */
  order: number;
  /** BRIS-AI-T188 — last Verify result for this model id. */
  lastVerify?: VerifyStamp | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

/**
 * The stable key for a model. `::` because neither a provider id nor a
 * model wire name may contain it — provider ids are validated against
 * [a-z0-9._-], and no vendor uses a double colon in a model name.
 */
export function modelKey(providerId: string, name: string): string {
  return `${String(providerId || '').trim()}::${String(name || '').trim()}`;
}

export interface AiConfigurationParameters {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  /** Provider-specific extras passed through untouched. */
  extra?: Record<string, unknown>;
}

/**
 * The reusable abstraction a module actually consumes. A module names a
 * configuration (or asks for a capability); it never names a provider,
 * a model, a URL or a key.
 */
export interface AiConfiguration {
  id: string;
  name: string;
  description?: string;
  providerId: string;
  modelId: string;
  parameters: AiConfigurationParameters;
  enabled: boolean;
  /** Capability tags this configuration answers for. */
  capabilities?: string[];
  /** Lower wins when several configurations serve one capability. */
  priority?: number;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface McpServerConfig {
  id: string;
  name: string;
  description?: string;
  transport: McpTransport;
  /** For http / sse transports. */
  url?: string;
  /** For stdio transport. */
  command?: string;
  args?: string[];
  /** Vault pointer, same contract as a provider. Optional — not every
      MCP server needs auth. */
  credentialRef?: string;
  /** Header name the credential is sent under, when the server wants a
      non-standard one. Defaults to Authorization: Bearer. */
  authHeader?: string;
  enabled: boolean;
  /** Tool names to expose. Empty means all. */
  allowedTools?: string[];
  capabilities?: string[];
  updatedAt?: string | null;
  updatedBy?: string | null;
}

/**
 * A Briselle Platform Module.
 *
 * ── Terminology, per KEYWORD_MAP ──────────────────────────────
 * The platform owner calls these "Briselle Platform Modules"; the code
 * has always called them capabilities, and the legacy Ziva registry
 * called them PREDEFINED_MODULE_SCOPES. Three names, one concept: an AI
 * FUNCTION that any block or feature may call.
 *
 * They are deliberately NOT product areas. "Summarization" is the
 * module; Meeting Notes is one consumer of it and other blocks can
 * consume the same one. That is why this layer still references no
 * product feature and the independence rule holds.
 */
export interface AiCapability {
  id: string;
  label: string;
  description?: string;
  /**
   * BRIS-AI-T178 — the master switch. When false the module is off and
   * every call to it fails closed with a named reason; it is never a
   * silent no-op, because a silent one is indistinguishable from a bug.
   */
  aiEnabled: boolean;
  /** BRIS-AI-T179 — drag-owned display order. */
  order: number;
}

export interface AiDocument {
  version: number;
  providers: AiProvider[];
  models: AiModel[];
  configurations: AiConfiguration[];
  mcpServers: McpServerConfig[];
  capabilities: AiCapability[];
  /** true when no platform_config row exists — the UI must say so
      rather than let an admin edit a document that will not persist. */
  missing?: boolean;
}

/**
 * BRIS-AI-T181 — document schema version.
 *
 * v1 -> v2: provider.type -> provider.protocol, provider.priority ->
 * provider.order, provider.isSystemDefined added; model.id becomes
 * derived (providerId::name) with maxTokensPerRequest / moduleTags /
 * order added; capability gains aiEnabled + order.
 *
 * Upgrade runs in database/023_ai_config_v2.sql. The validator refuses
 * to SAVE a document whose version is newer than this build understands,
 * because silently dropping fields it cannot see is data loss disguised
 * as a successful write.
 */
export const AI_DOC_VERSION = 2;

/**
 * Fallback capability vocabulary, used ONLY to label a document whose
 * row predates migration 021's seed. It is a display vocabulary, not
 * configuration: no provider, model, key or endpoint is implied by it,
 * so nothing here can turn into a call that fails at runtime. Providers,
 * models and configurations are never defaulted in code.
 */
export const FALLBACK_CAPABILITIES: AiCapability[] = [
  { id: 'stt',               label: 'Speech to Text',     description: 'Audio transcription and live speech engines',        aiEnabled: false, order: 0 },
  { id: 'summarization',     label: 'Summarization',      description: 'Long-form text and notes summarisation',            aiEnabled: false, order: 1 },
  { id: 'translation',       label: 'Translation Engine', description: 'Multilingual text translation',                     aiEnabled: false, order: 2 },
  { id: 'chat',              label: 'Chat Orchestrator',  description: 'Interactive conversational responses',              aiEnabled: false, order: 3 },
  { id: 'schema_controller', label: 'Schema Controller',  description: 'Structured schema and attribute generation',        aiEnabled: false, order: 4 },
  { id: 'embedding',         label: 'Embeddings',         description: 'Vector embeddings for search and retrieval',        aiEnabled: false, order: 5 },
  { id: 'vision',            label: 'Vision',             description: 'Image and document understanding',                  aiEnabled: false, order: 6 },
  { id: 'tools',             label: 'Tool / MCP Access',  description: 'External tool and MCP connector access',            aiEnabled: false, order: 7 },
];

/* aiEnabled defaults to FALSE on every module. An AI function that
   switches itself on the moment the vocabulary is seeded would start
   spending an entity's provider quota without anyone asking for it. */

/** An empty document. Returned when the platform_config row is absent. */
export function emptyAiDocument(): AiDocument {
  return {
    version: AI_DOC_VERSION,
    providers: [],
    models: [],
    configurations: [],
    mcpServers: [],
    capabilities: FALLBACK_CAPABILITIES,
    missing: true,
  };
}

/**
 * Is this Platform Module ready to run?
 *
 * One function so the Modules tab's status column and the runtime cannot
 * disagree — the previous round shipped two separate readiness checks and
 * they drifted within a day.
 */
export function moduleReadiness(
  doc: AiDocument,
  capabilityId: string
): { ready: boolean; reason: string } {
  const cap = (doc.capabilities || []).find((c) => c.id === capabilityId);
  if (!cap) return { ready: false, reason: `No Platform Module "${capabilityId}".` };
  if (!cap.aiEnabled) {
    return { ready: false, reason: `AI is switched off for "${cap.label}". Enable it in Settings > AI Providers Config > Modules.` };
  }

  const configs = (doc.configurations || []).filter(
    (c) => c.enabled !== false && (c.capabilities || []).includes(capabilityId)
  );
  if (!configs.length) {
    return { ready: false, reason: `"${cap.label}" is enabled but not linked to a provider and model yet.` };
  }

  /* Enabled is not the same as usable: the chain still needs a live
     provider, a live model and a stored credential. */
  for (const config of configs) {
    const provider = (doc.providers || []).find((p) => p.id === config.providerId);
    const model = (doc.models || []).find((m) => m.id === config.modelId);
    if (!provider || provider.enabled === false) continue;
    if (!String(provider.credentialRef || '').trim()) continue;
    if (!model || model.enabled === false) continue;
    if (model.providerId !== provider.id) continue;
    return { ready: true, reason: '' };
  }

  return {
    ready: false,
    reason: `"${cap.label}" is linked, but no linked provider has both a stored API key and an enabled model.`,
  };
}

/**
 * Is this model's verification badge "active" (coloured)?
 *
 * Per the platform owner's rule: a model counts as verified ONLY when
 * the model itself verified AND its parent provider verified. A model
 * tick on an unverified endpoint would claim more than was tested.
 */
export function modelVerified(doc: AiDocument, modelId: string): boolean {
  const model = (doc.models || []).find((m) => m.id === modelId);
  if (!model || model.lastVerify?.ok !== true) return false;
  const provider = (doc.providers || []).find((p) => p.id === model.providerId);
  return provider?.lastVerify?.ok === true;
}

/** How many of a provider's models are verified, and how many exist. */
export function providerVerifiedModelCount(
  doc: AiDocument,
  providerId: string
): { verified: number; total: number } {
  const mine = (doc.models || []).filter((m) => m.providerId === providerId);
  return {
    verified: mine.filter((m) => modelVerified(doc, m.id)).length,
    total: mine.length,
  };
}

/** Build the Vault pointer for a provider. Derived, never random. */
export function credentialRefFor(entityId: number | string, providerId: string): string {
  return `ai:${entityId}:${providerId}`;
}
