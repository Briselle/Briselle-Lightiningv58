/* ============================================================
   Briselle Enterprise Platform — Platform Services
   platformAiConfigService.ts — read/write the AI configuration document
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-AI-T153 / T160

   ── Where it lives ─────────────────────────────────────────────
   Table  : platform_config
   Scope  : entity_id    per-entity (see AI_CONFIG_ENTITY_ID below)
            dobj_id      1000000003
            config_type  10  (AIProvidersLoader)
   Name   : 'PlatformAIConfig'

   See database/021_platform_ai_config.sql.

   ── Credentials are NOT here ───────────────────────────────────
   This service reads and writes structure only. Secrets go to Supabase
   Vault through the RPCs in database/022_ai_credentials_vault.sql, and
   the only function that can read one back is granted to service_role
   alone. Nothing in this file can obtain an API key, which is the point.

   ── One query per page load ────────────────────────────────────
   The PROMISE is cached, not just the result, so callers mounting in
   the same tick share one in-flight request. Every write invalidates
   it. This is the T141 lesson applied up front: three meeting blocks on
   one page used to mean three identical platform_config queries, which
   was part of the request burst behind the long spinner and the
   intermittent "TypeError: Failed to fetch".
   ============================================================ */
import { supabase } from '../utils/supabase';
import {
  AI_DOC_VERSION,
  FALLBACK_CAPABILITIES,
  emptyAiDocument,
  credentialRefFor,
  detectProtocol,
  modelKey,
} from './platformAiConfigTypes';
import type {
  VerifyStamp,
  AiCapability,
  AiConfiguration,
  AiDocument,
  AiModel,
  AiProvider,
  McpServerConfig,
  ProviderProtocol,
} from './platformAiConfigTypes';
import { validateAiDocument } from './platformAiConfigValidation';

/** platform_config.config_type — 10 = AIProvidersLoader. */
export const AI_CONFIG_TYPE = 10;
export const AI_CONFIG_NAME = 'PlatformAIConfig';
export const AI_CONFIG_DOBJ_ID = 1000000003;

/**
 * FLAGGED: single-tenant placeholder.
 *
 * The design is per-entity — each entity gets its own AI Providers page,
 * administered by that entity's admin. The platform has no role model or
 * current-entity resolver in the client yet, so this is pinned to the
 * Briselle org. When one exists, replace this constant with a lookup;
 * every read and write below already goes through getEntityId(), so this
 * is the only line that changes.
 */
export const AI_CONFIG_ENTITY_ID = 1000000000;

let entityOverride: number | null = null;

/** Point the service at another entity. For when a resolver exists. */
export function setAiConfigEntityId(entityId: number | null): void {
  if (entityOverride !== entityId) {
    entityOverride = entityId;
    invalidateAiConfigCache();
  }
}

export function getEntityId(): number {
  return entityOverride ?? AI_CONFIG_ENTITY_ID;
}

/* ══════════════════════════════════════════════════════════════════
   Normalisation — callers never handle a half-shape.
   ══════════════════════════════════════════════════════════════════ */

const str = (v: unknown, fallback = ''): string =>
  (typeof v === 'string' ? v : v == null ? '' : String(v)).trim() || fallback;

const bool = (v: unknown, fallback = true): boolean =>
  typeof v === 'boolean' ? v : fallback;

/**
 * A number, or null for "not set".
 *
 * The early return is the whole point. Number() coerces several
 * "absent" values to 0 — Number(null) === 0, Number('') === 0,
 * Number(false) === 0 — and Number.isFinite(0) is true, so the old
 * version turned every unset field into a real zero.
 *
 * That single line broke drag-and-drop on both lists: migration 023
 * writes maxTokensPerRequest as JSON null, it normalised to 0, and
 * validateModel rejected 0 as "not a positive whole number". Because
 * every save validates the WHOLE document, reordering providers failed
 * on the models' zeros — and with three models the same message was
 * reported three times.
 */
const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** A stamp, or null. Never a half-shape the UI has to guard against. */
function normalizeVerify(raw: any): VerifyStamp | null {
  if (!raw || typeof raw !== 'object' || typeof raw.at !== 'string') return null;
  return { ok: raw.ok === true, at: raw.at, message: str(raw.message) || undefined };
}

function normalizeProvider(raw: any, index = 0): AiProvider {
  const baseUrl = str(raw?.baseUrl);

  /* T167: accept the v1 `type` as well as the v2 `protocol`, so a
     document read before migration 023 has run still normalises. Falls
     back to detection from the URL rather than to a fixed default. */
  const stated = str(raw?.protocol) || str(raw?.type);
  const protocol: ProviderProtocol =
    (['openai-compatible', 'anthropic', 'custom'].includes(stated) ? stated : detectProtocol(baseUrl)) as ProviderProtocol;

  return {
    id: str(raw?.id),
    name: str(raw?.name, str(raw?.id)),
    protocol,
    isSystemDefined: raw?.isSystemDefined === true,
    baseUrl,
    credentialRef: str(raw?.credentialRef),
    enabled: bool(raw?.enabled),
    /* T166: `order` is drag-owned. `priority` is read once for v1
       compatibility and never written back. Array position is the last
       resort so a list without either does not shuffle between reads. */
    order: numOrNull(raw?.order) ?? numOrNull(raw?.priority) ?? index,
    capabilities: Array.isArray(raw?.capabilities) ? raw.capabilities.map((c: unknown) => str(c)).filter(Boolean) : [],
    notes: str(raw?.notes) || undefined,
    lastVerify: normalizeVerify(raw?.lastVerify),
    modelCatalogue: normalizeCatalogue(raw?.modelCatalogue),
    updatedAt: raw?.updatedAt || null,
    updatedBy: raw?.updatedBy || null,
  };
}

function normalizeCatalogue(raw: any): { models: string[]; fetchedAt: string } | null {
  if (!raw || typeof raw !== 'object' || typeof raw.fetchedAt !== 'string') return null;
  const models = Array.isArray(raw.models) ? raw.models.map((m: unknown) => str(m)).filter(Boolean) : [];
  return { models, fetchedAt: raw.fetchedAt };
}

function normalizeModel(raw: any, index = 0): AiModel {
  const providerId = str(raw?.providerId);
  const name = str(raw?.name, str(raw?.id));
  return {
    /* T173: ALWAYS derived. Never trust an incoming `id` — a v1 document
       carries the old authored one, and honouring it would leave two
       models keyed differently for the same provider+name pair. */
    id: modelKey(providerId, name),
    providerId,
    name,
    displayName: str(raw?.displayName, name),
    type: (['chat', 'stt', 'tts', 'embedding', 'vision', 'other'].includes(raw?.type) ? raw.type : 'chat'),
    enabled: bool(raw?.enabled),
    contextWindow: numOrNull(raw?.contextWindow),
    maxTokensPerRequest: numOrNull(raw?.maxTokensPerRequest),
    moduleTags: Array.isArray(raw?.moduleTags) ? raw.moduleTags.map((t: unknown) => str(t)).filter(Boolean) : [],
    order: numOrNull(raw?.order) ?? index,
    lastVerify: normalizeVerify(raw?.lastVerify),
    updatedAt: raw?.updatedAt || null,
    updatedBy: raw?.updatedBy || null,
  };
}

function normalizeConfiguration(raw: any): AiConfiguration {
  const p = raw?.parameters || {};
  return {
    id: str(raw?.id),
    name: str(raw?.name, str(raw?.id)),
    description: str(raw?.description) || undefined,
    providerId: str(raw?.providerId),
    modelId: str(raw?.modelId),
    parameters: {
      temperature: numOrNull(p?.temperature) ?? undefined,
      maxTokens: numOrNull(p?.maxTokens) ?? undefined,
      topP: numOrNull(p?.topP) ?? undefined,
      extra: p?.extra && typeof p.extra === 'object' ? p.extra : undefined,
    },
    enabled: bool(raw?.enabled),
    capabilities: Array.isArray(raw?.capabilities) ? raw.capabilities.map((c: unknown) => str(c)).filter(Boolean) : [],
    priority: numOrNull(raw?.priority) ?? undefined,
    updatedAt: raw?.updatedAt || null,
    updatedBy: raw?.updatedBy || null,
  };
}

function normalizeMcpServer(raw: any): McpServerConfig {
  return {
    id: str(raw?.id),
    name: str(raw?.name, str(raw?.id)),
    description: str(raw?.description) || undefined,
    transport: (['http', 'sse', 'stdio'].includes(raw?.transport) ? raw.transport : 'http'),
    url: str(raw?.url) || undefined,
    command: str(raw?.command) || undefined,
    args: Array.isArray(raw?.args) ? raw.args.map((a: unknown) => str(a)).filter(Boolean) : [],
    credentialRef: str(raw?.credentialRef) || undefined,
    authHeader: str(raw?.authHeader) || undefined,
    enabled: bool(raw?.enabled),
    allowedTools: Array.isArray(raw?.allowedTools) ? raw.allowedTools.map((t: unknown) => str(t)).filter(Boolean) : [],
    capabilities: Array.isArray(raw?.capabilities) ? raw.capabilities.map((c: unknown) => str(c)).filter(Boolean) : [],
    updatedAt: raw?.updatedAt || null,
    updatedBy: raw?.updatedBy || null,
  };
}

function normalizeCapabilities(raw: any): AiCapability[] {
  if (!Array.isArray(raw) || !raw.length) return FALLBACK_CAPABILITIES;
  const out = raw
    .map((c: any, i: number) => ({
      id: str(c?.id),
      label: str(c?.label, str(c?.id)),
      description: str(c?.description) || undefined,
      /* T178: absent means OFF. A module must be switched on explicitly —
         defaulting to true would start spending provider quota the moment
         the vocabulary was seeded. */
      aiEnabled: c?.aiEnabled === true,
      order: numOrNull(c?.order) ?? i,
    }))
    .filter((c) => c.id)
    .sort((a2, b2) => a2.order - b2.order);
  return out.length ? out : FALLBACK_CAPABILITIES;
}

function normalizeDocument(rawConfigJson: any): AiDocument {
  const ai = rawConfigJson?.ai;
  if (!ai || typeof ai !== 'object') return emptyAiDocument();

  return {
    version: numOrNull(ai.version) ?? AI_DOC_VERSION,
    /* Sorted by `order` on read, so every consumer — the settings list,
       the routing bridge, the gateway — sees one agreed sequence rather
       than each re-deriving it. */
    providers: (Array.isArray(ai.providers) ? ai.providers : [])
      .map((p: any, i: number) => normalizeProvider(p, i))
      .filter((p: AiProvider) => p.id)
      .sort((x: AiProvider, y: AiProvider) => x.order - y.order),
    models: (Array.isArray(ai.models) ? ai.models : [])
      .map((m: any, i: number) => normalizeModel(m, i))
      .filter((m: AiModel) => m.providerId && m.name)
      .sort((x: AiModel, y: AiModel) => x.order - y.order),
    configurations: (Array.isArray(ai.configurations) ? ai.configurations : []).map(normalizeConfiguration).filter((c: AiConfiguration) => c.id),
    mcpServers: (Array.isArray(ai.mcpServers) ? ai.mcpServers : []).map(normalizeMcpServer).filter((s: McpServerConfig) => s.id),
    capabilities: normalizeCapabilities(ai.capabilities),
    missing: false,
  };
}

/**
 * Strip anything that must never be persisted, then serialise.
 *
 * `missing` is a runtime flag, not data. And the secret-bearing key names
 * are deleted rather than trusted absent — the database trigger rejects
 * the whole write if one slips through, so an admin would see a raw
 * Postgres error instead of a saved page.
 */
const SECRET_KEYS = [
  'apiKey', 'api_key', 'secret', 'secretKey', 'secret_key',
  'token', 'accessToken', 'access_token', 'password', 'bearer', 'authorization',
];

function stripSecrets<T extends object>(rec: T): T {
  const copy: any = { ...rec };
  SECRET_KEYS.forEach((k) => { delete copy[k]; });
  Object.keys(copy).forEach((k) => {
    if (SECRET_KEYS.some((s) => s.toLowerCase() === k.toLowerCase())) delete copy[k];
  });
  return copy;
}

function serialize(doc: AiDocument): any {
  return {
    ai: {
      version: doc.version || AI_DOC_VERSION,
      providers: (doc.providers || []).map(stripSecrets),
      models: (doc.models || []).map(stripSecrets),
      configurations: (doc.configurations || []).map(stripSecrets),
      mcpServers: (doc.mcpServers || []).map(stripSecrets),
      capabilities: doc.capabilities || FALLBACK_CAPABILITIES,
    },
  };
}

/* ══════════════════════════════════════════════════════════════════
   Read
   ══════════════════════════════════════════════════════════════════ */

async function fetchRow(): Promise<{ config_id: number; config_json: any } | null> {
  const { data, error } = await supabase
    .from('platform_config')
    .select('config_id, config_json')
    .eq('entity_id', getEntityId())
    .eq('dobj_id', AI_CONFIG_DOBJ_ID)
    .eq('config_type', AI_CONFIG_TYPE)
    .maybeSingle();

  if (error) {
    console.warn('[PlatformAI] platform_config read failed:', error.message);
    return null;
  }
  return (data as any) || null;
}

let docPromise: Promise<AiDocument> | null = null;

/** Drop the cache. Called by every mutation below. */
export function invalidateAiConfigCache(): void {
  docPromise = null;
  notifyChanged();
}

export async function loadAiDocument(): Promise<AiDocument> {
  if (docPromise) return docPromise;
  docPromise = loadAiDocumentUncached();
  /* A failed or absent read must not be cached as the answer forever. */
  docPromise
    .then((doc) => { if (doc.missing) docPromise = null; })
    .catch(() => { docPromise = null; });
  return docPromise;
}

async function loadAiDocumentUncached(): Promise<AiDocument> {
  try {
    const row = await fetchRow();
    if (!row) {
      console.warn(
        `[PlatformAI] No PlatformAIConfig row for entity ${getEntityId()}. ` +
        'Run database/021_platform_ai_config.sql.'
      );
      return emptyAiDocument();
    }
    return normalizeDocument(row.config_json);
  } catch (e) {
    console.error('[PlatformAI] loadAiDocument failed:', e);
    return emptyAiDocument();
  }
}

/* ── Change notification ─────────────────────────────────────────
   Consumers holding a synchronous snapshot (the Ziva router bridge)
   need to know when the document changed. A save in the settings page
   must not leave a module calling the old provider. */
type ChangeListener = () => void;
const listeners = new Set<ChangeListener>();

export function onAiConfigChanged(fn: ChangeListener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function notifyChanged(): void {
  listeners.forEach((fn) => { try { fn(); } catch { /* a bad listener must not block the rest */ } });
}

/* ══════════════════════════════════════════════════════════════════
   Write
   ══════════════════════════════════════════════════════════════════ */

export interface SaveResult {
  ok: boolean;
  /** Validation errors, when the save was refused before touching the DB. */
  errors?: string[];
  message?: string;
}

/**
 * Persist the whole document, validated first.
 *
 * Validation runs BEFORE the write, not after — a document that fails
 * referential integrity must never reach the table, because the next
 * reader would then have to cope with it.
 */
export async function saveAiDocument(doc: AiDocument): Promise<SaveResult> {
  const result = validateAiDocument(doc);
  if (!result.ok) {
    return { ok: false, errors: result.errors.map((e) => e.message), message: 'Configuration was not saved.' };
  }

  try {
    const row = await fetchRow();
    const payload = serialize(doc);

    if (!row) {
      const { error } = await supabase.from('platform_config').insert({
        entity_id: getEntityId(),
        dobj_id: AI_CONFIG_DOBJ_ID,
        config_name: AI_CONFIG_NAME,
        config_type: AI_CONFIG_TYPE,
        config_description: 'Platform AI provider, model, configuration and MCP connector registry',
        is_default: true,
        is_active: true,
        config_json: payload,
      });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from('platform_config')
        .update({ config_json: payload, lastmodified_ts: new Date().toISOString() })
        .eq('config_id', row.config_id);
      if (error) throw new Error(error.message);
    }

    invalidateAiConfigCache();
    return { ok: true };
  } catch (e: any) {
    const message = String(e?.message || e || 'unknown error');
    console.error('[PlatformAI] saveAiDocument failed:', message);
    return { ok: false, message };
  }
}

/* ── Record-level helpers ────────────────────────────────────────
   Each loads, mutates and saves, so the caller cannot forget to
   invalidate the cache or skip validation. */

async function mutate(fn: (doc: AiDocument) => void): Promise<SaveResult> {
  const loaded = await loadAiDocument();

  /* Bootstrap rather than refuse.
     saveAiDocument() already inserts when no row exists, so the page can
     create its own document and is usable before 021 has been run. This
     used to hard-refuse, which meant an admin could not move an existing
     configuration in until someone had run SQL by hand.

     021 is still worth running: it installs the plaintext-credential
     TRIGGER, which is a database-level guarantee this client cannot
     provide, plus the config_type COMMENT. And 022 is REQUIRED before any
     credential can be stored, because that is where the Vault RPCs live. */
  const base: AiDocument = loaded.missing
    ? { ...emptyAiDocument(), missing: false }
    : loaded;

  /* Deep clone so a failed save leaves the cached document untouched.
     Without it, a rejected edit would still be visible in the UI until
     the next reload — the worst kind of "did that save?" ambiguity. */
  const next: AiDocument = JSON.parse(JSON.stringify(base));
  fn(next);
  return saveAiDocument(next);
}

export function upsertProvider(provider: AiProvider): Promise<SaveResult> {
  return mutate((doc) => {
    const idx = doc.providers.findIndex((p) => p.id === provider.id);
    const record = normalizeProvider({ ...provider, updatedAt: new Date().toISOString() });
    if (idx >= 0) doc.providers[idx] = record; else doc.providers.push(record);
  });
}

/**
 * Add or replace a model.
 *
 * BRIS-AI-T198 — `previousId` is what makes an EDIT an edit.
 *
 * A model's id is derived from providerId + wire name (T173), so
 * changing the wire name changes the id. Without knowing the old id this
 * function found no match and pushed a second record, leaving the
 * original behind — editing a model silently duplicated it. That was a
 * real defect introduced by deriving the key, and this is the fix.
 *
 * Anything referencing the old id is repointed in the same write, so a
 * rename cannot orphan a module link.
 */
export function upsertModel(model: AiModel, previousId?: string): Promise<SaveResult> {
  return mutate((doc) => {
    const record = normalizeModel({ ...model, updatedAt: new Date().toISOString() });
    const oldId = String(previousId || '').trim();

    if (oldId && oldId !== record.id) {
      doc.models = doc.models.filter((m) => m.id !== oldId);
      doc.configurations.forEach((c) => { if (c.modelId === oldId) c.modelId = record.id; });
    }

    const idx = doc.models.findIndex((m) => m.id === record.id);
    if (idx >= 0) doc.models[idx] = record; else doc.models.push(record);

    syncConfigurationsFromTags(doc);
  });
}

export function upsertConfiguration(config: AiConfiguration): Promise<SaveResult> {
  return mutate((doc) => {
    const idx = doc.configurations.findIndex((c) => c.id === config.id);
    const record = normalizeConfiguration({ ...config, updatedAt: new Date().toISOString() });
    if (idx >= 0) doc.configurations[idx] = record; else doc.configurations.push(record);
  });
}

export function upsertMcpServer(server: McpServerConfig): Promise<SaveResult> {
  return mutate((doc) => {
    const idx = doc.mcpServers.findIndex((s) => s.id === server.id);
    const record = normalizeMcpServer({ ...server, updatedAt: new Date().toISOString() });
    if (idx >= 0) doc.mcpServers[idx] = record; else doc.mcpServers.push(record);
  });
}

export function deleteProvider(providerId: string): Promise<SaveResult> {
  return mutate((doc) => { doc.providers = doc.providers.filter((p) => p.id !== providerId); });
}

export function deleteModel(modelId: string): Promise<SaveResult> {
  return mutate((doc) => {
    doc.models = doc.models.filter((m) => m.id !== modelId);
    syncConfigurationsFromTags(doc);
  });
}

/* ══════════════════════════════════════════════════════════════════
   BRIS-AI-T199 — configurations are DERIVED from a model's module tags.

   The Modules tab used to carry provider and model selectors, which
   meant the same relationship could be expressed in two places and the
   two could disagree. There is now ONE author: the "Briselle Platform
   Modules" tags on a model. Everything the Modules tab shows is a
   read-only reflection of them.

   One configuration per (module, model) pair, so several models may
   serve one module and the gateway picks by priority — provider Routing
   Order, then model Priority Order. That is why the id includes both.

   Manually created configurations are left alone: only ones this
   function owns (marked `derived`) are rebuilt, so nothing an operator
   built by hand is discarded.
   ══════════════════════════════════════════════════════════════════ */
function syncConfigurationsFromTags(doc: AiDocument): void {
  const kept = doc.configurations.filter((c) => (c as any).derived !== true);
  const derived: AiConfiguration[] = [];

  doc.models.forEach((model) => {
    const provider = doc.providers.find((p) => p.id === model.providerId);
    if (!provider) return;

    (model.moduleTags || []).forEach((capId) => {
      const cap = doc.capabilities.find((c) => c.id === capId);
      if (!cap) return;

      const id = `${capId}__${model.id}`;
      const existing = doc.configurations.find((c) => c.id === id);

      derived.push({
        id,
        name: `${cap.label} · ${model.displayName || model.name}`,
        description: `Derived from the module tags on "${model.displayName || model.name}".`,
        providerId: provider.id,
        modelId: model.id,
        /* An operator's parameter edits survive a resync. */
        parameters: existing?.parameters
          ?? { maxTokens: model.maxTokensPerRequest ?? undefined },
        enabled: true,
        capabilities: [capId],
        /* Lower wins. Provider order dominates, model order breaks ties. */
        priority: provider.order * 1000 + model.order,
        updatedAt: new Date().toISOString(),
        ...({ derived: true } as any),
      });
    });
  });

  doc.configurations = [...kept, ...derived];
}

/** Rebuild derived configurations. Exposed for a one-off repair. */
export function resyncConfigurations(): Promise<SaveResult> {
  return mutate((doc) => { syncConfigurationsFromTags(doc); });
}

/* ══════════════════════════════════════════════════════════════════
   BRIS-AI-T197 — cache a provider's model catalogue.
   ══════════════════════════════════════════════════════════════════ */
export function saveModelCatalogue(providerId: string, models: string[]): Promise<SaveResult> {
  return mutate((doc) => {
    const p = doc.providers.find((x) => x.id === providerId);
    if (p) p.modelCatalogue = { models: [...models], fetchedAt: new Date().toISOString() };
  });
}

export function deleteConfiguration(configurationId: string): Promise<SaveResult> {
  return mutate((doc) => { doc.configurations = doc.configurations.filter((c) => c.id !== configurationId); });
}

export function deleteMcpServer(serverId: string): Promise<SaveResult> {
  return mutate((doc) => { doc.mcpServers = doc.mcpServers.filter((s) => s.id !== serverId); });
}

/* Enable / disable are separate from upsert so a toggle cannot
   accidentally write a half-edited form back over the stored record. */
export function setProviderEnabled(providerId: string, enabled: boolean): Promise<SaveResult> {
  return mutate((doc) => {
    const p = doc.providers.find((x) => x.id === providerId);
    if (p) { p.enabled = enabled; p.updatedAt = new Date().toISOString(); }
  });
}

export function setModelEnabled(modelId: string, enabled: boolean): Promise<SaveResult> {
  return mutate((doc) => {
    const m = doc.models.find((x) => x.id === modelId);
    if (m) { m.enabled = enabled; m.updatedAt = new Date().toISOString(); }
  });
}

export function setConfigurationEnabled(configurationId: string, enabled: boolean): Promise<SaveResult> {
  return mutate((doc) => {
    const c = doc.configurations.find((x) => x.id === configurationId);
    if (c) { c.enabled = enabled; c.updatedAt = new Date().toISOString(); }
  });
}

export function setMcpServerEnabled(serverId: string, enabled: boolean): Promise<SaveResult> {
  return mutate((doc) => {
    const s = doc.mcpServers.find((x) => x.id === serverId);
    if (s) { s.enabled = enabled; s.updatedAt = new Date().toISOString(); }
  });
}

/** Duplicate a configuration under a new id. */
export function cloneConfiguration(configurationId: string, newId: string, newName: string): Promise<SaveResult> {
  return mutate((doc) => {
    const src = doc.configurations.find((c) => c.id === configurationId);
    if (!src) return;
    doc.configurations.push(normalizeConfiguration({
      ...JSON.parse(JSON.stringify(src)),
      id: newId,
      name: newName,
      updatedAt: new Date().toISOString(),
    }));
  });
}

/* ══════════════════════════════════════════════════════════════════
   Credentials — Vault only
   ══════════════════════════════════════════════════════════════════ */

/**
 * Store or rotate a provider credential.
 *
 * The secret goes straight to Vault via RPC and is never held in state,
 * never written to the config document, and never logged. The caller
 * should clear its input field immediately afterwards.
 */
export async function storeCredential(providerId: string, secret: string): Promise<SaveResult> {
  const ref = credentialRefFor(getEntityId(), providerId);
  const value = String(secret || '').trim();
  if (!value) return { ok: false, message: 'A credential value is required.' };

  try {
    const { error } = await supabase.rpc('ai_credential_set', { p_ref: ref, p_secret: value });
    if (error) throw new Error(error.message);
  } catch (e: any) {
    /* Deliberately does not include the secret, nor its length, in the
       message or the log line. */
    const message = String(e?.message || e || 'unknown error');
    console.error('[PlatformAI] storeCredential failed for provider', providerId, ':', message);

    /* The overwhelmingly likely cause on a fresh install is that the Vault
       RPCs do not exist yet. Postgres reports that as a "function not
       found" / schema-cache miss, which tells an admin nothing — name the
       migration instead. */
    if (/could not find the function|function .* does not exist|schema cache|pgrst202/i.test(message)) {
      return {
        ok: false,
        message: 'Credential storage is not installed. Run database/022_ai_credentials_vault.sql '
          + 'in the Supabase SQL editor, then save the key again.',
      };
    }
    return { ok: false, message: `Could not store the credential: ${message}` };
  }

  /* Record the pointer on the provider so it becomes callable. */
  const attach = await mutate((doc) => {
    const p = doc.providers.find((x) => x.id === providerId);
    if (p) { p.credentialRef = ref; p.updatedAt = new Date().toISOString(); }
  });
  if (!attach.ok) return attach;

  return { ok: true };
}

export async function deleteCredential(providerId: string): Promise<SaveResult> {
  const ref = credentialRefFor(getEntityId(), providerId);
  try {
    const { error } = await supabase.rpc('ai_credential_delete', { p_ref: ref });
    if (error) throw new Error(error.message);
  } catch (e: any) {
    const message = String(e?.message || e || 'unknown error');
    console.error('[PlatformAI] deleteCredential failed:', message);
    return { ok: false, message };
  }
  return mutate((doc) => {
    const p = doc.providers.find((x) => x.id === providerId);
    if (p) { p.credentialRef = ''; p.updatedAt = new Date().toISOString(); }
  });
}

/**
 * Is a credential stored? A boolean, never the value.
 *
 * Note this asks Vault rather than trusting credentialRef, because the
 * pointer can outlive the secret — a Vault entry deleted out of band
 * would otherwise still read as "Configured".
 */
export async function credentialExists(providerId: string): Promise<boolean> {
  const ref = credentialRefFor(getEntityId(), providerId);
  try {
    const { data, error } = await supabase.rpc('ai_credential_exists', { p_ref: ref });
    if (error) throw new Error(error.message);
    return data === true;
  } catch (e: any) {
    console.warn('[PlatformAI] credentialExists check failed:', String(e?.message || e));
    return false;
  }
}

/* ══════════════════════════════════════════════════════════════════
   BRIS-AI-T171 / T176 / T179 — drag reorder persistence.

   Each takes (fromIndex, toIndex) against the SORTED list the UI is
   showing, moves the item, then rewrites every `order` to its new array
   position. Rewriting all of them — rather than only the moved one —
   is what keeps the values dense and collision-free; incrementing a
   single record is how two rows end up sharing an order and the list
   starts flickering between reads.
   ══════════════════════════════════════════════════════════════════ */

/** Move an item and renumber. Pure, so it is testable without a DB. */
function moveAndRenumber<T extends { order: number }>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  if (from === to || from < 0 || to < 0 || from >= next.length || to >= next.length) {
    return next.map((it, i) => ({ ...it, order: i }));
  }
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next.map((it, i) => ({ ...it, order: i }));
}

export function reorderProviders(fromIndex: number, toIndex: number): Promise<SaveResult> {
  return mutate((doc) => {
    doc.providers = moveAndRenumber(
      [...doc.providers].sort((a, b) => a.order - b.order),
      fromIndex,
      toIndex
    );
  });
}

/**
 * Reorder models WITHIN one provider.
 *
 * Scoped to the provider because that is the list the sub-page renders.
 * Renumbering globally would silently reshuffle another provider's
 * models, which the admin cannot even see from where they are standing.
 */
export function reorderModels(providerId: string, fromIndex: number, toIndex: number): Promise<SaveResult> {
  return mutate((doc) => {
    const mine = doc.models.filter((m) => m.providerId === providerId).sort((a, b) => a.order - b.order);
    const others = doc.models.filter((m) => m.providerId !== providerId);
    doc.models = [...others, ...moveAndRenumber(mine, fromIndex, toIndex)];
  });
}

export function reorderCapabilities(fromIndex: number, toIndex: number): Promise<SaveResult> {
  return mutate((doc) => {
    doc.capabilities = moveAndRenumber(
      [...doc.capabilities].sort((a, b) => a.order - b.order),
      fromIndex,
      toIndex
    );
  });
}

/* ══════════════════════════════════════════════════════════════════
   BRIS-AI-T178 / T179 — Briselle Platform Modules.

   A "Platform Module" is one of the AI functions in ai.capabilities.
   See the KEYWORD_MAP note on AiCapability: the owner's term for what
   the code has always called a capability.
   ══════════════════════════════════════════════════════════════════ */

/** The master switch. Off means the module fails closed everywhere. */
export function setModuleAiEnabled(capabilityId: string, aiEnabled: boolean): Promise<SaveResult> {
  return mutate((doc) => {
    const cap = doc.capabilities.find((c) => c.id === capabilityId);
    if (cap) cap.aiEnabled = aiEnabled;
  });
}

/**
 * Link a Platform Module to a provider + model.
 *
 * Written as an AI configuration whose id IS the capability id, because
 * that is what the gateway and executeAI() already resolve against —
 * so linking a module needs no change anywhere downstream.
 *
 * Passing an empty modelId unlinks the module.
 */
/* BRIS-AI-T199: linkModule() has been REMOVED.

   It let the Modules tab write a module -> provider/model binding
   directly, while a model's own moduleTags expressed the same thing.
   Two authors for one relationship is how they drift apart, and the
   Modules tab is now a read-only view. The single author is
   syncConfigurationsFromTags() above, driven by the tags on a model. */


/* ══════════════════════════════════════════════════════════════════
   BRIS-AI-T188 — persisted verification.

   Written by the Verify actions so a list can show the last result
   after a reload. Only the outcome is stored; the credential is never
   part of it.
   ══════════════════════════════════════════════════════════════════ */

export function recordProviderVerify(
  providerId: string,
  ok: boolean,
  message: string
): Promise<SaveResult> {
  return mutate((doc) => {
    const p = doc.providers.find((x) => x.id === providerId);
    if (p) p.lastVerify = { ok, at: new Date().toISOString(), message: message.slice(0, 300) };
  });
}

export function recordModelVerify(
  modelId: string,
  ok: boolean,
  message: string
): Promise<SaveResult> {
  return mutate((doc) => {
    const m = doc.models.find((x) => x.id === modelId);
    if (m) m.lastVerify = { ok, at: new Date().toISOString(), message: message.slice(0, 300) };
  });
}

/**
 * One write for a provider AND every model under it.
 *
 * Deliberately a single mutation rather than a loop of individual saves:
 * verifying a provider with six models would otherwise fire seven
 * sequential document writes, each re-reading and re-validating the
 * whole thing.
 */
export function recordProviderAndModelVerify(
  providerId: string,
  providerResult: { ok: boolean; message: string },
  modelResults: Array<{ modelId: string; ok: boolean; message: string }>
): Promise<SaveResult> {
  const at = new Date().toISOString();
  return mutate((doc) => {
    const p = doc.providers.find((x) => x.id === providerId);
    if (p) {
      p.lastVerify = { ok: providerResult.ok, at, message: providerResult.message.slice(0, 300) };
    }
    modelResults.forEach((r) => {
      const m = doc.models.find((x) => x.id === r.modelId);
      if (m) m.lastVerify = { ok: r.ok, at, message: r.message.slice(0, 300) };
    });
  });
}

/* ══════════════════════════════════════════════════════════════════
   BRIS-AI-T189 — the flat resolution table.

   "Our API query will search for Active API's and active models and
   supported Modules in flat table as a query, and sort it based on the
   sort order."

   That is exactly this: one denormalised row per (module, provider,
   model) that can actually serve a call, ordered by provider Routing
   Order then model Priority Order. Every condition is applied in ONE
   place so the settings page, the routing bridge and the gateway cannot
   disagree about what is live.
   ══════════════════════════════════════════════════════════════════ */

export interface ResolvedRoute {
  moduleId: string;
  moduleLabel: string;
  providerId: string;
  providerName: string;
  providerOrder: number;
  /** The wire id sent to the provider. */
  modelName: string;
  modelId: string;
  modelDisplayName: string;
  modelOrder: number;
  maxTokensPerRequest: number | null;
  configurationId: string;
}

export function resolveActiveRoutes(doc: AiDocument): ResolvedRoute[] {
  const rows: ResolvedRoute[] = [];

  (doc.capabilities || []).forEach((cap) => {
    /* The master switch first — a module that is off contributes nothing,
       however well configured the rest of the chain is. */
    if (!cap.aiEnabled) return;

    (doc.configurations || []).forEach((config) => {
      if (config.enabled === false) return;
      if (!(config.capabilities || []).includes(cap.id)) return;

      const provider = (doc.providers || []).find((p) => p.id === config.providerId);
      if (!provider || provider.enabled === false) return;
      if (!String(provider.credentialRef || '').trim()) return;

      const model = (doc.models || []).find((m) => m.id === config.modelId);
      if (!model || model.enabled === false) return;
      /* A cross-provider pair only fails at call time, so it is excluded
         here rather than allowed to look routable. */
      if (model.providerId !== provider.id) return;

      rows.push({
        moduleId: cap.id,
        moduleLabel: cap.label,
        providerId: provider.id,
        providerName: provider.name,
        providerOrder: provider.order,
        modelName: model.name,
        modelId: model.id,
        modelDisplayName: model.displayName || model.name,
        modelOrder: model.order,
        maxTokensPerRequest: model.maxTokensPerRequest ?? null,
        configurationId: config.id,
      });
    });
  });

  return rows.sort((a, b) =>
    a.moduleId.localeCompare(b.moduleId)
    || a.providerOrder - b.providerOrder
    || a.modelOrder - b.modelOrder
  );
}

/* ══════════════════════════════════════════════════════════════════
   BRIS-AI-T192 — Platform Module CRUD.

   Modules were previously read-only, seeded by 021. They are now
   administered from the Modules tab: an entity can add its own AI
   function alongside the shipped vocabulary.

   `id` is the MODULE API ID — the literal string backend code passes to
   executeAI({ configurationId }). Renaming one would silently break
   every caller, so it is immutable after creation.
   ══════════════════════════════════════════════════════════════════ */

export function upsertCapability(capability: AiCapability): Promise<SaveResult> {
  return mutate((doc) => {
    const idx = doc.capabilities.findIndex((c) => c.id === capability.id);
    const record: AiCapability = {
      id: str(capability.id),
      label: str(capability.label, str(capability.id)),
      description: str(capability.description) || undefined,
      aiEnabled: capability.aiEnabled === true,
      order: numOrNull(capability.order) ?? doc.capabilities.length,
    };
    if (idx >= 0) doc.capabilities[idx] = record; else doc.capabilities.push(record);
  });
}

/**
 * Delete a module.
 *
 * The configuration that resolves it goes too, otherwise an orphan
 * would keep answering for a module that no longer exists.
 */
export function deleteCapability(capabilityId: string): Promise<SaveResult> {
  return mutate((doc) => {
    doc.capabilities = doc.capabilities.filter((c) => c.id !== capabilityId);
    doc.configurations = doc.configurations.filter((c) => c.id !== capabilityId);
    /* Also drop it from every model's tag list, so the picker cannot
       offer a module that is gone. */
    doc.models.forEach((m) => {
      if (Array.isArray(m.moduleTags)) m.moduleTags = m.moduleTags.filter((t) => t !== capabilityId);
    });
  });
}

/* ══════════════════════════════════════════════════════════════════
   BRIS-AI-T191 — "last used", read from the gateway log.

   Derived rather than stored: see database/024_ai_last_used.sql for why
   a lastUsedAt field on each record would be the wrong design.
   ══════════════════════════════════════════════════════════════════ */

export interface LastUsedEntry {
  lastUsedAt: string;
  callCount: number;
}

export interface LastUsedMap {
  modules: Record<string, LastUsedEntry>;
  providers: Record<string, LastUsedEntry>;
  models: Record<string, LastUsedEntry>;
}

export function emptyLastUsed(): LastUsedMap {
  return { modules: {}, providers: {}, models: {} };
}

/**
 * Never throws, and never blocks a page.
 *
 * If migration 024 has not been run the RPC does not exist; that returns
 * an empty map so every column reads "—" rather than the page failing
 * over a telemetry nicety.
 */
export async function fetchLastUsed(): Promise<LastUsedMap> {
  const out = emptyLastUsed();
  try {
    const { data, error } = await supabase.rpc('ai_last_used', { p_entity_id: getEntityId() });
    if (error) {
      if (!/could not find the function|does not exist|schema cache|pgrst202/i.test(error.message || '')) {
        console.warn('[PlatformAI] ai_last_used failed:', error.message);
      }
      return out;
    }
    (Array.isArray(data) ? data : []).forEach((row: any) => {
      const ref = str(row?.ref);
      if (!ref) return;
      const entry: LastUsedEntry = {
        lastUsedAt: str(row?.last_used_at),
        callCount: numOrNull(row?.call_count) ?? 0,
      };
      if (row?.kind === 'module') out.modules[ref] = entry;
      else if (row?.kind === 'provider') out.providers[ref] = entry;
      else if (row?.kind === 'model') out.models[ref] = entry;
    });
  } catch (e: any) {
    console.warn('[PlatformAI] fetchLastUsed failed:', String(e?.message || e));
  }
  return out;
}
