/* ============================================================
   Briselle Enterprise Platform — Settings / AI Providers Config
   verifyCascade.ts — one verification pass for a provider and its models
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-AI-T193

   ── Why one function, always the whole cascade ─────────────────
   Verification used to be manual and per-record: verify the provider,
   then each model, then return to the provider to see the count update.
   Three screens, several clicks, and a status that was stale the moment
   anything changed.

   It is also unnecessary. A provider's GET /models returns its ENTIRE
   catalogue in one round trip, so checking one model and checking twenty
   cost exactly the same call. There is therefore no reason to offer a
   narrower operation — verifying a single model in isolation would be
   the same network cost with a worse result.

   So every trigger runs this: provider save, provider verify, model
   save, model verify. Provider and model status always move together
   and cannot disagree.
   ============================================================ */
import { listProviderModels, testProviderConnection } from '../../../services/aiGatewayClient';
import { recordProviderAndModelVerify } from '../../../services/platformAiConfigService';
import type { AiDocument } from '../../../services/platformAiConfigTypes';

export interface CascadeModelResult {
  modelId: string;
  modelName: string;
  ok: boolean;
  message: string;
}

export interface CascadeResult {
  providerOk: boolean;
  /** Safe to display; already free of credentials. */
  providerMessage: string;
  models: CascadeModelResult[];
  verifiedCount: number;
  totalModels: number;
  /** One line covering both, for a status strip. */
  summary: string;
}

/**
 * Verify a provider and every model registered under it.
 *
 * Never throws. Does not persist — call persistCascade() for that, so a
 * caller can show a result without writing one (the pre-save case).
 */
export async function runProviderCascade(
  doc: AiDocument,
  providerId: string
): Promise<CascadeResult> {
  const provider = doc.providers.find((p) => p.id === providerId);
  const mine = doc.models.filter((m) => m.providerId === providerId);

  if (!provider) {
    return {
      providerOk: false,
      providerMessage: `No provider with id "${providerId}".`,
      models: [],
      verifiedCount: 0,
      totalModels: 0,
      summary: `No provider with id "${providerId}".`,
    };
  }

  const providerResult = await testProviderConnection(provider.id);

  /* Provider failed: nothing beneath it can be claimed verified. */
  if (!providerResult.ok) {
    const models = mine.map((m) => ({
      modelId: m.id,
      modelName: m.name,
      ok: false,
      message: 'Provider verification failed, so this model could not be checked.',
    }));
    return {
      providerOk: false,
      providerMessage: providerResult.message,
      models,
      verifiedCount: 0,
      totalModels: mine.length,
      summary: providerResult.message,
    };
  }

  /* Prefer the catalogue the connection test already returned; ask again
     only if it did not carry one. */
  let catalogue = providerResult.models;
  if (!catalogue) {
    const listed = await listProviderModels(provider.id);
    catalogue = listed.models;
  }

  const catalogueUnavailable = !catalogue || catalogue.length === 0;

  const models: CascadeModelResult[] = mine.map((m) => {
    if (catalogueUnavailable) {
      /* Not a failure. Some gateways do not implement /models, and
         calling a registered model unverified on that basis would report
         our own blind spot as the administrator's mistake. */
      return {
        modelId: m.id,
        modelName: m.name,
        ok: true,
        message: 'Provider verified. It does not publish a model list, so the id could not be confirmed.',
      };
    }
    const present = (catalogue as string[]).includes(m.name);
    return {
      modelId: m.id,
      modelName: m.name,
      ok: present,
      message: present
        ? `Offered by ${provider.name}.`
        : `"${m.name}" is not in this provider's catalogue — it may have been retired or renamed.`,
    };
  });

  const verifiedCount = models.filter((m) => m.ok).length;

  /* A brand-new provider with no models is a healthy state, not a
     partial failure, and is worded as such. */
  const summary = mine.length === 0
    ? `${providerResult.message} No models registered yet — add one to start using this provider.`
    : `${providerResult.message} ${verifiedCount}/${mine.length} model(s) confirmed.`;

  return {
    providerOk: true,
    providerMessage: providerResult.message,
    models,
    verifiedCount,
    totalModels: mine.length,
    summary,
  };
}

/** Persist a cascade result. One document write for provider + models. */
export function persistCascade(providerId: string, result: CascadeResult) {
  return recordProviderAndModelVerify(
    providerId,
    { ok: result.providerOk, message: result.providerMessage },
    result.models.map((m) => ({ modelId: m.modelId, ok: m.ok, message: m.message }))
  );
}
